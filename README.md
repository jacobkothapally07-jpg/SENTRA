# 🛡️ Sentra
> **Real-Time Intelligent Incident Detection & Response Engine**  
> **Central Innovation:** *Runtime Evidence Graph for Adaptive Incident Causality*  
> **Theme:** *Naval Cream Enterprise Design System*  
> Built for the **HackForge 2026 Codeathon** by **Team 1234FORGE**  
> **Team Members:** Jacob Kothapally (Team Leader), Vedasri Peddapeta, Akshaya MV, Amith sai Jangam, sai srujan Shamshad.

---

## 🎯 Executive Defining Statement
> *"Sentra dynamically constructs a runtime evidence graph from live system events to understand how failures propagate, distinguish related incidents from coincidental anomalies, and produce confidence-aware, evidence-backed probable root-cause explanations."*

---

## 🌐 Live Cloud Deployment
- **Live Production URL:** [https://sentra-wipc.onrender.com](https://sentra-wipc.onrender.com)
- **Live API Documentation:** [https://sentra-wipc.onrender.com/docs](https://sentra-wipc.onrender.com/docs)
- **Real-Time Web Data Ingestion Streamer:** `python3 stream_real_web_data.py`

---

## 🚀 One-Command Local Deployment (.sh)

Deploy the entire Sentra platform locally (Python virtualenv, 17-point test verification, production frontend build, and live services) with a single command:

```bash
chmod +x deploy.sh
./deploy.sh
```

Or run via `start.sh`:
```bash
./start.sh
```

### 💻 Local Endpoints:
- **Naval Cream Dashboard UI:** `http://localhost:5173`
- **Unified FastAPI / SPA Server:** `http://localhost:8000`
- **Interactive OpenAPI Documentation:** `http://localhost:8000/docs`
- **Bi-directional WebSocket Stream:** `ws://localhost:8000/ws`

---

## 💡 The Central Innovation
### **Runtime Evidence Graph for Adaptive Incident Causality**

Traditional incident-management platforms heavily depend on static detection rules, static predefined topology maps, known hardcoded dependencies, and fixed time-window correlation.

**The Limitation:** Modern microservice systems are dynamic—workloads, ephemeral pods, and failure patterns shift continuously. A static rule or rigid time window cannot distinguish true causal propagation from coincidental simultaneous failures.

**Our Core Breakthrough:**
Rather than asking *"Did these alerts happen around the same time?"*, Sentra constructs a **Runtime Evidence Graph** asking:
> *"Is there enough multi-signal evidence that these events are related, how are they connected, and does the evidence support a directed failure propagation path from one event to another?"*

The Evidence Graph is the **central reasoning data structure** representing:
- **Live Anomalies & Microservice Nodes**
- **Dynamic Relationship Edges with Multi-Signal Scores**
- **Chronological Failure Propagation Sequences**
- **Confidence Levels** (`HIGH`, `MEDIUM`, `LOW`, `INSUFFICIENT_EVIDENCE`)
- **Explainability Layers** (*Why Correlated?* and *Why Not Correlated?*)

---

## 🏛️ End-to-End System Architecture

```
LIVE EVENT SOURCES (Metrics, Logs, Traces)
        ↓
EVENT INGESTION & OTel NORMALIZATION (Sub-5ms)
        ↓
HYBRID ANOMALY DETECTION (EWMA / 3-Sigma + Isolation Forest + Rules)
        ↓
EVIDENCE COLLECTION & DYNAMIC RELATIONSHIP DISCOVERY
(Score = 0.30 Temporal + 0.25 Distance + 0.20 Semantic + 0.15 Statistical + 0.10 Propagation)
        ↓
RUNTIME EVIDENCE GRAPH (REG)
   ├── Causal Direction & Propagation Analysis (Lead-Lag evaluation)
   ├── False-Correlation Prevention (Score < 0.48 -> Separated into distinct incidents)
   ├── Causal Centrality & Root Cause Scoring
   └── Explainability Matrix ("Why Correlated" vs "Why Separated")
        ↓
EVIDENCE-GROUNDED AI COPILOT & DETERMINISTIC OFFLINE ENGINE
        ↓
ENTERPRISE SRE DASHBOARD & OPERATOR FEEDBACK LOOP (Naval Cream)
```

---

## 🌟 The Two Killer Demos

### Demo 1: Cascading Failure & Directional Graph Discovery
- **Scenario:** Select `1. Cascading Outage (DB -> Payment -> Order)` $\rightarrow$ Click **Run Scenario**.
- **Result:** Database connection pool saturation triggers payment latency timeouts, order checkout failures, and API Gateway 503 circuit breakers.
- **Graph Evidence:** Sentra constructs the causal chain `postgres-db` $\xrightarrow{0.86}$ `payment-gateway` $\xrightarrow{0.82}$ `order-service` $\xrightarrow{0.79}$ `api-gateway`, isolating `postgres-db` as Root Cause with 94% confidence.

### Demo 2: Correlation $\neq$ Causation (False-Correlation Prevention)
- **Scenario:** Select `6. False-Correlation Test (Concurrent DB + Ingress DDoS)` $\rightarrow$ Click **Run Scenario**.
- **Result:** Internal DB pool exhaustion and an external Ingress DDoS happen at the exact same second ($T_0$).
- **Graph Evidence:** With 3-hop distance and 0.0 semantic overlap, composite score is **0.32** (below the 0.48 threshold). Sentra refuses to merge them and creates **2 separate actionable incidents**.

---

## 🧪 Automated Verification Suite

Run the full system verification check:
```bash
python backend/test_suite.py
```
```
=================================================================
🧪 Running Sentra Complete Self-Check & Validation Suite
=================================================================
✓ [1/17] Testing Normal Event Ingestion...
✓ [2/17] Testing Statistical Anomaly Detection (EWMA / 3-Sigma)...
✓ [3/17] Testing Cascading Failure Detection (DB -> Payment -> Order -> Gateway)...
✓ [4/17] Testing Alert Deduplication (100 events -> 1 incident)...
✓ [5/17] Testing Dynamic Severity & Priority Score...
✓ [6/17] Testing AI Root Cause Analysis & Offline Fallback...
✓ [7/17] Testing Explainability & Root Cause Evidence...
✓ [8/17] Testing Incident Impact Analysis...
✓ [9/17] Testing Operator Triage Lifecycle...
✓ [10/17] Testing Detection Rule Management...
✓ [11/17] Testing Service Health Scores...
✓ [12/17] Testing Global System Status...
✓ [14/17] Testing Runtime Evidence Graph Construction...
✓ [15/17] Testing False-Correlation Prevention (DB + Ingress Concurrent Failures)...
✓ [16/17] Testing Operator Feedback Recording...
✓ [17/17] Testing Ingestion Performance & Latency SLA...
=================================================================
🎉 ALL 17 SYSTEM TEST CHECKS PASSED (Runtime Evidence Graph Verified)!
=================================================================
```
