import asyncio
import random
import time
from typing import Callable, Coroutine, Optional, List, Dict, Any

from models import NormalizedEvent, EventLevel, EventType


class MultiSourceSimulator:
    """
    Deterministic multi-source event generator supporting:
    - 5 Deterministic Demo Scenarios
    - Live background normal telemetry
    - Real-time event noise reduction / repeat clustering
    """

    SERVICES = [
        "k8s-ingress",
        "api-gateway",
        "auth-service",
        "order-service",
        "payment-gateway",
        "worker-queue",
        "postgres-db",
        "redis-cache",
    ]

    def __init__(self, on_event_callback: Callable[[NormalizedEvent], Coroutine[Any, Any, None]]):
        self.on_event = on_event_callback
        self.is_running = False
        self.events_per_second: float = 4.0
        self.active_scenario: Optional[str] = None
        self.scenario_step: int = 0
        self._task: Optional[asyncio.Task] = None
        self.last_event_by_service: Dict[str, NormalizedEvent] = {}

    def start(self, eps: float = 4.0):
        if not self.is_running:
            self.is_running = True
            self.events_per_second = eps
            self._task = asyncio.create_task(self._run_loop())

    def stop(self):
        self.is_running = False
        self.active_scenario = None
        if self._task and not self._task.done():
            self._task.cancel()

    def set_rate(self, eps: float):
        self.events_per_second = max(0.5, min(100.0, eps))

    def trigger_scenario(self, scenario_name: str):
        self.active_scenario = scenario_name
        self.scenario_step = 0
        if not self.is_running:
            self.start(self.events_per_second)

    async def inject_custom_event(self, event: NormalizedEvent):
        await self.on_event(event)

    async def _run_loop(self):
        while self.is_running:
            try:
                if self.active_scenario:
                    await self._step_scenario()
                else:
                    await self._generate_normal_event()

                sleep_time = 1.0 / max(0.5, self.events_per_second)
                await asyncio.sleep(sleep_time)
            except asyncio.CancelledError:
                break
            except Exception as e:
                print(f"[Simulator] Loop error: {e}")
                await asyncio.sleep(1.0)

    async def _generate_normal_event(self):
        svc = random.choice(self.SERVICES)
        level = EventLevel.INFO
        roll = random.random()

        if roll < 0.90:
            level = EventLevel.INFO
        elif roll < 0.98:
            level = EventLevel.WARN
        else:
            level = EventLevel.ERROR

        metric_name = None
        metric_val = None
        message = ""

        if svc == "postgres-db":
            metric_name = "db_latency_ms"
            metric_val = random.uniform(3.0, 12.0)
            message = f"Postgres query execution latency nominal ({metric_val:.1f}ms)"
        elif svc == "payment-gateway":
            metric_name = "payment_latency_ms"
            metric_val = random.uniform(40.0, 85.0)
            message = f"Stripe/PSP authorization pipeline nominal ({metric_val:.1f}ms)"
        elif svc == "order-service":
            metric_name = "order_processing_ms"
            metric_val = random.uniform(25.0, 50.0)
            message = f"Order cart checkout pipeline nominal ({metric_val:.1f}ms)"
        elif svc == "auth-service":
            metric_name = "auth_latency_ms"
            metric_val = random.uniform(10.0, 30.0)
            message = f"JWT token verification nominal ({metric_val:.1f}ms)"
        elif svc == "api-gateway":
            metric_name = "gateway_p99_ms"
            metric_val = random.uniform(20.0, 45.0)
            message = f"Gateway edge proxy nominal ({metric_val:.1f}ms)"
        elif svc == "redis-cache":
            metric_name = "memory_usage_pct"
            metric_val = random.uniform(40.0, 65.0)
            message = f"Redis cache memory utilization {metric_val:.1f}%"
        elif svc == "k8s-ingress":
            metric_name = "cpu_usage_pct"
            metric_val = random.uniform(15.0, 35.0)
            message = f"Ingress controller CPU utilization {metric_val:.1f}%"
        elif svc == "worker-queue":
            metric_name = "queue_depth"
            metric_val = random.uniform(5.0, 45.0)
            message = f"Async worker queue depth {int(metric_val)} items"

        evt = NormalizedEvent(
            source_id=f"{svc}-pod-{random.randint(1, 3)}",
            service_name=svc,
            event_type=EventType.METRIC if metric_name else EventType.LOG,
            level=level,
            metric_name=metric_name,
            metric_value=metric_val,
            message=message,
            tags={"env": "production", "region": "us-east-1"},
            trace_id=f"trc-{random.randint(100000, 999999)}",
        )
        await self.on_event(evt)

    async def _step_scenario(self):
        step = self.scenario_step
        self.scenario_step += 1

        # ====================================================================
        # SCENARIO 1: CASCADING FAILURE (Primary Demo Scenario)
        # Database -> Payment -> Order -> API Gateway
        # ====================================================================
        if self.active_scenario in ["cascading_failure", "cascading_db_failure"]:
            if step == 0:
                # Stage 2: Database latency begins increasing
                evt = NormalizedEvent(
                    source_id="postgres-db-primary",
                    service_name="postgres-db",
                    event_type=EventType.METRIC,
                    level=EventLevel.WARN,
                    metric_name="db_latency_ms",
                    metric_value=245.0,
                    message="WARN: PostgreSQL query execution latency elevated (245ms vs baseline 8ms).",
                    tags={"stage": "db_latency_rise", "scenario": "cascading_failure"},
                )
                await self.on_event(evt)

            elif step == 1:
                # Stage 3-4: Statistical anomaly triggers & Database becomes DEGRADED / CRITICAL
                evt = NormalizedEvent(
                    source_id="postgres-db-primary",
                    service_name="postgres-db",
                    event_type=EventType.ALERT,
                    level=EventLevel.CRITICAL,
                    metric_name="db_latency_ms",
                    metric_value=1250.0,
                    message="CRITICAL: PostgreSQL query latency exceeded 1200ms (14.8x baseline). Connection pool saturated.",
                    tags={"stage": "db_critical", "root": "true", "scenario": "cascading_failure"},
                )
                await self.on_event(evt)

            elif step == 2:
                # Stage 5: Payment latency increases
                evt = NormalizedEvent(
                    source_id="payment-gateway-pod-1",
                    service_name="payment-gateway",
                    event_type=EventType.METRIC,
                    level=EventLevel.WARN,
                    metric_name="payment_latency_ms",
                    metric_value=1850.0,
                    message="WARN: Payment authorization response latency increased to 1850ms waiting for DB transaction lock.",
                    tags={"stage": "payment_latency", "scenario": "cascading_failure"},
                )
                await self.on_event(evt)

            elif step == 3:
                # Stage 6-7: Payment timeouts & error rate spikes
                evt = NormalizedEvent(
                    source_id="payment-gateway-pod-2",
                    service_name="payment-gateway",
                    event_type=EventType.METRIC,
                    level=EventLevel.CRITICAL,
                    metric_name="http_error_rate_pct",
                    metric_value=34.0,
                    message="CRITICAL: Payment gateway timeouts surging. HTTP 504 error rate increased from 1.2% to 34%.",
                    tags={"stage": "payment_errors", "scenario": "cascading_failure"},
                )
                await self.on_event(evt)

            elif step == 4:
                # Stage 8: Order failures begin
                evt = NormalizedEvent(
                    source_id="order-service-pod-1",
                    service_name="order-service",
                    event_type=EventType.METRIC,
                    level=EventLevel.CRITICAL,
                    metric_name="http_error_rate_pct",
                    metric_value=48.5,
                    message="CRITICAL: Order checkout fulfillment failures. Downstream payment dependency timeout.",
                    tags={"stage": "order_failures", "scenario": "cascading_failure"},
                )
                await self.on_event(evt)

            elif step == 5:
                # Stage 10: API Gateway Circuit breaker trips
                evt = NormalizedEvent(
                    source_id="api-gateway-node-1",
                    service_name="api-gateway",
                    event_type=EventType.METRIC,
                    level=EventLevel.CRITICAL,
                    metric_name="http_error_rate_pct",
                    metric_value=62.0,
                    message="CRITICAL: API Gateway circuit breaker tripped. Returning HTTP 503 Service Unavailable for checkout routes.",
                    tags={"stage": "gateway_tripped", "scenario": "cascading_failure"},
                )
                await self.on_event(evt)

            else:
                # Sustained cascade events with alert noise deduplication
                svc = random.choice(["postgres-db", "payment-gateway", "order-service", "api-gateway"])
                msg = f"Cascading downstream failure: connection timeout to postgres-db ({svc})"
                evt = NormalizedEvent(
                    source_id=f"{svc}-pod-{random.randint(1, 3)}",
                    service_name=svc,
                    event_type=EventType.LOG,
                    level=EventLevel.ERROR,
                    message=msg,
                    tags={"scenario": "cascading_failure"},
                )
                await self.on_event(evt)

        # ====================================================================
        # SCENARIO 2: DATABASE FAILURE (Standalone DB Crash)
        # ====================================================================
        elif self.active_scenario == "database_failure":
            if step == 0:
                evt = NormalizedEvent(
                    source_id="postgres-db-primary",
                    service_name="postgres-db",
                    event_type=EventType.METRIC,
                    level=EventLevel.CRITICAL,
                    metric_name="db_connection_utilization_pct",
                    metric_value=98.5,
                    message="CRITICAL: PostgreSQL connection pool exhausted (100/100 active connections).",
                    tags={"scenario": "database_failure", "root": "true"},
                )
                await self.on_event(evt)
            else:
                evt = NormalizedEvent(
                    source_id="postgres-db-primary",
                    service_name="postgres-db",
                    event_type=EventType.LOG,
                    level=EventLevel.ERROR,
                    message="ERROR: FATAL remaining connection slots reserved for non-replication superuser connections.",
                    tags={"scenario": "database_failure"},
                )
                await self.on_event(evt)

        # ====================================================================
        # SCENARIO 3: PAYMENT FAILURE
        # ====================================================================
        elif self.active_scenario == "payment_failure":
            if step == 0:
                evt = NormalizedEvent(
                    source_id="payment-gateway-worker-1",
                    service_name="payment-gateway",
                    event_type=EventType.METRIC,
                    level=EventLevel.CRITICAL,
                    metric_name="payment_latency_ms",
                    metric_value=6500.0,
                    message="CRITICAL: Upstream payment processor API latency spiked to 6500ms. Webhook delivery timeout.",
                    tags={"scenario": "payment_failure", "root": "true"},
                )
                await self.on_event(evt)
            else:
                evt = NormalizedEvent(
                    source_id="payment-gateway-worker-2",
                    service_name="payment-gateway",
                    event_type=EventType.METRIC,
                    level=EventLevel.ERROR,
                    metric_name="http_error_rate_pct",
                    metric_value=29.0,
                    message="ERROR: Stripe charge authorization timeout. Customer cart transactions aborted.",
                    tags={"scenario": "payment_failure"},
                )
                await self.on_event(evt)

        # ====================================================================
        # SCENARIO 4: AUTHENTICATION FAILURE
        # ====================================================================
        elif self.active_scenario == "auth_failure":
            if step == 0:
                evt = NormalizedEvent(
                    source_id="auth-service-pod-1",
                    service_name="auth-service",
                    event_type=EventType.METRIC,
                    level=EventLevel.CRITICAL,
                    metric_name="http_error_rate_pct",
                    metric_value=55.0,
                    message="CRITICAL: OAuth / JWT public key rotation signature verification failure. HTTP 401/500 burst.",
                    tags={"scenario": "auth_failure", "root": "true"},
                )
                await self.on_event(evt)
            else:
                evt = NormalizedEvent(
                    source_id="auth-service-pod-2",
                    service_name="auth-service",
                    event_type=EventType.LOG,
                    level=EventLevel.ERROR,
                    message="ERROR: Token validation keystore synchronization timed out.",
                    tags={"scenario": "auth_failure"},
                )
                await self.on_event(evt)

        # ====================================================================
        # SCENARIO 5: NETWORK LATENCY (Ingress Surge / DDoS)
        # ====================================================================
        elif self.active_scenario == "network_latency":
            if step == 0:
                evt = NormalizedEvent(
                    source_id="k8s-ingress-controller-1",
                    service_name="k8s-ingress",
                    event_type=EventType.METRIC,
                    level=EventLevel.CRITICAL,
                    metric_name="latency_p99_ms",
                    metric_value=4800.0,
                    message="CRITICAL: Edge ingress network P99 latency degraded to 4800ms under 40k RPS SYN flood.",
                    tags={"scenario": "network_latency", "root": "true"},
                )
                await self.on_event(evt)
            else:
                evt = NormalizedEvent(
                    source_id="k8s-ingress-controller-2",
                    service_name="k8s-ingress",
                    event_type=EventType.METRIC,
                    level=EventLevel.WARN,
                    metric_name="cpu_usage_pct",
                    metric_value=96.0,
                    message="WARN: Ingress CPU saturation (96%). Rate limiting TCP connection backlog.",
                    tags={"scenario": "network_latency"},
                )
                await self.on_event(evt)

        # ====================================================================
        # SCENARIO 6: FALSE-CORRELATION PREVENTION DEMO (Concurrent Independent Failures)
        # Simultaneously fires Database Failure AND Edge Ingress Network Failure
        # Proves engine creates TWO separate incidents rather than blind time-window merging!
        # ====================================================================
        elif self.active_scenario in ["false_correlation_prevention", "concurrent_independent_failures"]:
            if step == 0:
                # Incident A Trigger: Database connection exhaustion
                evt = NormalizedEvent(
                    source_id="postgres-db-primary",
                    service_name="postgres-db",
                    event_type=EventType.ALERT,
                    level=EventLevel.CRITICAL,
                    metric_name="db_latency_ms",
                    metric_value=1450.0,
                    message="CRITICAL: Database connection pool exhaustion and query latency surge (1450ms).",
                    tags={"scenario": "false_correlation_prevention", "cluster": "A"},
                )
                await self.on_event(evt)

            elif step == 1:
                # Incident B Trigger: Independent Network / Ingress SYN flood occurring at the exact same timestamp!
                evt = NormalizedEvent(
                    source_id="k8s-ingress-controller-1",
                    service_name="k8s-ingress",
                    event_type=EventType.ALERT,
                    level=EventLevel.CRITICAL,
                    metric_name="latency_p99_ms",
                    metric_value=5200.0,
                    message="CRITICAL: Edge ingress network link saturation (BGP packet drop / DDoS).",
                    tags={"scenario": "false_correlation_prevention", "cluster": "B"},
                )
                await self.on_event(evt)

            elif step == 2:
                # Incident A Cascade: Payment gateway fails due to Database
                evt = NormalizedEvent(
                    source_id="payment-gateway-pod-1",
                    service_name="payment-gateway",
                    event_type=EventType.METRIC,
                    level=EventLevel.CRITICAL,
                    metric_name="payment_latency_ms",
                    metric_value=2100.0,
                    message="CRITICAL: Payment gateway lock acquisition timeout waiting for postgres-db.",
                    tags={"scenario": "false_correlation_prevention", "cluster": "A"},
                )
                await self.on_event(evt)

            elif step == 3:
                # Incident B Followup: Edge Ingress CPU throttling
                evt = NormalizedEvent(
                    source_id="k8s-ingress-controller-2",
                    service_name="k8s-ingress",
                    event_type=EventType.METRIC,
                    level=EventLevel.WARN,
                    metric_name="cpu_usage_pct",
                    metric_value=98.0,
                    message="WARN: Ingress edge node CPU saturated (98%) under DDoS payload.",
                    tags={"scenario": "false_correlation_prevention", "cluster": "B"},
                )
                await self.on_event(evt)

            else:
                # Background normal event to conclude
                await self._generate_normal_event()
