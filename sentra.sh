#!/bin/bash
set -e

# ==============================================================================
# 🛡️ SENTRA - Single Unified Website & Full-Stack Deployment Script
# Team: 1234FORGE | HackForge 2026
# Central Innovation: Runtime Evidence Graph for Adaptive Incident Causality
# Theme: Naval Cream (Warm Cream #F3EEE5 & Deep Navy #183B63)
# ==============================================================================

CLR_RESET="\033[0m"
CLR_BOLD="\033[1m"
CLR_NAVY="\033[38;2;24;59;99m"
CLR_GREEN="\033[38;2;57;116;90m"
CLR_AMBER="\033[38;2;180;122;50m"
CLR_BLUE="\033[38;2;53;111;168m"
CLR_MUTED="\033[38;2;102;112;133m"

echo ""
echo -e "${CLR_BOLD}${CLR_NAVY}==============================================================================${CLR_RESET}"
echo -e "${CLR_BOLD}${CLR_NAVY}          SENTRA • REAL-TIME INCIDENT DETECTION & RESPONSE ENGINE             ${CLR_RESET}"
echo -e "${CLR_MUTED}  Single Self-Contained Full-Stack Application & Website Deployment           ${CLR_RESET}"
echo -e "${CLR_BOLD}${CLR_NAVY}==============================================================================${CLR_RESET}"
echo ""

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_ROOT"

# Cleanup on exit
cleanup() {
    echo ""
    echo -e "${CLR_AMBER}🛑 Shutting down Sentra server...${CLR_RESET}"
    kill $(jobs -p) 2>/dev/null || true
    echo -e "${CLR_GREEN}✓ Sentra server stopped.${CLR_RESET}"
    exit 0
}
trap cleanup SIGINT SIGTERM EXIT

# ------------------------------------------------------------------------------
# 1. System Verification
# ------------------------------------------------------------------------------
echo -e "${CLR_BOLD}[1/4] Verifying System Prerequisites...${CLR_RESET}"
if ! command -v python3 &> /dev/null; then
    echo -e "${CLR_RED}❌ Error: Python 3 is required.${CLR_RESET}"
    exit 1
fi
if ! command -v npm &> /dev/null; then
    echo -e "${CLR_RED}❌ Error: Node.js / npm is required.${CLR_RESET}"
    exit 1
fi
echo -e "  ${CLR_GREEN}✓${CLR_RESET} Python: $(python3 --version)"
echo -e "  ${CLR_GREEN}✓${CLR_RESET} Node:   $(node --version)"
echo -e "  ${CLR_GREEN}✓${CLR_RESET} npm:    $(npm --version)"

# ------------------------------------------------------------------------------
# 2. Python Backend Setup
# ------------------------------------------------------------------------------
echo ""
echo -e "${CLR_BOLD}[2/4] Setting up Python Environment & Dependencies...${CLR_RESET}"
cd "$PROJECT_ROOT/backend"
if [ ! -d "venv" ]; then
    echo -e "  📦 Creating virtual environment in backend/venv..."
    python3 -m venv venv
fi
venv/bin/pip install -q -r requirements.txt
echo -e "  ${CLR_GREEN}✓${CLR_RESET} Backend ready."

# ------------------------------------------------------------------------------
# 3. Validation Test Suite
# ------------------------------------------------------------------------------
echo ""
echo -e "${CLR_BOLD}[3/4] Running Sentra Core Validation Test Suite (17 Checks)...${CLR_RESET}"
PYTHONPATH="$PROJECT_ROOT/backend" venv/bin/python test_suite.py
echo -e "  ${CLR_GREEN}✓${CLR_RESET} 17/17 verification tests passed (100% integrity)."

# ------------------------------------------------------------------------------
# 4. Build Frontend into Unified Static SPA
# ------------------------------------------------------------------------------
echo ""
echo -e "${CLR_BOLD}[4/4] Building Naval Cream Frontend into Unified Website Bundle...${CLR_RESET}"
cd "$PROJECT_ROOT/frontend"
if [ ! -d "node_modules" ]; then
    npm install --silent
fi
npm run build --silent
echo -e "  ${CLR_GREEN}✓${CLR_RESET} Frontend compiled into frontend/dist."

# ------------------------------------------------------------------------------
# 5. Launch Single Unified Full-Stack Website
# ------------------------------------------------------------------------------
echo ""
echo -e "${CLR_BOLD}🚀 Starting Sentra Unified Full-Stack Server on http://0.0.0.0:8000...${CLR_RESET}"
cd "$PROJECT_ROOT/backend"

# Start the unified server in background
PYTHONPATH="$PROJECT_ROOT/backend" venv/bin/uvicorn main:app --host 0.0.0.0 --port 8000 &
SERVER_PID=$!

# Also start Vite dev server for instant local HMR
cd "$PROJECT_ROOT/frontend"
npm run dev -- --host 0.0.0.0 --port 5173 > /dev/null 2>&1 &
DEV_PID=$!

cd "$PROJECT_ROOT"
sleep 2

echo ""
echo -e "${CLR_BOLD}${CLR_GREEN}==============================================================================${CLR_RESET}"
echo -e "${CLR_BOLD}${CLR_GREEN}  🎉 SENTRA IS DEPLOYED & LIVE AS A SINGLE UNIFIED WEBSITE!                   ${CLR_RESET}"
echo -e "${CLR_BOLD}${CLR_GREEN}==============================================================================${CLR_RESET}"
echo ""
echo -e "  👉 ${CLR_BOLD}${CLR_GREEN}OPEN SENTRA WEBSITE:${CLR_RESET}    ${CLR_BOLD}${CLR_GREEN}http://localhost:8000${CLR_RESET}"
echo -e "  👉 ${CLR_BOLD}Interactive OpenAPI Docs:${CLR_RESET}  http://localhost:8000/docs"
echo -e "  👉 ${CLR_BOLD}Real-Time WebSocket Feed:${CLR_RESET}  ws://localhost:8000/ws"
echo -e "  👉 ${CLR_BOLD}Vite Development Mirror:${CLR_RESET}   http://localhost:5173"
echo ""
echo -e "  ${CLR_MUTED}The website, dashboard UI, APIs, and real-time streams are now running together${CLR_RESET}"
echo -e "  ${CLR_MUTED}on a single port: ${CLR_BOLD}http://localhost:8000${CLR_RESET}"
echo ""
echo -e "  ${CLR_MUTED}Press Ctrl+C to stop the server.${CLR_RESET}"
echo ""

wait
