from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from models import (
    NormalizedEvent,
    RawEventInput,
    Incident,
    IncidentStatus,
    IncidentSeverity,
    DetectionRule,
    ServiceNode,
    AuditLogEntry,
)
from detector import EventNormalizer
from state import engine

router = APIRouter()


class StatusUpdateRequest(BaseModel):
    status: IncidentStatus
    assigned_to: Optional[str] = None
    operator: Optional[str] = "Jacob Kothapally (Team Lead)"


class NoteCreateRequest(BaseModel):
    author: str
    text: str


class SimulatorRateRequest(BaseModel):
    rate: float


class SimulatorScenarioRequest(BaseModel):
    scenario: str  # cascading_failure, database_failure, payment_failure, auth_failure, network_latency


# --- Judge / Demo Mode ---

@router.post("/demo/start")
async def start_demo_mode():
    """Triggers the automated 21-stage Guided Demo for Hackathon Judges."""
    engine.start_full_incident_demo()
    return {"status": "demo_started", "message": "Automated 2-minute incident lifecycle demo started."}


@router.post("/demo/stop")
async def stop_demo_mode():
    """Stops the active automated demo."""
    engine.stop_full_incident_demo()
    return {"status": "demo_stopped"}


# --- Event Ingestion & History ---

@router.post("/events", response_model=NormalizedEvent)
async def ingest_raw_event(raw: RawEventInput):
    """Ingests and normalizes an event from external services/webhooks."""
    normalized = EventNormalizer.normalize(raw)
    await engine.process_event(normalized)
    return normalized


@router.get("/events", response_model=List[NormalizedEvent])
async def list_events(
    limit: int = Query(100, ge=1, le=1000),
    service: Optional[str] = None,
    level: Optional[str] = None,
    anomalies_only: bool = False,
):
    """Retrieves normalized event history with filtering and anomaly flags."""
    events = list(engine.events_buffer)
    if service and service != "ALL":
        events = [e for e in events if e.service_name == service]
    if level and level != "ALL":
        events = [e for e in events if e.level.value == level.upper()]
    if anomalies_only:
        events = [e for e in events if e.is_anomaly]
    return list(reversed(events))[:limit]


# --- Incident Management ---

@router.get("/incidents", response_model=List[Incident])
async def list_incidents(
    status: Optional[str] = None,
    severity: Optional[str] = None,
    service: Optional[str] = None,
):
    """Lists all incidents sorted by priority score & updated time."""
    incidents = list(engine.incidents.values())
    if status and status != "ALL":
        incidents = [i for i in incidents if i.status.value == status.upper()]
    if severity and severity != "ALL":
        incidents = [i for i in incidents if i.severity.value == severity.upper()]
    if service and service != "ALL":
        incidents = [i for i in incidents if i.root_cause_service == service or service in i.impacted_services]

    # Priority sort: P1 first, highest priority_score, then latest updated
    severity_rank = {
        IncidentSeverity.P1_CRITICAL: 4,
        IncidentSeverity.P2_HIGH: 3,
        IncidentSeverity.P3_MEDIUM: 2,
        IncidentSeverity.P4_LOW: 1,
    }
    incidents.sort(
        key=lambda x: (severity_rank.get(x.severity, 0), x.priority_score, x.updated_at),
        reverse=True,
    )
    return incidents


@router.get("/incidents/{incident_id}", response_model=Incident)
async def get_incident(incident_id: str):
    """Fetches full deep-dive details for an incident."""
    inc = engine.incidents.get(incident_id)
    if not inc:
        raise HTTPException(status_code=404, detail="Incident not found")
    return inc


@router.patch("/incidents/{incident_id}/status", response_model=Incident)
async def update_incident_status(incident_id: str, req: StatusUpdateRequest):
    """Operator workflow to ACK, Investigate, Mitigate, or Resolve an incident."""
    inc = engine.update_incident_status(incident_id, req.status, req.assigned_to, req.operator or "Operator")
    if not inc:
        raise HTTPException(status_code=404, detail="Incident not found")
    await engine.ws_manager.broadcast({"type": "INCIDENT_UPDATE", "incident": inc.dict()})
    return inc


class OperatorFeedbackRequest(BaseModel):
    operator: str = "Jacob Kothapally (Team Lead)"
    correlation_accurate: bool = True
    root_cause_accurate: bool = True
    user_root_cause: Optional[str] = None
    notes: Optional[str] = None


@router.post("/incidents/{incident_id}/notes", response_model=Incident)
async def add_incident_note(incident_id: str, req: NoteCreateRequest):
    """Attaches an operator investigation note and updates timeline."""
    inc = engine.add_operator_note(incident_id, req.author, req.text)
    if not inc:
        raise HTTPException(status_code=404, detail="Incident not found")
    await engine.ws_manager.broadcast({"type": "INCIDENT_UPDATE", "incident": inc.dict()})
    return inc


@router.post("/incidents/{incident_id}/feedback", response_model=Incident)
async def record_operator_feedback(incident_id: str, req: OperatorFeedbackRequest):
    """Records human operator feedback on causality & correlation accuracy for future adaptation."""
    inc = engine.record_operator_feedback(
        incident_id=incident_id,
        operator=req.operator,
        correlation_accurate=req.correlation_accurate,
        root_cause_accurate=req.root_cause_accurate,
        user_root_cause=req.user_root_cause,
        notes=req.notes,
    )
    if not inc:
        raise HTTPException(status_code=404, detail="Incident not found")
    await engine.ws_manager.broadcast({"type": "INCIDENT_UPDATE", "incident": inc.dict()})
    return inc


# --- Detection Rules Management ---

@router.get("/rules", response_model=List[DetectionRule])
async def list_rules():
    """Returns all active configurable detection rules."""
    return list(engine.rule_engine.rules.values())


@router.post("/rules", response_model=DetectionRule)
async def create_rule(rule: DetectionRule):
    """Adds a new configurable detection rule."""
    engine.rule_engine.rules[rule.id] = rule
    audit = AuditLogEntry(
        action="RULE_CREATED",
        operator="Operator",
        details=f"Created detection rule '{rule.name}' ({rule.metric_name} {rule.condition} {rule.threshold})",
    )
    engine.audit_trail.append(audit)
    return rule


@router.patch("/rules/{rule_id}", response_model=DetectionRule)
async def update_rule(rule_id: str, rule_update: DetectionRule):
    """Updates an existing detection rule's threshold or severity."""
    rule = engine.rule_engine.rules.get(rule_id)
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")
    engine.rule_engine.rules[rule_id] = rule_update
    audit = AuditLogEntry(
        action="RULE_MODIFIED",
        operator="Operator",
        details=f"Modified rule '{rule.name}' threshold to {rule_update.threshold}",
    )
    engine.audit_trail.append(audit)
    return rule_update


@router.patch("/rules/{rule_id}/toggle", response_model=DetectionRule)
async def toggle_rule(rule_id: str):
    """Toggles rule on/off."""
    rule = engine.rule_engine.rules.get(rule_id)
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")
    rule.enabled = not rule.enabled
    audit = AuditLogEntry(
        action="RULE_TOGGLED",
        operator="Operator",
        details=f"Rule '{rule.name}' toggled to {'ENABLED' if rule.enabled else 'DISABLED'}",
    )
    engine.audit_trail.append(audit)
    return rule


@router.delete("/rules/{rule_id}")
async def delete_rule(rule_id: str):
    """Deletes a detection rule."""
    if rule_id in engine.rule_engine.rules:
        del engine.rule_engine.rules[rule_id]
        return {"status": "deleted", "id": rule_id}
    raise HTTPException(status_code=404, detail="Rule not found")


# --- Topology & Health ---

@router.get("/topology", response_model=List[ServiceNode])
async def get_topology():
    """Returns all service nodes with live health scores and dependencies."""
    return list(engine.services.values())


@router.get("/stats")
async def get_stats():
    """Returns platform processing metrics and summary counts."""
    return engine.get_system_stats()


@router.get("/audit", response_model=List[AuditLogEntry])
async def get_audit_trail():
    """Returns system operator audit trail."""
    return list(reversed(engine.audit_trail))


# --- Simulator Controls ---

@router.post("/simulator/start")
async def start_simulator(eps: float = Query(4.0, ge=0.5, le=100.0)):
    engine.simulator.start(eps)
    return {"status": "started", "events_per_second": eps}


@router.post("/simulator/stop")
async def stop_simulator():
    engine.simulator.stop()
    return {"status": "stopped"}


@router.post("/simulator/rate")
async def set_simulator_rate(req: SimulatorRateRequest):
    engine.simulator.set_rate(req.rate)
    return {"status": "rate_updated", "events_per_second": engine.simulator.events_per_second}


@router.post("/simulator/scenario")
async def trigger_scenario(req: SimulatorScenarioRequest):
    engine.simulator.trigger_scenario(req.scenario)
    return {
        "status": "scenario_triggered",
        "scenario": req.scenario,
        "message": f"Scenario '{req.scenario}' has been injected.",
    }


@router.post("/simulator/reset")
async def reset_state():
    engine.reset_all()
    return {"status": "reset_completed"}
