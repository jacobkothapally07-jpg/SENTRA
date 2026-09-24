"""
Sentra Universal Live Stream & URL Data Ingest Connector
Usage:
    python backend/live_url_connector.py "https://api.example.com/live-events"
    python backend/live_url_connector.py --file judges_dataset.json
"""

import sys
import time
import json
import argparse
import requests
from typing import Dict, Any, List

SENTRA_API_URL = "http://localhost:8000/api/events"


def normalize_and_send(raw_item: Dict[str, Any], session: requests.Session) -> bool:
    """Normalizes arbitrary log/metric event and forwards to Sentra."""
    service_name = (
        raw_item.get("service_name")
        or raw_item.get("service")
        or raw_item.get("source")
        or raw_item.get("host")
        or "external-service"
    )
    
    level = str(
        raw_item.get("level")
        or raw_item.get("severity")
        or raw_item.get("status")
        or ("ERROR" if raw_item.get("error") else "INFO")
    ).upper()
    if level in ["WARNING", "WARN"]:
        level = "WARN"
    elif level in ["ERR", "ERROR", "CRIT", "CRITICAL", "FATAL", "500", "502", "503", "504"]:
        level = "CRITICAL" if level in ["CRIT", "CRITICAL", "FATAL"] else "ERROR"
    else:
        level = "INFO"

    message = (
        raw_item.get("message")
        or raw_item.get("log")
        or raw_item.get("msg")
        or raw_item.get("description")
        or f"Event from {service_name}"
    )

    metric_val = (
        raw_item.get("metric_value")
        or raw_item.get("value")
        or raw_item.get("latency")
        or raw_item.get("duration_ms")
        or raw_item.get("cpu")
        or raw_item.get("memory")
    )
    
    metric_name = (
        raw_item.get("metric_name")
        or raw_item.get("metric")
        or ("latency_ms" if "latency" in str(raw_item).lower() else "system_metric")
    )

    payload = {
        "service_name": service_name,
        "level": level,
        "message": message,
        "event_type": "metric" if metric_val is not None else "log",
        "metric_value": float(metric_val) if metric_val is not None and str(metric_val).replace('.', '', 1).isdigit() else None,
        "metric_name": metric_name if metric_val is not None else None,
        "raw_payload": raw_item,
    }

    try:
        resp = session.post(SENTRA_API_URL, json=payload, timeout=3)
        if resp.status_code == 200:
            print(f"  [✓] Forwarded {service_name:<18} | {level:<8} | {message[:50]}")
            return True
        else:
            print(f"  [!] Sentra returned {resp.status_code}: {resp.text}")
            return False
    except requests.exceptions.ConnectionError:
        print("  [✗] Cannot connect to Sentra. Is 'http://localhost:8000' running?")
        return False
    except Exception as e:
        print(f"  [✗] Ingestion error: {e}")
        return False


def stream_from_url(url: str, poll_interval: float = 1.0):
    print(f"\n=======================================================")
    print(f"  🚀 Starting Sentra Live URL Ingestion Bridge")
    print(f"  Source URL : {url}")
    print(f"  Target API : {SENTRA_API_URL}")
    print(f"  Interval   : {poll_interval}s")
    print(f"=======================================================\n")
    session = requests.Session()

    while True:
        try:
            resp = session.get(url, timeout=5)
            if resp.status_code == 200:
                data = resp.json()
                items = data if isinstance(data, list) else [data]
                for item in items:
                    if isinstance(item, dict):
                        normalize_and_send(item, session)
            else:
                print(f"[!] Source URL returned HTTP {resp.status_code}")
        except Exception as e:
            print(f"[!] Poll failed: {e}")
        time.sleep(poll_interval)


def replay_from_file(filepath: str, interval: float = 0.2):
    print(f"\n=======================================================")
    print(f"  📂 Replaying Dataset into Sentra Live Stream")
    print(f"  File       : {filepath}")
    print(f"  Interval   : {interval}s between events")
    print(f"=======================================================\n")
    session = requests.Session()

    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read().strip()
        try:
            items = json.loads(content)
            if not isinstance(items, list):
                items = [items]
        except json.JSONDecodeError:
            # Try JSON Lines
            items = [json.loads(line) for line in content.splitlines() if line.strip()]

    print(f"Loaded {len(items)} events. Streaming now...")
    for idx, item in enumerate(items, 1):
        if isinstance(item, dict):
            normalize_and_send(item, session)
        time.sleep(interval)
    print(f"\n✅ Replay complete ({len(items)} events processed).")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Sentra Live Data Connector")
    parser.add_argument("url", nargs="?", help="Live stream URL to poll")
    parser.add_argument("--file", "-f", help="Replay events from a JSON/JSONL file")
    parser.add_argument("--interval", "-i", type=float, default=1.0, help="Polling/replay interval in seconds")

    args = parser.parse_args()

    if args.file:
        replay_from_file(args.file, args.interval)
    elif args.url:
        stream_from_url(args.url, args.interval)
    else:
        print("Usage:")
        print("  python live_url_connector.py https://api.judges.com/events")
        print("  python live_url_connector.py --file dataset.json")
