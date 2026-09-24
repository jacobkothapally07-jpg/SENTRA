#!/bin/bash
set -e

# ==============================================================================
# 🌐 Sentra Public Website Deployment & Instant Live URL Tool
# Team: 1234FORGE | HackForge 2026
# ==============================================================================

CLR_RESET="\033[0m"
CLR_BOLD="\033[1m"
CLR_NAVY="\033[38;2;24;59;99m"
CLR_GREEN="\033[38;2;57;116;90m"
CLR_AMBER="\033[38;2;180;122;50m"
CLR_BLUE="\033[38;2;53;111;168m"

echo ""
echo -e "${CLR_BOLD}${CLR_NAVY}==============================================================================${CLR_RESET}"
echo -e "${CLR_BOLD}${CLR_NAVY}             SENTRA • PUBLIC LIVE WEBSITE DEPLOYMENT OPTIONS                 ${CLR_RESET}"
echo -e "${CLR_BOLD}${CLR_NAVY}==============================================================================${CLR_RESET}"
echo ""

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_ROOT"

# Ensure backend and frontend build exist
echo -e "${CLR_BOLD}📦 [1/2] Building production frontend bundle...${CLR_RESET}"
cd "$PROJECT_ROOT/frontend"
npm run build --silent
cd "$PROJECT_ROOT"
echo -e "  ${CLR_GREEN}✓${CLR_RESET} Frontend compiled into /frontend/dist."

# Ensure backend virtualenv is set up
echo -e "${CLR_BOLD}📦 [2/2] Checking Python backend environment...${CLR_RESET}"
cd "$PROJECT_ROOT/backend"
if [ ! -d "venv" ]; then
    python3 -m venv venv
    venv/bin/pip install -q -r requirements.txt
fi
cd "$PROJECT_ROOT"
echo -e "  ${CLR_GREEN}✓${CLR_RESET} Backend ready."

echo ""
echo -e "${CLR_BOLD}Choose your deployment method:${CLR_RESET}"
echo -e "  ${CLR_BOLD}1)${CLR_RESET} ${CLR_GREEN}Instant Public HTTPS URL (via LocalTunnel)${CLR_RESET} - Zero signup, live in 5 seconds"
echo -e "  ${CLR_BOLD}2)${CLR_RESET} ${CLR_BLUE}Deploy to Cloud Platforms (Render / Railway / Fly.io / Docker)${CLR_RESET}"
echo ""

read -p "Enter selection [1 or 2, default 1]: " choice
choice=${choice:-1}

if [ "$choice" = "1" ]; then
    echo ""
    echo -e "${CLR_BOLD}🚀 Launching Sentra Unified Engine on port 8000...${CLR_RESET}"
    
    # Start backend in background serving API + Frontend static SPA
    cd "$PROJECT_ROOT/backend"
    PYTHONPATH="$PROJECT_ROOT/backend" venv/bin/uvicorn main:app --host 0.0.0.0 --port 8000 > /dev/null 2>&1 &
    SERVER_PID=$!
    cd "$PROJECT_ROOT"
    
    cleanup() {
        echo ""
        echo -e "${CLR_AMBER}🛑 Stopping Sentra services...${CLR_RESET}"
        kill $SERVER_PID 2>/dev/null || true
        kill $(jobs -p) 2>/dev/null || true
        exit 0
    }
    trap cleanup SIGINT SIGTERM EXIT
    
    echo -e "  ${CLR_GREEN}✓${CLR_RESET} Sentra Unified Server running (PID: $SERVER_PID)"
    echo ""
    echo -e "${CLR_BOLD}🌐 Creating public HTTPS tunnel...${CLR_RESET}"
    echo -e "${CLR_AMBER}Note: When opening the LocalTunnel URL, click 'Click to Continue' to view the site.${CLR_RESET}"
    echo ""
    
    # Run npx localtunnel
    npx localtunnel --port 8000
    
else
    echo ""
    echo -e "${CLR_BOLD}${CLR_NAVY}==============================================================================${CLR_RESET}"
    echo -e "${CLR_BOLD}☁️  PERMANENT CLOUD DEPLOYMENT GUIDE (100% Free)${CLR_RESET}"
    echo -e "${CLR_BOLD}${CLR_NAVY}==============================================================================${CLR_RESET}"
    echo ""
    echo -e "${CLR_BOLD}Option A: Deploy to Render (Recommended - Free Web Service)${CLR_RESET}"
    echo -e "  1. Push this repository to GitHub: ${CLR_BLUE}git push origin main${CLR_RESET}"
    echo -e "  2. Go to ${CLR_BLUE}https://dashboard.render.com${CLR_RESET} -> Click 'New' -> 'Web Service'"
    echo -e "  3. Connect your repo. Render will automatically detect ${CLR_BOLD}Dockerfile${CLR_RESET} or ${CLR_BOLD}render.yaml${CLR_RESET}."
    echo -e "  4. Click 'Deploy Web Service'. Your app will be live at: ${CLR_GREEN}https://sentra-xxxx.onrender.com${CLR_RESET}"
    echo ""
    echo -e "${CLR_BOLD}Option B: Deploy to Railway (1-Click Free Deployment)${CLR_RESET}"
    echo -e "  1. Go to ${CLR_BLUE}https://railway.app${CLR_RESET} -> Click 'New Project' -> 'Deploy from GitHub repo'"
    echo -e "  2. Select your repository. Railway will auto-build the Dockerfile."
    echo -e "  3. Click 'Generate Domain' in settings to get your public HTTPS URL."
    echo ""
    echo -e "${CLR_BOLD}Option C: Run with Docker locally or on any VPS / Cloud Server${CLR_RESET}"
    echo -e "  ${CLR_BOLD}docker build -t sentra .${CLR_RESET}"
    echo -e "  ${CLR_BOLD}docker run -p 8000:8000 sentra${CLR_RESET}"
    echo ""
fi
