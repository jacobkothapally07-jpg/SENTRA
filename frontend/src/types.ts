export type EventLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'CRITICAL';
export type EventType = 'metric' | 'log' | 'trace' | 'alert';

export interface NormalizedEvent {
  id: string;
  timestamp: number;
  source_id: string;
  service_name: string;
  environment: string;
  event_type: EventType;
  level: EventLevel;
  metric_name?: string;
  metric_value?: number;
  message: string;
  tags: Record<string, any>;
  trace_id?: string;
  span_id?: string;
  is_anomaly?: boolean;
  anomaly_reason?: string;
  repeat_count?: number;
}

export type IncidentSeverity = 'P1_CRITICAL' | 'P2_HIGH' | 'P3_MEDIUM' | 'P4_LOW';
export type IncidentStatus = 'TRIGGERED' | 'ACKNOWLEDGED' | 'INVESTIGATING' | 'MITIGATED' | 'RESOLVED';
export type SystemStatus = 'OPERATIONAL' | 'DEGRADED' | 'INCIDENT_DETECTED' | 'CRITICAL';

export interface TimelineEntry {
  id: string;
  timestamp: number;
  title: string;
  description: string;
  badge: string;
  service?: string;
  level: EventLevel;
}

export interface AuditLogEntry {
  id: string;
  timestamp: number;
  action: string;
  operator: string;
  details: string;
}

export interface OperatorNote {
  id: string;
  timestamp: number;
  author: string;
  text: string;
}

export interface RootCauseEvidence {
  candidate: string;
  evidence_points: string[];
  confidence_pct: number;
  temporal_precedence: boolean;
  anomaly_strength: string;
}

export interface IncidentImpact {
  services_affected_count: number;
  events_correlated_count: number;
  cascade_depth: number;
  current_error_rate_pct: number;
  duration_formatted: string;
  duration_seconds: number;
  estimated_impact_level: string;
}

export interface AIAnalysis {
  summary: string;
  probable_root_cause: string;
  blast_radius: string;
  suggested_actions: string[];
  confidence_score: number;
  generated_at: number;
  is_fallback?: boolean;
  observed_evidence?: string[];
}

export interface CascadeStep {
  service: string;
  timestamp_delta: string;
  event_summary: string;
  status: string;
}

export interface ResolutionSummary {
  incident_id: string;
  probable_root_cause: string;
  duration_formatted: string;
  services_affected_count: number;
  events_analyzed_count: number;
  resolution: string;
  status: IncidentStatus;
  resolved_by: string;
  resolved_at: number;
}

export interface EvidenceGraphNode {
  id: string;
  label: string;
  node_type: 'SERVICE' | 'ANOMALY' | 'ROOT_CAUSE_CANDIDATE';
  service: string;
  timestamp: number;
  metric_name?: string;
  metric_value?: number;
  anomaly_score: number;
  severity: string;
  is_root_candidate: boolean;
}

export interface EvidenceGraphEdge {
  id: string;
  source: string;
  target: string;
  relationship_type: string;
  relationship_score: number;
  evidence_breakdown: Record<string, number>;
  supporting_evidence: string[];
  timestamp_delta_sec: number;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW' | 'INSUFFICIENT';
}

export interface RuntimeEvidenceGraph {
  nodes: EvidenceGraphNode[];
  edges: EvidenceGraphEdge[];
  propagation_paths: string[][];
  discovered_relationships_count: number;
  probable_root_cause: string;
  confidence_pct: number;
  confidence_level: 'HIGH' | 'MEDIUM' | 'LOW' | 'INSUFFICIENT';
  why_correlated: string[];
  why_not_correlated: string[];
  adaptive_window_seconds: number;
  updated_at: number;
}

export interface OperatorFeedback {
  id: string;
  incident_id: string;
  operator: string;
  correlation_accurate: boolean;
  root_cause_accurate: boolean;
  user_root_cause?: string;
  notes?: string;
  timestamp: number;
}

export interface Incident {
  id: string;
  title: string;
  summary: string;
  severity: IncidentSeverity;
  status: IncidentStatus;
  priority_score: number;
  created_at: number;
  updated_at: number;
  resolved_at?: number;
  root_cause_service: string;
  impacted_services: string[];
  events_count: number;
  event_ids: string[];
  events_sample: NormalizedEvent[];
  timeline: TimelineEntry[];
  audit_logs: AuditLogEntry[];
  ai_analysis?: AIAnalysis;
  evidence?: RootCauseEvidence;
  evidence_graph?: RuntimeEvidenceGraph;
  impact?: IncidentImpact;
  why_created_reasons?: string[];
  cascade_flow?: CascadeStep[];
  resolution_summary?: ResolutionSummary;
  assigned_to?: string;
  operator_notes: OperatorNote[];
  operator_feedbacks?: OperatorFeedback[];
  is_cascading: boolean;
  cascade_path: string[];
  correlation_rule?: string;
  before_state?: Record<string, number>;
  after_state?: Record<string, number>;
}

export interface ServiceNode {
  id: string;
  name: string;
  tier: string;
  status: 'HEALTHY' | 'DEGRADED' | 'CRITICAL';
  health_score: number;
  latency_ms: number;
  error_rate_pct: number;
  cpu_pct: number;
  active_incidents_count: number;
  dependencies: string[];
}

export interface DetectionRule {
  id: string;
  name: string;
  description: string;
  service_name: string;
  metric_name?: string;
  condition: string;
  threshold: number;
  pattern?: string;
  window_seconds: number;
  min_occurrences: number;
  severity: IncidentSeverity;
  enabled: boolean;
  created_at: number;
}

export interface SystemStats {
  total_events_processed: number;
  total_events_in_buffer: number;
  anomalies_detected_total: number;
  events_correlated_total: number;
  average_processing_latency_ms: number;
  total_incidents: number;
  active_incidents: number;
  critical_p1_active: number;
  high_p2_active: number;
  resolved_incidents: number;
  mttr_seconds: number;
  simulator_running: boolean;
  active_scenario?: string;
  events_per_second: number;
  global_system_status: SystemStatus;
  is_demo_running: boolean;
  demo_step: number;
}
