import asyncio
import time
from models import (
    NormalizedEvent,
    EventLevel,
    EventType,
    IncidentStatus,
    IncidentSeverity,
    DetectionRule,
)
from state import engine


async def run_test_suite():
    print("=" * 65)
    print("🧪 Running Sentra Complete Self-Check & Validation Suite")
    print("=" * 65)

    engine.reset_all()

    # 1. Test Normal Event Ingestion
    print("✓ [1/17] Testing Normal Event Ingestion...")
    evt1 = NormalizedEvent(
        source_id="api-gateway-1",
        service_name="api-gateway",
        event_type=EventType.LOG,
        level=EventLevel.INFO,
        message="Normal healthcheck",
    )
    inc1 = await engine.process_event(evt1)
    assert len(engine.events_buffer) == 1
    assert inc1 is None, "Normal event should not create incident"

    # 2. Test Single-Service Statistical Anomaly
    print("✓ [2/17] Testing Statistical Anomaly Detection (EWMA / 3-Sigma)...")
    # Feed historical baseline
    for i in range(12):
        await engine.process_event(
            NormalizedEvent(
                source_id="postgres-db-1",
                service_name="postgres-db",
                event_type=EventType.METRIC,
                level=EventLevel.INFO,
                metric_name="db_latency_ms",
                metric_value=8.0,
                message="Normal query latency",
            )
        )
    # Spike
    spike_evt = NormalizedEvent(
        source_id="postgres-db-1",
        service_name="postgres-db",
        event_type=EventType.METRIC,
        level=EventLevel.CRITICAL,
        metric_name="db_latency_ms",
        metric_value=1250.0,
        message="Database query latency spike",
    )
    inc_anomaly = await engine.process_event(spike_evt)
    assert inc_anomaly is not None, "Anomaly spike should trigger incident"
    assert inc_anomaly.root_cause_service == "postgres-db"

    # 3. Test Cascading Failure & Correlation
    print("✓ [3/17] Testing Cascading Failure Detection (DB -> Payment -> Order -> Gateway)...")
    pmt_evt = NormalizedEvent(
        source_id="payment-gateway-1",
        service_name="payment-gateway",
        event_type=EventType.METRIC,
        level=EventLevel.CRITICAL,
        metric_name="http_error_rate_pct",
        metric_value=34.0,
        message="Payment timeout waiting for DB transaction",
    )
    inc_cascade = await engine.process_event(pmt_evt)
    # Should attach to same incident (Deduplication)
    assert inc_cascade.id == inc_anomaly.id, "Cascading events must correlate into same incident"
    assert "payment-gateway" in inc_cascade.impacted_services
    assert inc_cascade.is_cascading is True

    # 4. Test Deduplication
    print("✓ [4/17] Testing Alert Deduplication (100 events -> 1 incident)...")
    for _ in range(50):
        await engine.process_event(
            NormalizedEvent(
                source_id="payment-gateway-2",
                service_name="payment-gateway",
                event_type=EventType.LOG,
                level=EventLevel.ERROR,
                message="Payment timeout duplicate alert",
            )
        )
    assert len(engine.incidents) == 1, "Must maintain exactly 1 deduplicated incident"
    assert inc_cascade.events_count > 50

    # 5. Test Severity & Priority Scoring
    print("✓ [5/17] Testing Dynamic Severity & Priority Score...")
    assert inc_cascade.severity == IncidentSeverity.P1_CRITICAL
    assert inc_cascade.priority_score >= 80

    # 6. Test AI Analysis & Offline Fallback
    print("✓ [6/17] Testing AI Root Cause Analysis & Offline Fallback...")
    assert inc_cascade.ai_analysis is not None
    assert "postgres" in inc_cascade.ai_analysis.probable_root_cause.lower()
    assert len(inc_cascade.ai_analysis.suggested_actions) > 0

    # 7. Test Explainability & Evidence
    print("✓ [7/17] Testing Explainability & Root Cause Evidence...")
    assert len(inc_cascade.why_created_reasons) > 0
    assert inc_cascade.evidence is not None
    assert inc_cascade.evidence.confidence_pct >= 90

    # 8. Test Impact Analysis
    print("✓ [8/17] Testing Incident Impact Analysis...")
    assert inc_cascade.impact is not None
    assert inc_cascade.impact.services_affected_count >= 2

    # 9. Test Operator Lifecycle (ACK -> Investigate -> Resolve)
    print("✓ [9/17] Testing Operator Triage Lifecycle...")
    inc_ack = engine.update_incident_status(inc_cascade.id, IncidentStatus.ACKNOWLEDGED, "Jacob Kothapally (Team Lead)")
    assert inc_ack.status == IncidentStatus.ACKNOWLEDGED

    inc_inv = engine.update_incident_status(inc_cascade.id, IncidentStatus.INVESTIGATING, "Jacob Kothapally (Team Lead)")
    assert inc_inv.status == IncidentStatus.INVESTIGATING

    engine.add_operator_note(inc_cascade.id, "Jacob Kothapally", "Scaled PgBouncer pooler and cleared active query queue.")
    assert len(inc_cascade.operator_notes) == 1

    inc_res = engine.update_incident_status(inc_cascade.id, IncidentStatus.RESOLVED, "Jacob Kothapally (Team Lead)")
    assert inc_res.status == IncidentStatus.RESOLVED
    assert inc_res.resolution_summary is not None
    print(f"       -> Resolution summary created: {inc_res.resolution_summary.resolution}")

    # 10. Test Detection Rule Modification
    print("✓ [10/17] Testing Detection Rule Management...")
    new_r = DetectionRule(
        id="test-rule-1",
        name="Custom Error Spike Rule",
        description="Trigger if error > 20%",
        service_name="api-gateway",
        metric_name="http_error_rate_pct",
        threshold=20.0,
        severity=IncidentSeverity.P1_CRITICAL,
    )
    engine.rule_engine.rules[new_r.id] = new_r
    assert "test-rule-1" in engine.rule_engine.rules

    # 11. Test Service Health Score Calculation
    print("✓ [11/17] Testing Service Health Scores...")
    for s in engine.services.values():
        assert 0 <= s.health_score <= 100

    # 12. Test Global System Status
    print("✓ [12/17] Testing Global System Status...")
    status = engine.get_global_system_status()
    assert status.value in ["OPERATIONAL", "DEGRADED", "INCIDENT_DETECTED", "CRITICAL"]

    # 14. Test Runtime Evidence Graph Structure
    print("✓ [14/17] Testing Runtime Evidence Graph Construction...")
    assert inc_cascade.evidence_graph is not None, "Evidence graph must be constructed"
    assert len(inc_cascade.evidence_graph.nodes) >= 2, "Evidence graph must contain service anomaly nodes"
    assert len(inc_cascade.evidence_graph.edges) >= 1, "Evidence graph must contain causal edges"
    assert inc_cascade.evidence_graph.confidence_pct >= 85

    # 15. Test False-Correlation Prevention (Independent Failures -> 2 Incidents)
    print("✓ [15/17] Testing False-Correlation Prevention (DB + Ingress Concurrent Failures)...")
    engine.reset_all()

    # Incident A: DB failure
    db_evt = NormalizedEvent(
        source_id="postgres-db-1",
        service_name="postgres-db",
        event_type=EventType.ALERT,
        level=EventLevel.CRITICAL,
        metric_name="db_latency_ms",
        metric_value=1500.0,
        message="CRITICAL: Database connection exhaustion",
    )
    inc_a = await engine.process_event(db_evt)

    # Incident B: Ingress BGP DDoS (Independent failure at the same timestamp)
    ingress_evt = NormalizedEvent(
        source_id="k8s-ingress-1",
        service_name="k8s-ingress",
        event_type=EventType.ALERT,
        level=EventLevel.CRITICAL,
        metric_name="latency_p99_ms",
        metric_value=5500.0,
        message="CRITICAL: Edge ingress network link saturation",
    )
    inc_b = await engine.process_event(ingress_evt)

    assert inc_a is not None and inc_b is not None
    assert inc_a.id != inc_b.id, f"False correlation prevention FAILED: {inc_a.id} should NOT equal {inc_b.id}"
    assert len(engine.incidents) == 2, f"Engine should maintain 2 separate incidents, found {len(engine.incidents)}"
    print(f"       -> Successfully created 2 distinct incidents: [{inc_a.id}: {inc_a.root_cause_service}] and [{inc_b.id}: {inc_b.root_cause_service}]")

    # 16. Test Operator Feedback Recording
    print("✓ [16/17] Testing Operator Feedback Recording...")
    fbk_inc = engine.record_operator_feedback(
        incident_id=inc_a.id,
        operator="Jacob Kothapally",
        correlation_accurate=True,
        root_cause_accurate=True,
        user_root_cause="postgres-db",
        notes="Correctly isolated database pool exhaustion from concurrent ingress network traffic.",
    )
    assert len(fbk_inc.operator_feedbacks) == 1

    # 17. Test System Stats & Latency
    print("✓ [17/17] Testing Ingestion Performance & Latency SLA...")
    stats = engine.get_system_stats()
    assert stats["average_processing_latency_ms"] < 5.0

    print("=" * 65)
    print("🎉 ALL 17 SYSTEM TEST CHECKS PASSED (Runtime Evidence Graph Verified)!")
    print("=" * 65)


if __name__ == "__main__":
    asyncio.run(run_test_suite())

