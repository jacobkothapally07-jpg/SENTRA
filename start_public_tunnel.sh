#!/bin/bash
set -e

# ==============================================================================
# 🌐 Sentra Instant Public Website Tunnel
# ==============================================================================

CLR_RESET="\033[0m"
CLR_BOLD="\033[1m"
CLR_NAVY="\033[38;2;24;59;99m"
CLR_GREEN="\033[38;2;57;116;90m"
CLR_AMBER="\033[38;2;180;122;50m"
CLR_BLUE="\033[38;2;53;111;168m"

echo ""
echo -e "${CLR_BOLD}${CLR_NAVY}==============================================================================${CLR_RESET}"
echo -e "${CLR_BOLD}${CLR_NAVY}           🚀 SENTRA • INSTANT PUBLIC HTTPS WEBSITE LAUNCHER                 ${CLR_RESET}"
echo -e "${CLR_BOLD}${CLR_NAVY}==============================================================================${CLR_RESET}"
echo ""

# Get Tunnel Password (IP address)
TUNNEL_PASSWORD=$(curl -s https://loca.lt/mytunnelpassword || curl -s https://ipv4.icanhazip.com || echo "Check your public IP")

echo -e "  🔑 ${CLR_BOLD}Tunnel Access Password:${CLR_RESET} ${CLR_GREEN}${CLR_BOLD}${TUNNEL_PASSWORD}${CLR_RESET}"
echo -e "  ${CLR_AMBER}(When you first open the URL, paste this password into the box and click 'Submit')${CLR_RESET}"
echo ""
echo -e "  🌐 ${CLR_BOLD}Connecting to public network...${CLR_RESET}"
echo ""

# Run LocalTunnel on port 5173 (Naval Cream Dashboard + WebSocket proxy)
npx --yes localtunnel --port 5173
