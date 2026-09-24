# 🎙️ Sentra - 2-3 Minute Live Judge Demonstration Script

**Project:** Sentra / Real-Time Intelligent Incident Detection & Response Engine  
**Central Innovation:** *Runtime Evidence Graph for Adaptive Incident Causality*  
**Design Theme:** *Naval Cream (Warm Ivory & Deep Navy)*  
**Team:** 1234FORGE | HackForge 2026

---

### ⏱️ Quick Summary & Timing
- **Total Duration:** 2.5 - 3.0 Minutes
- **Goal:** Showcase the central innovation (**Runtime Evidence Graph**), demonstrate **Adaptive Incident Causality**, prove **False-Correlation Prevention** (Killer Demo #2), and exhibit the **Evidence-Grounded AI Engine** with the refined Naval Cream theme.

---

## 🎬 Stage-by-Stage Presentation Flow

### 1. The Core Problem & Our Central Innovation (0:00 - 0:30)
- **What to show on screen:**
  - Open the Sentra Dashboard in **Naval Cream** (`http://localhost:5173` or `./deploy.sh`).
  - Point to the **Stats Bar** and **Topology View**: All 6 microservices healthy (Scores 98-100).
- **What to say:**
  > *"Hello Judges. Existing incident platforms fail in modern architectures because they rely on static topology rules, fixed correlation windows, and simplistic co-occurrence. When two unrelated events happen at the same time, naive engines mistakenly merge them; when novel cascades occur, static rule engines miss the causal link.*
  > 
  > *Our central innovation is the **Runtime Evidence Graph for Adaptive Incident Causality**. Instead of assuming static rules, Sentra dynamically constructs a directional evidence graph using multi-signal scoring—fusing temporal lead-lag, graph hop distance, semantic log similarity, statistical correlation, and telemetry propagation vectors in real-time."*

---

### 2. Killer Demo #1: Cascading Failure & Directional Graph Discovery (0:30 - 1:15)
- **What to do:**
  - In the top action bar, select Scenario: **`1. Cascading Outage (DB -> Payment -> Order)`** and click **`▶ RUN SCENARIO`** (or click **`▶ RUN FULL INCIDENT DEMO`**).
- **What happens on screen:**
  - PostgreSQL query latency spikes $\rightarrow$ Payment timeouts surge $\rightarrow$ Order Service checkouts drop $\rightarrow$ API Gateway trips 504 errors.
  - A single **`P1 CRITICAL`** incident appears: `Cascading Database Connection Exhaustion -> Payment Failure`.
- **What to show & say:**
  - Click into the incident to open the **Investigation Workspace Modal**.
  - Open **Tab 0: "Runtime Evidence Graph & Causality"**:
    - Show the **Directional Causal Edges**: `postgres-db` $\xrightarrow{Score: 0.86}$ `payment-gateway` $\xrightarrow{Score: 0.82}$ `order-service` $\xrightarrow{Score: 0.79}$ `api-gateway`.
    - Point out the **Multi-Signal Evidence pills**: (Temporal: 0.95 | Hop: 0.85 | Semantic: 0.88 | Statistical: 0.85 | Propagation: 0.80).
    - Show the **"Why Correlated"** panel explaining the physical propagation delay and error signature match.
  > *"Look at our Runtime Evidence Graph: Sentra discovers the causal chain in real-time. Notice how postgres-db is identified as the Root Cause with 94% confidence because it exhibits temporal precedence (-4.2s lead) and the highest causal centrality, while downstream nodes are correctly classified as symptoms."*

---

### 3. Killer Demo #2: Correlation $\neq$ Causation (False-Correlation Prevention) (1:15 - 1:55)
- **What to do:**
  - Close modal. In the Scenario dropdown, select: **`6. False-Correlation Test (Concurrent DB + Ingress DDoS)`** and click **`▶ RUN SCENARIO`**.
- **What happens on screen:**
  - An independent database connection exhaustion occurs at the exact same second ($T_0$) as an external volumetric DDoS attack on `k8s-ingress`.
  - Look at the **Incident Queue**: Sentra creates **2 SEPARATE, ISOLATED INCIDENTS**:
    1. `INC-XXXX`: Database connection exhaustion (`postgres-db`)
    2. `INC-YYYY`: Ingress DDoS volumetric traffic spike (`k8s-ingress`)
- **What to show & say:**
  - Click on either incident and point to the **"Why Not Correlated / Separation Audit"** panel.
  > *"This is the ultimate test of causality versus naive correlation. A static system would group these together because they occurred at the exact same timestamp. But Sentra evaluated the multi-signal relationship: with a topological distance of 3 hops and completely disjoint error semantics, the composite score was only 0.32—well below our evidence merge threshold of 0.48. Sentra proved they are non-causal and isolated them into two actionable tickets."*

---

### 4. Evidence-Grounded AI Engine & Operator Verification (1:55 - 2:30)
- **What to show:**
  - In the incident modal, switch to **"AI Incident Copilot"** tab:
    - Point out the AI summary grounded strictly in graph metrics with zero hallucinations.
    - Show the **Remediation Runbook Checklist** with safe bash/kubectl commands.
  - Switch back to **"Runtime Evidence Graph & Causality"** tab:
    - Under **"Operator Feedback Loop"**, click **`👍 Agree (Accurate Causality)`**, add an operator note (e.g. *"Confirmed pg_stat_activity connection pool leak"*), and click **`Submit Feedback`**.
- **What to say:**
  > *"Our LLM analysis is strictly constrained by the structured findings of the Runtime Evidence Graph. When AI is offline, our deterministic graph engine provides the exact same root cause without quality degradation. Furthermore, operators can verify or correct edges with one click, establishing an auditable human-in-the-loop feedback trail."*

---

### 5. Resolution & Wrap-Up (2:30 - 2:50)
- **What to do:**
  - Click **"Acknowledge"** $\rightarrow$ **"Investigate"** $\rightarrow$ **"✓ Resolve Incident"**.
  - Show the formal **Post-Mortem & Resolution Summary** generated instantly with the **Service Impact Status** breakdown.
  - Point to the **Stats Bar**: System health restores to **OPERATIONAL (98/100)**.
- **What to say:**
  > *"Upon mitigation, Sentra logs the full resolution audit trail and restores system health. Every PS1 requirement, bonus feature, and our central innovation—the Runtime Evidence Graph—are fully built, tested with 100% test suite pass rate, and deployed via a single `./deploy.sh` script. Thank you!"*

---

## 💡 Quick Q&A Cheat Sheet for Judges

| Question / Challenge | Sentra Answer & Where to Show |
| :--- | :--- |
| **How is this different from Datadog/PagerDuty?** | Traditional APMs use predefined static dependency maps and time windows. Sentra computes dynamic multi-signal evidence graphs ($Temporal + Hop + Semantic + Statistical + Propagation$) that dynamically adapt to novel failures. |
| **How do you avoid LLM hallucinations?** | The LLM receives structured JSON outputs from the graph engine (`root_cause`, `causal_chain`, `confidence`, `telemetry_deltas`). Prompts explicitly forbid inventing unseen components. Offline deterministic fallback is 100% identical. |
| **What happens if two unrelated alerts happen at the same time?** | Killer Demo #2 proves this: independent concurrent anomalies score below the $0.48$ merge threshold and are split into separate incidents. Show the *Why Not Correlated* panel. |
| **How is Sentra deployed?** | Run `./deploy.sh` in the repository root. It tests the system (17/17 checks), builds the frontend, and launches the full stack. |
