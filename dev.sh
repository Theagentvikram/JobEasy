#!/usr/bin/env bash
# ============================================================
# JobEasy Dev Runner
# Starts 2 services: New-ui frontend + JobEasy backend (with AutoApply built-in)
# ============================================================

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
NEWUI_DIR="$ROOT_DIR/New-ui"
BACKEND_DIR="$ROOT_DIR/backend"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

PIDS=()

cleanup() {
    echo ""
    echo -e "${YELLOW}Shutting down all services...${NC}"
    for pid in "${PIDS[@]}"; do
        kill "$pid" 2>/dev/null
    done
    sleep 1
    for pid in "${PIDS[@]}"; do
        kill -9 "$pid" 2>/dev/null
    done
    echo -e "${GREEN}All services stopped.${NC}"
}

trap cleanup SIGINT SIGTERM
trap 'cleanup; exit' EXIT

echo -e "${CYAN}Starting services...${NC}"

# Frontend
echo -e "${GREEN}▶ New-ui frontend → :5173${NC}"
(cd "$NEWUI_DIR" && VITE_API_URL=http://localhost:8000 npx vite --port 5173 --host 2>&1 | sed "s/^/[frontend] /") &
PIDS+=($!)

# Backend (with AutoApply integrated)
echo -e "${GREEN}▶ JobEasy backend (+ AutoApply) → :8000${NC}"
(cd "$BACKEND_DIR" && source venv/bin/activate && python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload 2>&1 | sed "s/^/[backend]  /") &
PIDS+=($!)

echo ""
echo -e "${CYAN}╔══════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║           ${GREEN}JobEasy Dev Environment${CYAN}               ║${NC}"
echo -e "${CYAN}╠══════════════════════════════════════════════════╣${NC}"
echo -e "${CYAN}║${NC}  Frontend:  ${GREEN}http://localhost:5173${NC}               ${CYAN}║${NC}"
echo -e "${CYAN}║${NC}  Backend:   ${GREEN}http://localhost:8000${NC}               ${CYAN}║${NC}"
echo -e "${CYAN}║${NC}  API Docs:  ${GREEN}http://localhost:8000/docs${NC}          ${CYAN}║${NC}"
echo -e "${CYAN}╠══════════════════════════════════════════════════╣${NC}"
echo -e "${CYAN}║${NC}  AutoApply is built into the backend             ${CYAN}║${NC}"
echo -e "${CYAN}║${NC}  Press ${RED}Ctrl+C${NC} to stop all services             ${CYAN}║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════════════╝${NC}"
echo ""

while true; do
    sleep 1
done
