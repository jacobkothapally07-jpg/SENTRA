import os
import asyncio
import time
from pathlib import Path
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from routes import router
from state import engine


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Auto-start simulator at 4 events/sec on startup
    engine.simulator.start(eps=4.0)
    # Background periodic task to stream stats and heartbeat
    heartbeat_task = asyncio.create_task(stats_broadcast_loop())
    yield
    engine.simulator.stop()
    heartbeat_task.cancel()


app = FastAPI(
    title="Sentra - Real-Time Intelligent Incident Detection & Response Engine",
    description="Production-ready real-time incident detection, anomaly detection, cascading failure correlation, and AI response platform.",
    version="1.0.0",
    lifespan=lifespan,
)

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount REST API
app.include_router(router, prefix="/api")


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """Real-time bi-directional streaming endpoint for the dashboard."""
    await engine.ws_manager.connect(websocket)
    try:
        # Send initial snapshot upon connection
        await websocket.send_json({
            "type": "INITIAL_SNAPSHOT",
            "incidents": [i.dict() for i in engine.incidents.values()],
            "services": [s.dict() for s in engine.services.values()],
            "stats": engine.get_system_stats(),
        })

        while True:
            # Keep socket open and accept incoming ping/commands
            data = await websocket.receive_text()
    except WebSocketDisconnect:
        engine.ws_manager.disconnect(websocket)
    except Exception:
        engine.ws_manager.disconnect(websocket)


async def stats_broadcast_loop():
    """Broadcasts 1-second interval health and telemetry snapshots to connected dashboards."""
    while True:
        try:
            await asyncio.sleep(1.0)
            if engine.ws_manager.active_connections:
                await engine.ws_manager.broadcast({
                    "type": "TELEMETRY_SNAPSHOT",
                    "stats": engine.get_system_stats(),
                    "services": [s.dict() for s in engine.services.values()],
                    "timestamp": time.time(),
                })
        except asyncio.CancelledError:
            break
        except Exception as e:
            await asyncio.sleep(1.0)


# Single-Website Static Mounting: Serve compiled React Naval Cream Frontend
frontend_dist = Path(__file__).resolve().parent.parent / "frontend" / "dist"

if frontend_dist.exists():
    # Mount assets folder
    assets_dir = frontend_dist / "assets"
    if assets_dir.exists():
        app.mount("/assets", StaticFiles(directory=str(assets_dir)), name="assets")

    # Root route serves index.html
    @app.get("/")
    async def serve_root():
        index_file = frontend_dist / "index.html"
        if index_file.exists():
            return FileResponse(str(index_file))
        return {"message": "Sentra API running. Frontend building..."}

    # Catch-all route for client-side SPA navigation
    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        # Ignore API/Docs/WS routes
        if full_path.startswith("api") or full_path.startswith("ws") or full_path.startswith("docs") or full_path.startswith("openapi.json"):
            raise HTTPException(status_code=404, detail="Not found")
        
        # Check if direct file exists (e.g. favicon.svg)
        target_file = frontend_dist / full_path
        if target_file.is_file():
            return FileResponse(str(target_file))

        # Fallback to SPA index.html
        index_file = frontend_dist / "index.html"
        if index_file.exists():
            return FileResponse(str(index_file))
        return {"message": "Sentra API running."}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
