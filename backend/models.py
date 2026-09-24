import time
import uuid
from enum import Enum
from typing import Dict, List, Optional, Any, Union
from pydantic import BaseModel, Field


class EventLevel(str, Enum):
    DEBUG = "DEBUG"
    INFO = "INFO"
    WARN = "WARN"
    ERROR = "ERROR"
    CRITICAL = "CRITICAL"


class EventType(str, Enum):
    METRIC = "metric"
    LOG = "log"
    TRACE = "trace"
    ALERT = "alert"


class NormalizedEvent(BaseModel):
    id: str = Field(default_factory=lambda: f"evt-{uuid.uuid4().hex[:10]}")
    timestamp: float = Field(default_factory=time.time)
    source_id: str
    service_name: str
    environment: str = "production"
    event_type: EventType = EventType.LOG
    level: EventLevel = EventLevel.INFO
    metric_name: Optional[str] = None
    metric_value: Optional[float] = None
    message: str
    tags: Dict[str, Any] = Field(default_factory=dict)
    trace_id: Optional[str] = None
    span_id: Optional[str] = None
    is_anomaly: bool = False
    anomaly_reason: Optional[str] = None
    repeat_count: int = 1


class RawEventInput(BaseModel):
    source_id: Optional[str] = None
    service_name: Optional[str] = None
    service: Optional[str] = None
    environment: Optional[str] = "production"
    event_type: Optional[str] = "log"
    type: Optional[str] = None
    level: Optional[str] = "INFO"
    severity: Optional[str] = None
    metric_name: Optional[str] = None
    metric: Optional[str] = None
    metric_value: Optional[Union[float, int, str]] = None
    value: Optional[Union[float, int, str]] = None
    message: Optional[str] = "System event"
    msg: Optional[str] = None
    tags: Optional[Dict[str, Any]] = None
    trace_id: Optional[str] = None
    timestamp: Optional[Union[float, int, str]] = None


class IncidentSeverity(str, Enum):
    P1_CRITICAL = "P1_CRITICAL"
    P2_HIGH = "P2_HIGH"
    P3_MEDIUM = "P3_MEDIUM"
    P4_LOW = "P4_LOW"


class IncidentStatus(str, Enum):
    TRIGGERED = "TRIGGERED"
    ACKNOWLEDGED = "ACKNOWLEDGED"
    INVESTIGATING = "INVESTIGATING"
    MITIGATED = "MITIGATED"
    RESOLVED = "RESOLVED"


class SystemStatus(str, Enum):
    OPERATIONAL = "OPERATIONAL"
    DEGRADED = "DEGRADED"
    INCIDENT_DETECTED = "INCIDENT_DETECTED"
    CRITICAL = "CRITICAL"


class TimelineEntry(BaseModel):
    id: str = Field(default_factory=lambda: f"tml-{uuid.uuid4().hex[:6]}")
    timestamp: float = Field(default_factory=time.time)
    title: str
    description: str
    badge: str
    service: Optional[str] = None
    level: EventLevel = EventLevel.INFO


class AuditLogEntry(BaseModel):
    id: str = Field(default_factory=lambda: f"adt-{uuid.uuid4().hex[:6]}")
    timestamp: float = Field(default_factory=time.time)
    action: str
    operator: str
    details: str


class OperatorNote(BaseModel):
    id: str = Field(default_factory=lambda: f"not-{uuid.uuid4().hex[:6]}")
    timestamp: float = Field(default_factory=time.time)
    author: str
    text: str


class RootCauseEvidence(BaseModel):
    candidate: str
    evidence_points: List[str]
    confidence_pct: int
    temporal_precedence: bool = True
    anomaly_strength: str = "High"


class IncidentImpact(BaseModel):
    services_affected_count: int
    events_correlated_count: int
    cascade_depth: int
    current_error_rate_pct: float
    duration_formatted: str
    duration_seconds: int
    estimated_impact_level: str  # Critical / Major / Moderate / Low


class AIAnalysis(BaseModel):
    summary: str
    probable_root_cause: str
    blast_radius: str
    suggested_actions: List[str]
    confidence_score: float = 0.94
    generated_at: float = Field(default_factory=time.time)
    is_fallback: bool = False
    observed_evidence: List[str] = Field(default_factory=list)


class ResolutionSummary(BaseModel):
    incident_id: str
    probable_root_cause: str
    duration_formatted: str
    services_affected_count: int
    events_analyzed_count: int
    resolution: str
    status: IncidentStatus = IncidentStatus.RESOLVED
    resolved_by: str = "Operator"
    resolved_at: float = Field(default_factory=time.time)


class CascadeStep(BaseModel):
    service: str
    timestamp_delta: str
    event_summary: str
    status: str


class EvidenceGraphNode(BaseModel):
    id: str
    label: str
    node_type: str = "SERVICE"  # SERVICE, ANOMALY, ROOT_CAUSE_CANDIDATE
    service: str
    timestamp: float = Field(default_factory=time.time)
    metric_name: Optional[str] = None
    metric_value: Optional[float] = None
    anomaly_score: float = 1.0
    severity: str = "P2_HIGH"
    is_root_candidate: bool = False


class EvidenceGraphEdge(BaseModel):
    id: str
    source: str
    target: str
    relationship_type: str = "PROPAGATION"  # TEMPORAL, DEPENDENCY, PROPAGATION, SEMANTIC, STATISTICAL
    relationship_score: float = 0.85  # 0.0 to 1.0
    evidence_breakdown: Dict[str, float] = Field(default_factory=dict)
    supporting_evidence: List[str] = Field(default_factory=list)
    timestamp_delta_sec: float = 0.0
    confidence: str = "HIGH"  # HIGH, MEDIUM, LOW, INSUFFICIENT


class RuntimeEvidenceGraph(BaseModel):
    nodes: List[EvidenceGraphNode] = Field(default_factory=list)
    edges: List[EvidenceGraphEdge] = Field(default_factory=list)
    propagation_paths: List[List[str]] = Field(default_factory=list)
    discovered_relationships_count: int = 0
    probable_root_cause: str = "unknown"
    confidence_pct: int = 94
    confidence_level: str = "HIGH"  # HIGH, MEDIUM, LOW, INSUFFICIENT
    why_correlated: List[str] = Field(default_factory=list)
    why_not_correlated: List[str] = Field(default_factory=list)
    adaptive_window_seconds: int = 120
    updated_at: float = Field(default_factory=time.time)


class OperatorFeedback(BaseModel):
    id: str = Field(default_factory=lambda: f"fbk-{uuid.uuid4().hex[:6]}")
    incident_id: str
    operator: str
    correlation_accurate: bool = True
    root_cause_accurate: bool = True
    user_root_cause: Optional[str] = None
    notes: Optional[str] = None
    timestamp: float = Field(default_factory=time.time)


class Incident(BaseModel):
    id: str = Field(default_factory=lambda: f"INC-{uuid.uuid4().hex[:4].upper()}")
    title: str
    summary: str
    severity: IncidentSeverity = IncidentSeverity.P3_MEDIUM
    status: IncidentStatus = IncidentStatus.TRIGGERED
    priority_score: int = 80  # 0 to 100 ranking score
    created_at: float = Field(default_factory=time.time)
    updated_at: float = Field(default_factory=time.time)
    resolved_at: Optional[float] = None
    root_cause_service: str
    impacted_services: List[str] = Field(default_factory=list)
    events_count: int = 1
    event_ids: List[str] = Field(default_factory=list)
    events_sample: List[NormalizedEvent] = Field(default_factory=list)
    timeline: List[TimelineEntry] = Field(default_factory=list)
    audit_logs: List[AuditLogEntry] = Field(default_factory=list)
    ai_analysis: Optional[AIAnalysis] = None
    evidence: Optional[RootCauseEvidence] = None
    evidence_graph: Optional[RuntimeEvidenceGraph] = None
    impact: Optional[IncidentImpact] = None
    why_created_reasons: List[str] = Field(default_factory=list)
    cascade_flow: List[CascadeStep] = Field(default_factory=list)
    resolution_summary: Optional[ResolutionSummary] = None
    assigned_to: Optional[str] = None
    operator_notes: List[OperatorNote] = Field(default_factory=list)
    operator_feedbacks: List[OperatorFeedback] = Field(default_factory=list)
    is_cascading: bool = False
    cascade_path: List[str] = Field(default_factory=list)
    correlation_rule: Optional[str] = None
    before_state: Dict[str, int] = Field(default_factory=dict)
    after_state: Dict[str, int] = Field(default_factory=dict)


class ServiceNode(BaseModel):
    id: str
    name: str
    tier: str  # edge, gateway, core, database, cache, async_worker
    status: str = "HEALTHY"  # HEALTHY, DEGRADED, CRITICAL
    health_score: int = 100  # 0 to 100
    latency_ms: float = 20.0
    error_rate_pct: float = 0.0
    cpu_pct: float = 15.0
    active_incidents_count: int = 0
    dependencies: List[str] = Field(default_factory=list)


class RuleCondition(str, Enum):
    GT = "gt"
    LT = "lt"
    GTE = "gte"
    LTE = "lte"
    EQ = "eq"
    ERROR_SPIKE = "error_spike"
    ANOMALY_ML = "anomaly_ml"
    MESSAGE_CONTAINS = "contains"


class DetectionRule(BaseModel):
    id: str = Field(default_factory=lambda: f"rule-{uuid.uuid4().hex[:6]}")
    name: str
    description: str
    service_name: str = "*"
    metric_name: Optional[str] = None
    condition: Union[RuleCondition, str] = RuleCondition.GT
    threshold: float = 0.0
    pattern: Optional[str] = None
    window_seconds: int = 30
    min_occurrences: int = 1
    severity: IncidentSeverity = IncidentSeverity.P2_HIGH
    enabled: bool = True
    created_at: float = Field(default_factory=time.time)


class AnomalyDetectionResult(BaseModel):
    is_anomaly: bool
    score: float
    metric_name: str
    current_value: float
    expected_value: float
    std_dev: float
    algorithm: str
    reason: str
