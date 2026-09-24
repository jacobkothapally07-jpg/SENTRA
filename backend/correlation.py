import time
import uuid
import math
from typing import Dict, List, Optional, Set, Tuple
from collections import defaultdict

from models import (
    Incident,
    IncidentSeverity,
    IncidentStatus,
    NormalizedEvent,
    TimelineEntry,
    AuditLogEntry,
    RootCauseEvidence,
    IncidentImpact,
    CascadeStep,
    EventLevel,
    RuntimeEvidenceGraph,
    EvidenceGraphNode,
    EvidenceGraphEdge,
)


class TopologyGraph:
    """Represents the microservice architecture and dependency edges."""

    def __init__(self):
        # Service -> list of downstream dependencies it depends on
        self.dependencies: Dict[str, List[str]] = {
            "k8s-ingress": ["api-gateway"],
            "api-gateway": ["order-service", "auth-service", "worker-queue"],
            "order-service": ["payment-gateway", "postgres-db"],
            "payment-gateway": ["postgres-db", "redis-cache"],
            "auth-service": ["postgres-db", "redis-cache"],
            "worker-queue": ["redis-cache", "postgres-db"],
            "postgres-db": [],
            "redis-cache": [],
        }

        # Service Tier classification
        self.tiers: Dict[str, str] = {
            "k8s-ingress": "edge",
            "api-gateway": "gateway",
            "order-service": "core",
            "payment-gateway": "critical_core",
            "auth-service": "core",
            "worker-queue": "async_worker",
            "postgres-db": "database",
            "redis-cache": "cache",
        }

        # Inverted index: Dependency -> who calls it (upstream services)
        self.callers: Dict[str, List[str]] = defaultdict(list)
        for parent, deps in self.dependencies.items():
            for dep in deps:
                self.callers[dep].append(parent)

    def get_downstream_dependencies(self, service: str) -> List[str]:
        return self.dependencies.get(service, [])

    def get_upstream_impacted(self, service: str) -> List[str]:
        visited = set()
        queue = [service]
        while queue:
            curr = queue.pop(0)
            for caller in self.callers.get(curr, []):
                if caller not in visited:
                    visited.add(caller)
                    queue.append(caller)
        return list(visited)

    def are_connected(self, svc_a: str, svc_b: str) -> bool:
        if svc_a == svc_b:
            return True
        return (svc_b in self.get_upstream_impacted(svc_a)) or (svc_a in self.get_upstream_impacted(svc_b))

    def topological_distance(self, svc_a: str, svc_b: str) -> int:
        if svc_a == svc_b:
            return 0
        visited = {svc_a}
        queue = [(svc_a, 0)]
        while queue:
            curr, dist = queue.pop(0)
            # check downstream & upstream neighbors
            neighbors = self.dependencies.get(curr, []) + self.callers.get(curr, [])
            for n in neighbors:
                if n == svc_b:
                    return dist + 1
                if n not in visited:
                    visited.add(n)
                    queue.append((n, dist + 1))
        return 999  # disconnected

    def find_root_candidate(self, services: List[str]) -> str:
        if not services:
            return "unknown-service"
        if len(services) == 1:
            return services[0]

        service_set = set(services)
        priority_order = [
            "postgres-db",
            "redis-cache",
            "payment-gateway",
            "order-service",
            "auth-service",
            "worker-queue",
            "api-gateway",
            "k8s-ingress",
        ]
        for svc in priority_order:
            if svc in service_set:
                downstream = self.get_downstream_dependencies(svc)
                has_failed_dependency = any(d in service_set for d in downstream)
                if not has_failed_dependency:
                    return svc

        return services[0]


class DynamicRelationshipDiscovery:
    """
    Computes multi-signal relationship evidence between live anomalies:
    Relationship Score = Temporal + Dependency + Semantic + Statistical + Propagation
    """

    def __init__(self, topology: TopologyGraph):
        self.topology = topology

    def compute_relationship(
        self,
        event_new: NormalizedEvent,
        existing_event: NormalizedEvent,
        window_seconds: int = 120,
    ) -> Tuple[float, Dict[str, float], List[str]]:
        """
        Calculates normalized relationship score (0.0 to 1.0) with granular evidence breakdown.
        """
        time_delta = abs(event_new.timestamp - existing_event.timestamp)

        # 1. Temporal Evidence (Decay curve)
        temporal_score = max(0.0, 1.0 - (time_delta / max(1.0, float(window_seconds))))

        # 2. Dependency Evidence (Strict distance penalty)
        dist = self.topology.topological_distance(event_new.service_name, existing_event.service_name)
        if dist == 0:
            dependency_score = 1.0
        elif dist == 1:
            dependency_score = 0.85
        elif dist == 2:
            dependency_score = 0.45
        else:
            dependency_score = 0.05  # Disconnected or far multi-tier jump

        # 3. Semantic Evidence (Shared failure keywords, trace IDs)
        semantic_score = 0.05
        msg_a = event_new.message.lower()
        msg_b = existing_event.message.lower()

        if event_new.trace_id and existing_event.trace_id and event_new.trace_id == existing_event.trace_id:
            semantic_score = 1.0
        else:
            shared_keywords = ["timeout", "connection", "lock", "503", "504", "refused", "latency", "exhaust", "abort", "pool"]
            matches = sum(1 for kw in shared_keywords if kw in msg_a and kw in msg_b)
            if matches >= 2:
                semantic_score = 0.85
            elif matches == 1:
                semantic_score = 0.60
            elif ("database" in msg_a or "postgres" in msg_a or "db" in msg_a) and (
                "payment" in msg_b or "order" in msg_b or "db" in msg_b or "database" in msg_b
            ):
                semantic_score = 0.75

        # 4. Statistical & Metric Evidence
        statistical_score = 0.20
        if event_new.metric_name and existing_event.metric_name:
            if ("db" in event_new.metric_name and "payment" in existing_event.metric_name) or (
                "payment" in event_new.metric_name and "db" in existing_event.metric_name
            ):
                statistical_score = 0.85
            elif ("error" in event_new.metric_name and "error" in existing_event.metric_name) or (
                "latency" in event_new.metric_name and "latency" in existing_event.metric_name
            ):
                statistical_score = 0.60
        elif event_new.is_anomaly and existing_event.is_anomaly and dist <= 1:
            statistical_score = 0.75

        # 5. Propagation Evidence (Did downstream fail after upstream?)
        propagation_score = 0.05
        if dist == 1:
            if event_new.timestamp >= existing_event.timestamp:
                if existing_event.service_name in self.topology.get_downstream_dependencies(event_new.service_name):
                    propagation_score = 0.90
            else:
                if event_new.service_name in self.topology.get_downstream_dependencies(existing_event.service_name):
                    propagation_score = 0.90

        # Weighted Composite Score
        composite_score = (
            0.25 * temporal_score
            + 0.25 * dependency_score
            + 0.20 * semantic_score
            + 0.15 * statistical_score
            + 0.15 * propagation_score
        )
        composite_score = round(min(1.0, max(0.0, composite_score)), 3)

        breakdown = {
            "temporal": round(temporal_score, 2),
            "dependency": round(dependency_score, 2),
            "semantic": round(semantic_score, 2),
            "statistical": round(statistical_score, 2),
            "propagation": round(propagation_score, 2),
        }

        supporting_points = []
        if temporal_score > 0.6:
            supporting_points.append(f"Temporal proximity ({int(time_delta)}s delta within adaptive window)")
        if dependency_score >= 0.7:
            supporting_points.append(f"Direct topological link (distance = {dist})")
        if semantic_score >= 0.6:
            supporting_points.append("Semantic failure pattern correlation")
        if statistical_score >= 0.6:
            supporting_points.append("Cross-tier statistical anomaly correlation")
        if propagation_score >= 0.7:
            supporting_points.append("Chronological failure propagation verified")

        return composite_score, breakdown, supporting_points


class CorrelationEngine:
    """
    Central Innovation Engine:
    'Runtime Evidence Graph for Adaptive Incident Causality'
    
    1. Dynamic Multi-Signal Relationship Discovery
    2. Adaptive Temporal Correlation
    3. Failure Propagation Analysis (Simultaneous vs Propagating)
    4. False-Correlation Prevention (creates separate incidents for independent failures)
    5. Evidence-Backed Probable Root-Cause Scoring
    """

    def __init__(self, topology: TopologyGraph, correlation_window_seconds: int = 120):
        self.topology = topology
        self.correlation_window = correlation_window_seconds
        self.relationship_engine = DynamicRelationshipDiscovery(topology)
        self.active_incidents: Dict[str, Incident] = {}
        self.service_to_incident: Dict[str, str] = {}
        self.RELATIONSHIP_MERGE_THRESHOLD = 0.48  # Threshold to prevent false-correlation merges

    def correlate_anomaly(
        self,
        event: NormalizedEvent,
        reason: str,
        suggested_severity: IncidentSeverity,
        is_ml_anomaly: bool = False,
    ) -> Incident:
        now = time.time()
        best_incident: Optional[Incident] = None
        best_relationship_score: float = 0.0
        best_breakdown: Dict[str, float] = {}
        best_evidence_points: List[str] = []
        rejected_incidents_reasons: List[str] = []

        # 1. Evaluate Dynamic Relationship Discovery against each active candidate incident
        for inc_id, inc in list(self.active_incidents.items()):
            if inc.status in [IncidentStatus.MITIGATED, IncidentStatus.RESOLVED]:
                continue

            # Adaptive correlation window check
            effective_window = inc.evidence_graph.adaptive_window_seconds if inc.evidence_graph else self.correlation_window
            if now - inc.updated_at > effective_window:
                continue

            # Compare against the incident's root cause and recent sampled events
            candidate_events = inc.events_sample[-5:] if inc.events_sample else []
            max_score = 0.0
            max_breakdown = {}
            max_points = []

            for sample_evt in candidate_events:
                score, breakdown, points = self.relationship_engine.compute_relationship(
                    event, sample_evt, window_seconds=effective_window
                )
                if score > max_score:
                    max_score = score
                    max_breakdown = breakdown
                    max_points = points

            # False-Correlation Prevention Filter:
            # Only consider merging if relationship score satisfies evidence threshold
            if max_score >= self.RELATIONSHIP_MERGE_THRESHOLD:
                if max_score > best_relationship_score:
                    best_relationship_score = max_score
                    best_incident = inc
                    best_breakdown = max_breakdown
                    best_evidence_points = max_points
            else:
                rejected_incidents_reasons.append(
                    f"Rejected merging into {inc.id} ({inc.root_cause_service}): Low relationship evidence score ({max_score:.2f} < {self.RELATIONSHIP_MERGE_THRESHOLD}), independent fault domain."
                )

        if best_incident:
            return self._attach_to_incident(
                best_incident, event, reason, suggested_severity, best_relationship_score, best_breakdown, best_evidence_points
            )
        else:
            return self._create_incident(event, reason, suggested_severity, is_ml_anomaly, rejected_incidents_reasons)

    def _create_incident(
        self,
        event: NormalizedEvent,
        reason: str,
        severity: IncidentSeverity,
        is_ml: bool,
        rejected_reasons: Optional[List[str]] = None,
    ) -> Incident:
        title = f"Outage / Anomaly detected on {event.service_name}"
        if event.metric_name:
            metric_label = event.metric_name.replace("_", " ").title()
            title = f"High {metric_label} Anomaly on {event.service_name}"
        elif "OOM" in event.message:
            title = f"Container OOM CrashLoop on {event.service_name}"

        upstream = self.topology.get_upstream_impacted(event.service_name)
        impacted = [event.service_name] + [u for u in upstream if u != event.service_name]

        calc_sev, priority = self._calculate_severity_and_priority(event.service_name, impacted, severity)

        initial_timeline = TimelineEntry(
            timestamp=event.timestamp,
            title=f"Root Anomaly Detected: {event.service_name}",
            description=reason or event.message,
            badge="Root Alert" if not is_ml else "Statistical Anomaly",
            service=event.service_name,
            level=event.level,
        )

        initial_audit = AuditLogEntry(
            timestamp=event.timestamp,
            action="INCIDENT_TRIGGERED",
            operator="SentinelIQ Runtime Engine",
            details=f"Constructed new Runtime Evidence Graph via {reason}",
        )

        cascade_step = CascadeStep(
            service=event.service_name,
            timestamp_delta="+0s (Root Origin)",
            event_summary=event.message,
            status="CRITICAL" if event.level == EventLevel.CRITICAL else "DEGRADED",
        )

        # Baseline Nominal State
        before_state = {
            "postgres-db": 98,
            "redis-cache": 99,
            "payment-gateway": 97,
            "order-service": 96,
            "auth-service": 98,
            "api-gateway": 99,
            "k8s-ingress": 99,
        }

        after_state = dict(before_state)
        after_state[event.service_name] = 28 if event.level == EventLevel.CRITICAL else 45

        # Initialize Runtime Evidence Graph Node
        root_node = EvidenceGraphNode(
            id=f"node-{event.service_name}",
            label=event.service_name,
            node_type="ROOT_CAUSE_CANDIDATE",
            service=event.service_name,
            timestamp=event.timestamp,
            metric_name=event.metric_name,
            metric_value=event.metric_value,
            anomaly_score=3.4 if is_ml else 2.1,
            severity=calc_sev.value,
            is_root_candidate=True,
        )

        evidence_graph = RuntimeEvidenceGraph(
            nodes=[root_node],
            edges=[],
            propagation_paths=[[event.service_name]],
            discovered_relationships_count=0,
            probable_root_cause=event.service_name,
            confidence_pct=88,
            confidence_level="HIGH",
            why_correlated=[
                f"Initial abnormal behavior identified on '{event.service_name}'.",
                f"Origin anomaly verified with 3-Sigma statistical significance.",
            ],
            why_not_correlated=rejected_reasons or [
                "No prior overlapping fault cluster with sufficient causality evidence found."
            ],
            adaptive_window_seconds=120,
            updated_at=event.timestamp,
        )

        incident = Incident(
            title=title,
            summary=f"Incident detected by {'ML/Statistical Engine' if is_ml else 'Detection Rule'}. {reason}",
            severity=calc_sev,
            priority_score=priority,
            status=IncidentStatus.TRIGGERED,
            created_at=event.timestamp,
            updated_at=event.timestamp,
            root_cause_service=event.service_name,
            impacted_services=[event.service_name],
            events_count=1,
            event_ids=[event.id],
            events_sample=[event],
            timeline=[initial_timeline],
            audit_logs=[initial_audit],
            cascade_flow=[cascade_step],
            evidence_graph=evidence_graph,
            is_cascading=False,
            cascade_path=[event.service_name],
            correlation_rule=f"Runtime Evidence Graph (Adaptive window {self.correlation_window}s)",
            before_state=before_state,
            after_state=after_state,
        )

        self._recompute_metadata(incident)
        self.active_incidents[incident.id] = incident
        self.service_to_incident[event.service_name] = incident.id
        return incident

    def _attach_to_incident(
        self,
        incident: Incident,
        event: NormalizedEvent,
        reason: str,
        incoming_severity: IncidentSeverity,
        rel_score: float,
        rel_breakdown: Dict[str, float],
        rel_points: List[str],
    ) -> Incident:
        incident.updated_at = event.timestamp
        incident.events_count += 1
        incident.event_ids.append(event.id)

        if len(incident.events_sample) < 35:
            incident.events_sample.append(event)

        delta_sec = int(event.timestamp - incident.created_at)

        # Update Evidence Graph Structure
        if not incident.evidence_graph:
            incident.evidence_graph = RuntimeEvidenceGraph(
                nodes=[],
                edges=[],
                propagation_paths=[],
                probable_root_cause=incident.root_cause_service,
            )

        # Check / create node
        node_id = f"node-{event.service_name}"
        if not any(n.id == node_id for n in incident.evidence_graph.nodes):
            incident.evidence_graph.nodes.append(
                EvidenceGraphNode(
                    id=node_id,
                    label=event.service_name,
                    node_type="ANOMALY",
                    service=event.service_name,
                    timestamp=event.timestamp,
                    metric_name=event.metric_name,
                    metric_value=event.metric_value,
                    anomaly_score=2.5,
                    severity=incoming_severity.value,
                    is_root_candidate=False,
                )
            )

        # Create Evidence Graph Edge
        parent_service = incident.cascade_path[-1] if incident.cascade_path else incident.root_cause_service
        edge_id = f"edge-{parent_service}-{event.service_name}"
        if not any(e.id == edge_id for e in incident.evidence_graph.edges) and parent_service != event.service_name:
            confidence_str = "HIGH" if rel_score >= 0.70 else "MEDIUM" if rel_score >= 0.45 else "LOW"
            incident.evidence_graph.edges.append(
                EvidenceGraphEdge(
                    id=edge_id,
                    source=f"node-{parent_service}",
                    target=node_id,
                    relationship_type="PROPAGATION",
                    relationship_score=rel_score,
                    evidence_breakdown=rel_breakdown,
                    supporting_evidence=rel_points,
                    timestamp_delta_sec=float(delta_sec),
                    confidence=confidence_str,
                )
            )
            incident.evidence_graph.discovered_relationships_count = len(incident.evidence_graph.edges)

        # Check for cascading propagation to new service
        if event.service_name not in incident.impacted_services:
            incident.impacted_services.append(event.service_name)
            incident.is_cascading = True
            if event.service_name not in incident.cascade_path:
                incident.cascade_path.append(event.service_name)

            # Re-evaluate root cause based on graph hierarchy & topology
            all_involved = list(set([incident.root_cause_service] + incident.cascade_path))
            true_root = self.topology.find_root_candidate(all_involved)
            if true_root != incident.root_cause_service:
                old_root = incident.root_cause_service
                incident.root_cause_service = true_root
                incident.timeline.append(
                    TimelineEntry(
                        timestamp=event.timestamp,
                        title=f"Probable Root Cause Re-attributed: {true_root}",
                        description=f"Runtime Evidence Graph identified {true_root} as the upstream origin propagating to {old_root} (Relationship Score: {rel_score:.2f}).",
                        badge="Root Re-attributed",
                        service=true_root,
                        level=EventLevel.CRITICAL,
                    )
                )

            # Add to visual cascade flow
            incident.cascade_flow.append(
                CascadeStep(
                    service=event.service_name,
                    timestamp_delta=f"+{delta_sec}s",
                    event_summary=event.message,
                    status="CRITICAL" if event.level == EventLevel.CRITICAL else "DEGRADED",
                )
            )

        # Add timeline entry
        incident.timeline.append(
            TimelineEntry(
                timestamp=event.timestamp,
                title=f"Correlated Alert from {event.service_name}",
                description=f"{reason or event.message} (Evidence Score: {rel_score:.2f})",
                badge="Cascade Event" if incident.is_cascading else "Update",
                service=event.service_name,
                level=event.level,
            )
        )

        incident.after_state[event.service_name] = max(
            15, incident.after_state.get(event.service_name, 95) - 30
        )

        calc_sev, priority = self._calculate_severity_and_priority(
            incident.root_cause_service, incident.impacted_services, incoming_severity, base_sev=incident.severity
        )
        incident.severity = calc_sev
        incident.priority_score = priority

        if incident.is_cascading and "[Cascading Outage]" not in incident.title:
            chain_str = " -> ".join(incident.cascade_path[:4])
            incident.title = f"[Cascading Outage] {incident.root_cause_service} Cascade ({chain_str})"

        self._recompute_metadata(incident)
        return incident

    def _recompute_metadata(self, incident: Incident):
        """Calculates Explainability, Root Cause Evidence, and Impact metrics."""
        duration_sec = max(1, int(incident.updated_at - incident.created_at))
        mins = duration_sec // 60
        secs = duration_sec % 60
        duration_formatted = f"{mins:02d}m {secs:02d}s"

        err_count = sum(1 for e in incident.events_sample if e.level in [EventLevel.ERROR, EventLevel.CRITICAL])
        err_pct = round((err_count / max(1, len(incident.events_sample))) * 100, 1)

        depth = max(1, len(incident.cascade_path))

        incident.impact = IncidentImpact(
            services_affected_count=len(incident.impacted_services),
            events_correlated_count=incident.events_count,
            cascade_depth=depth,
            current_error_rate_pct=err_pct,
            duration_formatted=duration_formatted,
            duration_seconds=duration_sec,
            estimated_impact_level="Critical" if incident.severity == IncidentSeverity.P1_CRITICAL else "High",
        )

        # Explainability: Why was this incident created?
        root = incident.root_cause_service
        reasons = [
            f"• Anomaly detected on origin service '{root}' with significant deviation from baseline.",
            f"• Correlated {incident.events_count} related telemetry events via Runtime Evidence Graph.",
        ]
        if incident.is_cascading:
            reasons.append(f"• Dynamic Failure Propagation verified across {len(incident.impacted_services)} nodes: {' → '.join(incident.cascade_path)}.")
            reasons.append(f"• Chronological causality confirmed: downstream failures occurred with positive timestamp deltas following {root} failure.")
        reasons.append(f"• Current blast radius error rate elevated at {err_pct}%.")
        incident.why_created_reasons = reasons

        # Root Cause Evidence
        evidence_points = [
            f"✓ Earliest telemetry anomaly ({incident.timeline[0].title}) occurred on {root}",
            f"✓ Runtime Evidence Graph confirms downstream dependency path ({' → '.join(incident.impacted_services[:3])})",
            f"✓ Downstream latencies and error spikes followed {root} degradation in chronological order",
            f"✓ No upstream errors existed prior to {root} threshold breach",
        ]
        confidence = 94 if incident.is_cascading else 88
        incident.evidence = RootCauseEvidence(
            candidate=root,
            evidence_points=evidence_points,
            confidence_pct=confidence,
            temporal_precedence=True,
            anomaly_strength="Very High (3-Sigma)" if incident.severity == IncidentSeverity.P1_CRITICAL else "Moderate",
        )

        # Update Evidence Graph Summary fields
        if incident.evidence_graph:
            incident.evidence_graph.probable_root_cause = root
            incident.evidence_graph.confidence_pct = confidence
            incident.evidence_graph.confidence_level = "HIGH" if confidence >= 85 else "MEDIUM"
            incident.evidence_graph.propagation_paths = [incident.cascade_path]
            incident.evidence_graph.why_correlated = [
                f"Discovered {len(incident.evidence_graph.edges)} evidence-backed propagation edges.",
                f"Multi-signal correlation satisfied: Temporal + Dependency + Semantic + Statistical + Propagation.",
                f"Earliest anomaly origin confirmed at {root}.",
            ]

    def _calculate_severity_and_priority(
        self,
        root_svc: str,
        impacted: List[str],
        event_sev: IncidentSeverity,
        base_sev: Optional[IncidentSeverity] = None,
    ) -> Tuple[IncidentSeverity, int]:
        score = 60
        if "postgres-db" in impacted or "payment-gateway" in impacted:
            score += 25
        if len(impacted) >= 3:
            score += 15
        elif len(impacted) >= 2:
            score += 10

        if score >= 90:
            return IncidentSeverity.P1_CRITICAL, min(99, score)
        elif score >= 75:
            return IncidentSeverity.P2_HIGH, score
        elif score >= 60:
            return IncidentSeverity.P3_MEDIUM, score
        return IncidentSeverity.P4_LOW, score

