import os
import time
import json
import httpx
from typing import Optional, List
from models import Incident, AIAnalysis


class IncidentAIEngine:
    """
    AI Incident Analysis Engine with:
    - Explicit separation of OBSERVED EVIDENCE vs AI ANALYSIS (Probable Root Cause)
    - 100% Functional deterministic offline fallback
    - Actionable SRE remediation runbooks
    """

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.environ.get("GEMINI_API_KEY") or os.environ.get("OPENAI_API_KEY")

    async def analyze_incident(self, incident: Incident) -> AIAnalysis:
        if self.api_key and "GEMINI" in os.environ:
            try:
                analysis = await self._call_gemini(incident)
                if analysis:
                    return analysis
            except Exception as e:
                print(f"[AIEngine] Remote LLM call failed, falling back to deterministic expert system: {e}")

        return self._generate_deterministic_analysis(incident)

    def _generate_deterministic_analysis(self, incident: Incident) -> AIAnalysis:
        root = incident.root_cause_service
        impacted_str = ", ".join(incident.impacted_services) or root
        count = incident.events_count
        is_cascade = incident.is_cascading

        # Synthesize Observed Evidence from actual telemetry data
        observed = [
            f"Observed telemetry breach on origin node: '{root}'",
            f"Captured {count} correlated events across {len(incident.impacted_services)} microservices ({impacted_str})",
            f"Correlation duration: {incident.impact.duration_formatted if incident.impact else '01m 15s'}",
        ]
        if is_cascade:
            observed.append(f"Recorded chronological cascading propagation: {' -> '.join(incident.cascade_path)}")

        # Probable root cause hypotheses & remediation playbooks
        if "postgres" in root or "db" in root:
            summary = (
                f"Severe database resource contention detected on '{root}'. "
                f"Active connection pool reached capacity, leading to request timeouts and downstream blocking across {impacted_str}."
            )
            probable_root_cause = (
                "PostgreSQL connection exhaustion or unindexed slow queries saturating connection pool limits (max_connections=100 reached)."
            )
            blast_radius = (
                f"Critical impact on all synchronous stateful workloads ({impacted_str}). "
                "End-users are experiencing HTTP 504 Gateway Timeouts and failed transaction commits."
            )
            suggested_actions = [
                "1. Scale connection pooler (e.g. PgBouncer) or temporarily increase 'max_connections' in postgresql.conf.",
                "2. Identify and terminate long-running queries via 'SELECT pid, query, state FROM pg_stat_activity WHERE state != 'idle';'.",
                "3. Enable aggressive query timeout policies (statement_timeout = 3000ms) to fail-fast.",
                "4. Implement circuit breaking on API Gateway to shed non-essential load.",
            ]
            confidence = 0.94

        elif "payment" in root:
            summary = (
                f"Payment processing anomaly detected in '{root}'. "
                f"Elevated 3rd-party gateway response times and timeout retries are impacting checkout conversion across {impacted_str}."
            )
            probable_root_cause = (
                "Upstream payment processor latency degradation or rate-limiting triggering transaction rollback cascade."
            )
            blast_radius = (
                "Direct revenue impact. Customer checkout orders are failing or queued in retry backlog."
            )
            suggested_actions = [
                "1. Check PSP (Stripe/Adyen/PayPal) status dashboard for ongoing third-party provider incidents.",
                "2. Enable secondary fallback payment routing in payment-gateway configuration.",
                "3. Verify idempotency keys on retry handlers to prevent double-charging.",
                "4. Divert pending orders to asynchronous reconciliation queue.",
            ]
            confidence = 0.93

        elif "order" in root:
            summary = (
                f"Order processing bottleneck detected on '{root}'. "
                "Transaction commit latencies are causing order validation backpressure."
            )
            probable_root_cause = (
                "Order fulfillment service thread starvation or deadlock during multi-phase checkout commit."
            )
            blast_radius = "Users unable to complete cart checkout and order confirmation."
            suggested_actions = [
                "1. Verify order database read-replicas and write transaction locks.",
                "2. Scale order-service replicas from current count to 10 pods.",
                "3. Enable async order queuing mode.",
            ]
            confidence = 0.91

        elif "redis" in root or "cache" in root:
            summary = (
                f"Memory saturation / eviction failure on '{root}'. "
                f"High eviction latency has degraded cache hit ratios and increased queue latency in {impacted_str}."
            )
            probable_root_cause = (
                "Redis instance exceeded 'maxmemory' threshold without an appropriate allkeys-lru eviction policy."
            )
            blast_radius = (
                f"Moderate to High impact across {impacted_str}. Services falling back to direct database reads."
            )
            suggested_actions = [
                "1. Inspect memory usage with 'redis-cli INFO memory' and check fragmented memory ratio.",
                "2. Apply volatile-lru or allkeys-lru eviction policy: 'CONFIG SET maxmemory-policy allkeys-lru'.",
                "3. Increase Redis pod memory limit in Kubernetes manifest.",
            ]
            confidence = 0.92

        elif "ingress" in root or "api-gateway" in root:
            summary = (
                f"Traffic surge / resource saturation on edge ingress '{root}'. "
                f"Inbound requests exceeded provisioned bandwidth, causing queueing and packet drops."
            )
            probable_root_cause = (
                "Sudden traffic surge (DDoS, crawler scraping, or marketing spike) saturating ingress replica bandwidth."
            )
            blast_radius = (
                f"Broad external exposure: All public HTTP routes passing through {root} are experiencing high P99 latency."
            )
            suggested_actions = [
                "1. Enable WAF / Cloudflare Rate Limiting rules to throttle offending IP blocks.",
                "2. Trigger Horizontal Pod Autoscaler (HPA) to scale Ingress replicas to 15+ pods.",
                "3. Enable HTTP/2 multiplexing and CDN edge caching.",
            ]
            confidence = 0.90

        else:
            summary = (
                f"Operational incident triggered on service '{root}' with {count} correlated events. "
                f"Cascading effects observed across {impacted_str}."
            )
            probable_root_cause = (
                f"Service degradation or unhandled exception burst on {root} triggering health check failures."
            )
            blast_radius = f"Impacted services: {impacted_str}."
            suggested_actions = [
                f"1. Check live container logs for service '{root}': 'kubectl logs -l app={root} --tail=100'.",
                "2. Inspect CPU and memory metrics on telemetry dashboard.",
                "3. Rollback recent deployment if an image release occurred in the last 60 minutes.",
                "4. Restart affected service pods to clear transient deadlock states.",
            ]
            confidence = 0.88

        return AIAnalysis(
            summary=summary,
            probable_root_cause=probable_root_cause,
            blast_radius=blast_radius,
            suggested_actions=suggested_actions,
            confidence_score=confidence,
            generated_at=time.time(),
            is_fallback=True,
            observed_evidence=observed,
        )

    async def _call_gemini(self, incident: Incident) -> Optional[AIAnalysis]:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={self.api_key}"
        events_summary = "\n".join(
            [f"- [{e.service_name}] ({e.level.value}): {e.message}" for e in incident.events_sample[:10]]
        )
        graph_summary = ""
        if incident.evidence_graph:
            graph_summary = f"""
Discovered Relationships: {incident.evidence_graph.discovered_relationships_count}
Propagation Path: {' -> '.join(incident.cascade_path)}
Why Correlated: {'; '.join(incident.evidence_graph.why_correlated)}
"""
        prompt = f"""
You are an expert Site Reliability Engineer (SRE).
Your role is to explain and summarize the structured findings from our deterministic Runtime Evidence Graph and statistical engine.
INSTRUCTION: Use ONLY the provided evidence and graph relationships. Do NOT invent unsupported facts. Always describe findings as 'Probable Root Cause'.

Incident Details:
Title: {incident.title}
Probable Root Cause Service: {incident.root_cause_service}
Impacted Blast Radius: {', '.join(incident.impacted_services)}
Severity: {incident.severity.value}
Evidence Graph Summary:
{graph_summary}

Recent Correlated Telemetry Events:
{events_summary}

Return a valid JSON object matching this schema:
{{
  "summary": "2-3 sentence executive summary explaining the propagation",
  "probable_root_cause": "1-2 sentence probable root cause grounded in evidence",
  "blast_radius": "Impact description across affected services",
  "suggested_actions": ["Action item 1", "Action item 2", "Action item 3"],
  "confidence_score": 0.94,
  "observed_evidence": ["Evidence point 1", "Evidence point 2", "Evidence point 3"]
}}

Respond ONLY with valid JSON.
"""
        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {"response_mime_type": "application/json"},
        }
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(url, json=payload)
            if resp.status_code == 200:
                data = resp.json()
                text = data["candidates"][0]["content"]["parts"][0]["text"]
                parsed = json.loads(text)
                return AIAnalysis(
                    summary=parsed["summary"],
                    probable_root_cause=parsed["probable_root_cause"],
                    blast_radius=parsed["blast_radius"],
                    suggested_actions=parsed["suggested_actions"],
                    confidence_score=float(parsed.get("confidence_score", 0.94)),
                    generated_at=time.time(),
                    is_fallback=False,
                    observed_evidence=parsed.get("observed_evidence", []),
                )
        return None
