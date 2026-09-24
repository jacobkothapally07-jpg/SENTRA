import time
import math
from collections import deque
from typing import Dict, List, Optional, Tuple
import numpy as np
from sklearn.ensemble import IsolationForest

from models import (
    NormalizedEvent,
    RawEventInput,
    EventLevel,
    EventType,
    DetectionRule,
    RuleCondition,
    AnomalyDetectionResult,
    IncidentSeverity,
)


class EventNormalizer:
    """Normalizes arbitrary heterogeneous log/metric payloads into standardized NormalizedEvent."""

    @staticmethod
    def normalize(raw: RawEventInput) -> NormalizedEvent:
        # Determine service name
        service = raw.service_name or raw.service or "unknown-service"
        
        # Determine source
        source = raw.source_id or f"{service}-node-01"

        # Determine level
        level_str = (raw.level or raw.severity or "INFO").upper()
        level_map = {
            "DEBUG": EventLevel.DEBUG,
            "INFO": EventLevel.INFO,
            "WARN": EventLevel.WARN,
            "WARNING": EventLevel.WARN,
            "ERR": EventLevel.ERROR,
            "ERROR": EventLevel.ERROR,
            "CRIT": EventLevel.CRITICAL,
            "CRITICAL": EventLevel.CRITICAL,
            "FATAL": EventLevel.CRITICAL,
        }
        level = level_map.get(level_str, EventLevel.INFO)

        # Determine type
        type_str = (raw.event_type or raw.type or "log").lower()
        if "metric" in type_str or raw.metric_name or raw.metric:
            event_type = EventType.METRIC
        elif "alert" in type_str:
            event_type = EventType.ALERT
        elif "trace" in type_str:
            event_type = EventType.TRACE
        else:
            event_type = EventType.LOG

        # Extract metric
        metric_name = raw.metric_name or raw.metric
        metric_value = None
        if raw.metric_value is not None or raw.value is not None:
            val = raw.metric_value if raw.metric_value is not None else raw.value
            try:
                metric_value = float(val)
            except (ValueError, TypeError):
                metric_value = None

        # Message
        message = raw.message or raw.msg or f"Event from {service}"

        # Timestamp
        ts = time.time()
        if raw.timestamp:
            try:
                if isinstance(raw.timestamp, (int, float)):
                    # Check if milliseconds
                    ts = raw.timestamp / 1000.0 if raw.timestamp > 1e11 else float(raw.timestamp)
                elif isinstance(raw.timestamp, str):
                    ts = float(raw.timestamp)
            except Exception:
                ts = time.time()

        return NormalizedEvent(
            timestamp=ts,
            source_id=source,
            service_name=service,
            environment=raw.environment or "production",
            event_type=event_type,
            level=level,
            metric_name=metric_name,
            metric_value=metric_value,
            message=message,
            tags=raw.tags or {},
            trace_id=raw.trace_id,
        )


class StatisticalAnomalyDetector:
    """
    Online statistical anomaly detector utilizing Exponentially Weighted Moving Average (EWMA)
    and dynamic rolling standard deviation (Z-Score & 3-Sigma limits).
    """

    def __init__(self, alpha: float = 0.2, z_threshold: float = 3.0, window_size: int = 60):
        self.alpha = alpha  # Smoothing factor
        self.z_threshold = z_threshold
        self.window_size = window_size
        # Map: (service, metric) -> deque of recent values
        self.history: Dict[Tuple[str, str], deque] = {}
        # Map: (service, metric) -> current EWMA
        self.ewma: Dict[Tuple[str, str], float] = {}

    def check_anomaly(self, service: str, metric: str, value: float) -> Optional[AnomalyDetectionResult]:
        key = (service, metric)
        if key not in self.history:
            self.history[key] = deque(maxlen=self.window_size)
            self.ewma[key] = value

        history_q = self.history[key]
        current_ewma = self.ewma[key]

        # Update EWMA
        self.ewma[key] = self.alpha * value + (1.0 - self.alpha) * current_ewma
        history_q.append(value)

        if len(history_q) < 8:
            # Need minimum history to establish baseline
            return None

        vals = np.array(history_q)
        mean = float(np.mean(vals))
        std = float(np.std(vals))

        if std < 1e-4:
            # Avoid division by zero on static signals
            std = 0.5

        z_score = abs(value - mean) / std

        if z_score >= self.z_threshold:
            score = round(min(z_score / 6.0, 1.0), 3)
            return AnomalyDetectionResult(
                is_anomaly=True,
                score=score,
                metric_name=metric,
                current_value=round(value, 2),
                expected_value=round(mean, 2),
                std_dev=round(std, 2),
                algorithm="EWMA + Dynamic Z-Score (3-Sigma)",
                reason=f"{metric} of {value:.1f} deviates significantly from moving baseline {mean:.1f} (Z-Score: {z_score:.2f})",
            )
        return None


class MLIsolationForestDetector:
    """
    Multi-variate ML anomaly detector leveraging scikit-learn Isolation Forest
    on combined vector [cpu_pct, latency_ms, error_rate_pct].
    """

    def __init__(self):
        self.models: Dict[str, IsolationForest] = {}
        self.service_vectors: Dict[str, deque] = {}
        self._init_baselines()

    def _init_baselines(self):
        # Generate synthetic baseline healthy training data for typical microservices
        np.random.seed(42)
        for svc in ["api-gateway", "auth-service", "payment-gateway", "postgres-db", "redis-cache", "worker-queue", "k8s-ingress"]:
            # Healthy distribution: CPU: 15-40%, Latency: 15-60ms, Error: 0-0.5%
            cpu = np.random.normal(25.0, 5.0, 200)
            lat = np.random.normal(35.0, 8.0, 200)
            err = np.random.exponential(0.1, 200)
            X_train = np.column_stack([cpu, lat, err])

            iso = IsolationForest(n_estimators=50, contamination=0.03, random_state=42)
            iso.fit(X_train)
            self.models[svc] = iso
            self.service_vectors[svc] = deque(maxlen=30)

    def evaluate_vector(self, service: str, cpu: float, latency: float, error_rate: float) -> Optional[AnomalyDetectionResult]:
        if service not in self.models:
            # Fit on the fly
            X_train = np.array([
                [25.0, 30.0, 0.0],
                [30.0, 40.0, 0.1],
                [20.0, 25.0, 0.0],
                [35.0, 50.0, 0.2],
            ])
            iso = IsolationForest(n_estimators=40, contamination=0.05, random_state=42)
            iso.fit(X_train)
            self.models[service] = iso

        vec = np.array([[cpu, latency, error_rate]])
        iso = self.models[service]
        pred = iso.predict(vec)[0]  # -1 for anomaly, 1 for normal
        decision_score = iso.decision_function(vec)[0]  # lower is more anomalous

        if pred == -1:
            anomaly_score = round(max(0.0, min(1.0, float(-decision_score * 3.0))), 3)
            return AnomalyDetectionResult(
                is_anomaly=True,
                score=anomaly_score,
                metric_name="multivariate_telemetry",
                current_value=round(latency, 2),
                expected_value=35.0,
                std_dev=8.0,
                algorithm="Isolation Forest (Multivariate)",
                reason=f"Multi-metric anomaly detected on {service} (CPU={cpu:.1f}%, Latency={latency:.1f}ms, ErrorRate={error_rate:.1f}%)",
            )
        return None


class RuleEngine:
    """Configurable rule evaluation engine for threshold, error spikes, and pattern detection."""

    def __init__(self, default_rules: Optional[List[DetectionRule]] = None):
        self.rules: Dict[str, DetectionRule] = {}
        if default_rules:
            for r in default_rules:
                self.rules[r.id] = r
        else:
            self._load_default_rules()

    def _load_default_rules(self):
        defaults = [
            DetectionRule(
                id="rule-db-conn",
                name="Database Connection Pool Exhaustion",
                description="Triggers when PostgreSQL active connections exceed 90%",
                service_name="postgres-db",
                metric_name="db_connection_utilization_pct",
                condition=RuleCondition.GT,
                threshold=85.0,
                severity=IncidentSeverity.P1_CRITICAL,
            ),
            DetectionRule(
                id="rule-err-rate-high",
                name="High HTTP 5xx Error Rate",
                description="Triggers when service error rate exceeds 10%",
                service_name="*",
                metric_name="http_error_rate_pct",
                condition=RuleCondition.GT,
                threshold=10.0,
                severity=IncidentSeverity.P1_CRITICAL,
            ),
            DetectionRule(
                id="rule-p99-latency",
                name="P99 Latency SLA Violation",
                description="Triggers when P99 latency breaches 500ms",
                service_name="*",
                metric_name="latency_p99_ms",
                condition=RuleCondition.GT,
                threshold=500.0,
                severity=IncidentSeverity.P2_HIGH,
            ),
            DetectionRule(
                id="rule-redis-memory",
                name="Redis Memory Saturation",
                description="Triggers when Redis memory usage exceeds 90%",
                service_name="redis-cache",
                metric_name="memory_usage_pct",
                condition=RuleCondition.GT,
                threshold=90.0,
                severity=IncidentSeverity.P2_HIGH,
            ),
            DetectionRule(
                id="rule-queue-backlog",
                name="Worker Queue Depth Surge",
                description="Triggers when background worker queue backlog exceeds 1000 messages",
                service_name="worker-queue",
                metric_name="queue_depth",
                condition=RuleCondition.GT,
                threshold=1000.0,
                severity=IncidentSeverity.P2_HIGH,
            ),
            DetectionRule(
                id="rule-cpu-hotspot",
                name="Severe CPU Throttling",
                description="Triggers when host/pod CPU utilization exceeds 95%",
                service_name="*",
                metric_name="cpu_usage_pct",
                condition=RuleCondition.GT,
                threshold=95.0,
                severity=IncidentSeverity.P2_HIGH,
            ),
            DetectionRule(
                id="rule-oom-pattern",
                name="Container OOMKilled / CrashLoop Detected",
                description="Triggers on container out-of-memory fatal crash log patterns",
                service_name="*",
                condition=RuleCondition.MESSAGE_CONTAINS,
                pattern="OOMKilled",
                severity=IncidentSeverity.P1_CRITICAL,
            ),
        ]
        for d in defaults:
            self.rules[d.id] = d

    def evaluate_event(self, event: NormalizedEvent) -> List[Tuple[DetectionRule, str]]:
        triggered: List[Tuple[DetectionRule, str]] = []
        for rule in self.rules.values():
            if not rule.enabled:
                continue

            # Check service match
            if rule.service_name != "*" and rule.service_name != event.service_name:
                continue

            # Check message pattern
            if rule.condition == RuleCondition.MESSAGE_CONTAINS and rule.pattern:
                if rule.pattern.lower() in event.message.lower():
                    triggered.append((rule, f"Log pattern match '{rule.pattern}' in service {event.service_name}"))
                    continue

            # Check metric conditions
            if rule.metric_name and event.metric_name == rule.metric_name and event.metric_value is not None:
                val = event.metric_value
                matched = False
                if rule.condition == RuleCondition.GT and val > rule.threshold:
                    matched = True
                elif rule.condition == RuleCondition.GTE and val >= rule.threshold:
                    matched = True
                elif rule.condition == RuleCondition.LT and val < rule.threshold:
                    matched = True
                elif rule.condition == RuleCondition.LTE and val <= rule.threshold:
                    matched = True
                elif rule.condition == RuleCondition.EQ and math.isclose(val, rule.threshold):
                    matched = True

                if matched:
                    triggered.append(
                        (
                            rule,
                            f"{rule.name}: {rule.metric_name}={val:.2f} breached threshold ({rule.threshold})",
                        )
                    )

            # Check generic critical error events
            if event.level == EventLevel.CRITICAL and rule.id == "rule-err-rate-high" and not event.metric_name:
                triggered.append((rule, f"Critical severity event recorded: {event.message}"))

        return triggered
