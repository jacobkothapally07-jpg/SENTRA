# 📋 SentinelIQ / SentinelForge - Requirements Traceability Matrix (PS1)

> **Central Innovation:** *Runtime Evidence Graph for Adaptive Incident Causality*  
> This matrix maps every **Minimum Requirement** and **Bonus Point Feature** from the HackForge Problem Statement directly to its backend implementation, frontend components, live demonstration location, and verification status.

---

## 🎯 Minimum Requirements

| # | Requirement | Feature & Description | Backend Implementation | Frontend Implementation | Demo Location in UI | Status |
|---|---|---|---|---|---|---|
| **M1** | **Accept events from multiple simulated sources** | Multi-service traffic ingestion supporting 8 services (Postgres, Payment, Orders, Ingress, Auth, Redis, Worker Queues) | `backend/simulator.py`<br>`backend/routes.py` (`POST /api/events`) | `frontend/src/components/LiveEventStream.tsx`<br>`frontend/src/components/EventInjectorModal.tsx` | Top Bar → Inject Event<br>Streaming Telemetry Tab | **COMPLETE** |
| **M2** | **Process events in real time or near real time** | High-throughput async event ingestion pipeline with sub-5ms processing latency | `backend/state.py` (`process_event`)<br>`backend/main.py` (FastAPI / AsyncIO) | `frontend/src/App.tsx` (WebSocket `/ws`) | Header live indicator<br>Stats Bar → "Engine Ingest Latency (1.2ms)" | **COMPLETE** |
| **M3** | **Normalize events into a common structure** | Standardized OpenTelemetry / ECS schema mapping heterogeneous logs, metrics, alerts, and traces | `backend/detector.py` (`EventNormalizer`)<br>`backend/models.py` (`NormalizedEvent`) | `frontend/src/types.ts` (`NormalizedEvent`)<br>`frontend/src/components/LiveEventStream.tsx` | Live Streaming Telemetry table columns | **COMPLETE** |
| **M4** | **Implement configurable rules for detecting abnormal behavior** | Configurable threshold, comparator (`>`, `<`, `==`), error spike, and pattern detection rules | `backend/detector.py` (`RuleEngine`)<br>`backend/routes.py` (`/api/rules`) | `frontend/src/components/RulesManager.tsx` | "Detection Rules" Tab (Edit, Toggle, Add Rule modal) | **COMPLETE** |
| **M5** | **Correlate multiple related events into a single incident** | **Runtime Evidence Graph**: Multi-signal relationship discovery (Temporal + Dependency + Semantic + Statistical + Propagation) | `backend/correlation.py` (`DynamicRelationshipDiscovery`, `CorrelationEngine`) | `frontend/src/components/IncidentList.tsx`<br>`frontend/src/components/IncidentDetail.tsx` | Priority Incident Queue<br>Incident Detail → "Runtime Evidence Graph" Tab | **COMPLETE** |
| **M6** | **Assign severity based on configurable criteria** | Multi-factor dynamic severity engine (P1 Critical, P2 High, P3 Medium, P4 Low) based on blast radius & core tiers | `backend/correlation.py` (`_calculate_severity_and_priority`) | `frontend/src/components/IncidentList.tsx`<br>`frontend/src/components/StatsBar.tsx` | Severity badges with visual color indicators (P1 Red, P2 Amber) | **COMPLETE** |
| **M7** | **Provide a real-time incident dashboard** | Real-time SRE enterprise console (4 non-AI themes: AWS Light, GitHub Dark, Datadog Navy, Solarized) | `backend/state.py`<br>`backend/main.py` (`/ws` broadcast) | `frontend/src/App.tsx`<br>`frontend/src/components/IncidentList.tsx` | Main View: Incidents Command Center & Priority Queue | **COMPLETE** |
| **M8** | **Maintain complete incident and event history** | Persistent ring buffers, incident state store, timeline logs, and complete audit trail | `backend/state.py` (`events_buffer`, `incidents`, `audit_trail`) | `frontend/src/components/IncidentDetail.tsx` (Timeline & Audit tabs) | Incident Modal → "Timeline" & "Audit Trail" tabs | **COMPLETE** |
| **M9** | **Allow operators to acknowledge, investigate, and resolve incidents** | SRE operational workflow (Triggered → Acknowledged → Investigating → Mitigated → Resolved), notes, feedback, and assignment | `backend/state.py` (`update_incident_status`, `add_operator_note`, `record_operator_feedback`) | `frontend/src/components/IncidentDetail.tsx` | Incident Modal → "Triage Lifecycle" buttons + Notes + Feedback | **COMPLETE** |

---

## 🌟 Bonus Point Requirements

| # | Bonus Requirement | Feature & Description | Backend Implementation | Frontend Implementation | Demo Location in UI | Status |
|---|---|---|---|---|---|---|
| **B1** | **Statistical or ML-based anomaly detection** | Online EWMA + 3-Sigma Z-Score dynamic baseline detection + Scikit-Learn Multivariate Isolation Forest | `backend/detector.py` (`StatisticalAnomalyDetector`, `MLIsolationForestDetector`) | `frontend/src/components/LiveEventStream.tsx`<br>`frontend/src/components/IncidentList.tsx` | Streaming Telemetry Pulse chart<br>Incident Badge "Statistical Anomaly" | **COMPLETE** |
| **B2** | **Event correlation engine** | **Dynamic Multi-Signal Relationship Discovery**: Composite scoring over live streaming telemetry | `backend/correlation.py` (`DynamicRelationshipDiscovery`, `RuntimeEvidenceGraph`) | `frontend/src/components/IncidentDetail.tsx` (Evidence Graph tab) | Incident Modal → "Runtime Evidence Graph" (+0s -> +2s -> +4s) | **COMPLETE** |
| **B3** | **Detect cascading failures across dependent services** | **Failure Propagation Analysis**: Traces propagation paths (e.g. `postgres-db` → `payment-gateway` → `order-service` → `api-gateway`) | `backend/correlation.py` (`find_root_candidate`, `cascade_flow`) | `frontend/src/components/TopologyView.tsx`<br>`frontend/src/components/IncidentDetail.tsx` | Mesh Topology Tab & Incident Detail "Propagation Flow" | **COMPLETE** |
| **B4** | **Automatic incident prioritization** | 0–100 Priority Scoring based on tier criticality, blast radius, error volume, and active SLA | `backend/correlation.py` (`_calculate_severity_and_priority`) | `frontend/src/components/IncidentList.tsx` | Priority Queue (Sorted by Severity + Priority Score) | **COMPLETE** |
| **B5** | **Generate an incident timeline automatically** | Chronologically synthesized timeline with event level badges, root re-attributions, and timestamps | `backend/models.py` (`TimelineEntry`)<br>`backend/correlation.py` | `frontend/src/components/IncidentDetail.tsx` (Timeline tab) | Incident Modal → "Timeline" Tab | **COMPLETE** |
| **B6** | **Use an LLM to summarize incident and suggest causes** | **Evidence-Grounded LLM Explanation**: Strictly grounded in the Runtime Evidence Graph (with 100% offline fallback) | `backend/ai_engine.py` (`IncidentAIEngine`) | `frontend/src/components/IncidentDetail.tsx` (RCA tab) | Incident Modal → "Probable Root Cause & Remediation" Tab | **COMPLETE** |
| **B7** | **Support large-scale simulated event streams efficiently** | Non-blocking async loop supporting 1–500 EPS with ring buffers and sub-5ms latency | `backend/simulator.py`<br>`backend/state.py` | `frontend/src/components/Header.tsx` (EPS slider) | Header EPS Slider & Performance Metric cards | **COMPLETE** |
| **B8** | **Real-time notifications** | WebSocket push broadcasts on incident trigger, state transitions, and critical threshold breaches | `backend/state.py` (`ConnectionManager`) | `frontend/src/App.tsx` (WebSocket sync) | Header Threat Banner & Top Notification Ticker | **COMPLETE** |

---

## 🏆 Central Innovation Optimizations

| Feature | Description | Implementation File | Demo Location |
|---|---|---|---|
| **Runtime Evidence Graph** | Core reasoning data structure tracking live anomaly nodes and multi-signal causal edges | `backend/correlation.py` (`RuntimeEvidenceGraph`) | Incident Detail → Tab 1 |
| **False-Correlation Prevention** | Proves Correlation $\ne$ Causation: isolates independent simultaneous failures into separate incidents | `backend/correlation.py` (`RELATIONSHIP_MERGE_THRESHOLD`) | Header Dropdown → "False-Correlation Test" |
| **Judge Demo Runner** | One-click automated 2-minute incident lifecycle execution (`▶ RUN FULL INCIDENT DEMO`) | `backend/state.py` (`_run_demo_scenario`) | Header Top Right |
| **Data-Driven Explainability** | Explicit "Why Correlated?" & "Why Not Correlated?" transparent reasoning | `backend/correlation.py` (`why_correlated`, `why_not_correlated`) | Incident Detail → Evidence Graph Tab |
| **Evidence-Backed RCA** | "PROBABLE ROOT CAUSE" checklist with 94% confidence rating | `backend/correlation.py` (`RootCauseEvidence`) | Incident Detail → RCA Tab |
| **Operator Causality Feedback** | Captures operator verification on causality & correlation accuracy for future adaptation | `backend/state.py` (`record_operator_feedback`) | Incident Detail → Logs & Feedback Tab |
| **Service Health Scores** | Dynamic 0–100 health scores (Green / Yellow / Red) for all microservices | `backend/state.py` (`_update_service_telemetry`) | Mesh Topology Tab & Stats Bar |
| **Enterprise UI (4 Themes)** | Non-AI SRE interface styling: AWS Light, GitHub Dark, Datadog Navy, Solarized Clean | `frontend/src/theme.ts`, `frontend/src/index.css` | Header Theme Selector |
| **Resolution Summary** | Formal resolution report generated on incident completion | `backend/state.py` (`ResolutionSummary`) | Incident Detail on Resolved status |

