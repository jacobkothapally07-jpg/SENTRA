#!/bin/bash
set -e

# ==============================================================================
# 🚀 Sentra - Incident Detection & Response Platform Deployment Script
# Team: 1234FORGE | HackForge 2026
# Central Innovation: Runtime Evidence Graph for Adaptive Incident Causality
# Theme: Naval Cream
# ==============================================================================

# ANSI Color Codes
CLR_RESET="\033[0m"
CLR_BOLD="\033[1m"
CLR_NAVY="\033[38;2;24;59;99m"
CLR_GREEN="\033[38;2;57;116;90m"
CLR_AMBER="\033[38;2;180;122;50m"
CLR_RED="\033[38;2;183;53;53m"
CLR_CREAM="\033[38;2;243;238;229m"
CLR_MUTED="\033[38;2;102;112;133m"

echo ""
echo -e "${CLR_BOLD}${CLR_NAVY}==============================================================================${CLR_RESET}"
echo -e "${CLR_BOLD}${CLR_NAVY}              SENTRA • INCIDENT DETECTION & RESPONSE PLATFORM                ${CLR_RESET}"
echo -e "${CLR_MUTED}  Central Innovation: Runtime Evidence Graph for Adaptive Incident Causality  ${CLR_RESET}"
echo -e "${CLR_BOLD}${CLR_NAVY}==============================================================================${CLR_RESET}"
echo ""

# Get absolute script directory
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_ROOT"

# Graceful cleanup handler
cleanup() {
    echo ""
    echo -e "${CLR_AMBER}🛑 Shutting down Sentra background services...${CLR_RESET}"
    kill $(jobs -p) 2>/dev/null || true
    echo -e "${CLR_GREEN}✓ All Sentra processes cleanly terminated.${CLR_RESET}"
    exit 0
}
trap cleanup SIGINT SIGTERM EXIT

# ------------------------------------------------------------------------------
# 1. Environment & Dependency Verification
# ------------------------------------------------------------------------------
echo -e "${CLR_BOLD}[1/5] Checking System Prerequisites...${CLR_RESET}"

if ! command -v python3 &> /dev/null; then
    echo -e "${CLR_RED}❌ Error: Python 3 is required but not installed.${CLR_RESET}"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo -e "${CLR_RED}❌ Error: Node.js / npm is required but not installed.${CLR_RESET}"
    exit 1
fi

echo -e "  ${CLR_GREEN}✓${CLR_RESET} Python: $(python3 --version)"
echo -e "  ${CLR_GREEN}✓${CLR_RESET} Node:   $(node --version)"
echo -e "  ${CLR_GREEN}✓${CLR_RESET} npm:    $(npm --version)"

# ------------------------------------------------------------------------------
# 2. Python Virtual Environment & Backend Setup
# ------------------------------------------------------------------------------
echo ""
echo -e "${CLR_BOLD}[2/5] Initializing Python Backend Environment...${CLR_RESET}"
cd "$PROJECT_ROOT/backend"

if [ ! -d "venv" ]; then
    echo -e "  📦 Creating Python virtual environment in backend/venv..."
    python3 -m venv venv
fi

echo -e "  📦 Installing backend dependencies from requirements.txt..."
venv/bin/pip install -q -r requirements.txt
echo -e "  ${CLR_GREEN}✓${CLR_RESET} Backend dependencies installed."

# ------------------------------------------------------------------------------
# 3. Validation Test Suite (17/17 System Checks)
# ------------------------------------------------------------------------------
echo ""
echo -e "${CLR_BOLD}[3/5] Running Sentra Core Validation Test Suite...${CLR_RESET}"
PYTHONPATH="$PROJECT_ROOT/backend" venv/bin/python test_suite.py
echo -e "  ${CLR_GREEN}✓${CLR_RESET} Test Suite Passed (100% verification rate)."

# ------------------------------------------------------------------------------
# 4. Frontend Compilation & Production Build
# ------------------------------------------------------------------------------
echo ""
echo -e "${CLR_BOLD}[4/5] Building React Frontend with Naval Cream Theme...${CLR_RESET}"
cd "$PROJECT_ROOT/frontend"

if [ ! -d "node_modules" ]; then
    echo -e "  📦 Installing frontend dependencies via npm..."
    npm install --silent
fi

echo -e "  🔨 Compiling production bundle (Vite + TypeScript)..."
npm run build --silent
echo -e "  ${CLR_GREEN}✓${CLR_RESET} Frontend build complete."

# ------------------------------------------------------------------------------
# 5. Launching Production Daemons
# ------------------------------------------------------------------------------
echo ""
echo -e "${CLR_BOLD}[5/5] Launching Sentra Live Services...${CLR_RESET}"

# Start Backend
cd "$PROJECT_ROOT/backend"
PYTHONPATH="$PROJECT_ROOT/backend" venv/bin/uvicorn main:app --host 0.0.0.0 --port 8000 > /dev/null 2>&1 &
BACKEND_PID=$!
echo -e "  🚀 FastAPI REST + WebSocket Engine started on ${CLR_BOLD}http://0.0.0.0:8000${CLR_RESET} (PID: $BACKEND_PID)"

# Start Frontend Dev Server for HMR / Live interactions
cd "$PROJECT_ROOT/frontend"
npm run dev -- --host 0.0.0.0 --port 5173 > /dev/null 2>&1 &
FRONTEND_PID=$!
echo -e "  🎨 Naval Cream Dashboard UI started on ${CLR_BOLD}http://localhost:5173${CLR_RESET} (PID: $FRONTEND_PID)"

# ------------------------------------------------------------------------------
# Operational Ready Summary
# ------------------------------------------------------------------------------
echo ""
echo -e "${CLR_BOLD}${CLR_GREEN}==============================================================================${CLR_RESET}"
echo -e "${CLR_BOLD}${CLR_GREEN}  🎉 SENTRA IS OFFICIALLY DEPLOYED & OPERATIONAL!                             ${CLR_RESET}"
echo -e "${CLR_BOLD}${CLR_GREEN}==============================================================================${CLR_RESET}"
echo ""
echo -e "  👉 ${CLR_BOLD}Dashboard (Naval Cream UI):${CLR_RESET}  http://localhost:5173"
echo -e "  👉 ${CLR_BOLD}Unified API / SPA Endpoint:${CLR_RESET}   http://localhost:8000"
echo -e "  👉 ${CLR_BOLD}Interactive OpenAPI Docs:${CLR_RESET}     http://localhost:8000/docs"
echo -e "  👉 ${CLR_BOLD}Real-Time WebSocket Stream:${CLR_RESET}   ws://localhost:8000/ws"
echo ""
echo -e "  ${CLR_MUTED}Press Ctrl+C at any time to gracefully stop all services.${CLR_RESET}"
echo ""

# Keep script running to maintain child processes
wait
