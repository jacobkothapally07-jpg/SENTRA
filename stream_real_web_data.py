#!/usr/bin/env python3
"""
Zero-Dependency Real-Time Live Web Data Ingestion Streamer for Sentra.
Bypasses macOS local SSL certificate missing bundle using unverified context.
Pulls real-time live events from GitHub Global Activity and streams to Sentra Cloud.
"""

import time
import random
import json
import ssl
import urllib.request
import urllib.error

SENTRA_CLOUD_URL = "https://sentra-wipc.onrender.com/api/events"
GITHUB_EVENTS_API = "https://api.github.com/events"

# Create SSL context to handle macOS default missing CA certs
ssl_ctx = ssl.create_default_context()
ssl_ctx.check_hostname = False
ssl_ctx.verify_mode = ssl.CERT_NONE


def post_to_sentra(payload: dict) -> bool:
    """Sends JSON event to Sentra using standard library urllib with unverified SSL."""
    data_bytes = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        SENTRA_CLOUD_URL,
        data=data_bytes,
        headers={"Content-Type": "application/json", "User-Agent": "Sentra-Streamer/1.0"},
        method="POST"
    )
    try:
        with urllib.request.urlopen(req, timeout=5, context=ssl_ctx) as response:
            return response.status == 200
    except Exception as e:
        return False


def fetch_github_events() -> list:
    """Fetches real-time public events from GitHub API."""
    req = urllib.request.Request(
        GITHUB_EVENTS_API,
        headers={"User-Agent": "Sentra-Realtime-Monitor/1.0"}
    )
    try:
        with urllib.request.urlopen(req, timeout=6, context=ssl_ctx) as response:
            if response.status == 200:
                content = response.read().decode("utf-8")
                return json.loads(content)
    except urllib.error.HTTPError as e:
        if e.code == 403:
            print("  ⚠️ GitHub rate limit reached. Backing off for 10s...")
            time.sleep(10)
        else:
            print(f"  ⚠️ GitHub API HTTP {e.code}")
    except Exception as e:
        print(f"  ❌ Fetch error: {e}")
    return []


def run_streamer():
    print("=" * 72)
    print("  🌐 SENTRA REAL-TIME LIVE WEB STREAMER (ACTIVE)")
    print(f"  📡 Target Cloud : {SENTRA_CLOUD_URL}")
    print(f"  🌍 Data Source  : {GITHUB_EVENTS_API}")
    print("=" * 72)

    seen_ids = set()

    while True:
        print("\n📡 Fetching latest real-time events from GitHub Global Stream...")
        events = fetch_github_events()
        new_events = 0

        for evt in events:
            evt_id = evt.get("id")
            if evt_id in seen_ids:
                continue
            seen_ids.add(evt_id)
            new_events += 1

            # Extract real metadata from GitHub live event
            repo_name = evt.get("repo", {}).get("name", "global-repo")
            evt_type = evt.get("type", "PushEvent")
            actor = evt.get("actor", {}).get("login", "developer")

            # Map GitHub event types to microservices & telemetry
            if "Push" in evt_type:
                service = "api-gateway"
                level = "INFO"
                msg = f"Live Git Push by @{actor} to {repo_name}"
                latency = random.uniform(20.0, 95.0)
            elif "Issues" in evt_type or "IssueComment" in evt_type:
                service = "order-service"
                level = "WARN" if random.random() > 0.4 else "INFO"
                msg = f"Issue activity on {repo_name} by @{actor}"
                latency = random.uniform(80.0, 240.0)
            elif "PullRequest" in evt_type:
                service = "payment-gateway"
                level = "INFO"
                msg = f"PR merge check triggered for {repo_name}"
                latency = random.uniform(40.0, 110.0)
            elif "Watch" in evt_type or "Fork" in evt_type:
                service = "redis-cache"
                level = "INFO"
                msg = f"Cache invalidation tag update from {repo_name}"
                latency = random.uniform(5.0, 30.0)
            else:
                service = "postgres-db"
                level = "INFO"
                msg = f"Webhook audit record created: {evt_type} on {repo_name}"
                latency = random.uniform(10.0, 50.0)

            # Simulate occasional real-world anomaly trigger
            if random.random() < 0.15:
                level = "CRITICAL"
                service = random.choice(["payment-gateway", "postgres-db", "api-gateway"])
                msg = f"🚨 LATENCY SPIKE ANOMALY: Downstream upstream timeout during {evt_type} on {repo_name}"
                latency = random.uniform(850.0, 2500.0)

            # Construct Sentra telemetry payload
            payload = {
                "service_name": service,
                "level": level,
                "message": msg,
                "event_type": "metric" if latency else "log",
                "metric_value": round(latency, 2),
                "metric_name": "http_request_latency_ms"
            }

            success = post_to_sentra(payload)
            if success:
                status_tag = "🔴 [ANOMALY]" if level == "CRITICAL" else ("🟡 [WARN]" if level == "WARN" else "🟢 [LIVE]")
                print(f"  {status_tag} {service:<16} | {latency:6.1f}ms | {msg[:55]}...")

            time.sleep(0.4)  # Smooth real-time rate

        if new_events == 0:
            print("  ⏳ Waiting for next live batch from GitHub...")

        time.sleep(3)


if __name__ == "__main__":
    run_streamer()
