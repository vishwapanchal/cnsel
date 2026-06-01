#!/bin/bash

echo "========================================"
echo "    Starting GhostMark Servers"
echo "========================================"

# Change to the directory where the script is located
cd "$(dirname "$0")" || exit 1

# Kill all background jobs when this script exits or gets CTRL+C
trap "kill 0" SIGINT SIGTERM EXIT

# Start backend in an auto-restarting background loop
(
  cd backend || exit 1
  while true; do
    echo "[Backend] Starting Python server..."
    # Try python3 first, fallback to python
    if command -v python3 &>/dev/null; then
      python3 main.py
    else
      python main.py
    fi
    echo "[Backend] Crashed! Restarting in 3 seconds..."
    sleep 3
  done
) &

# Start frontend in an auto-restarting background loop
(
  cd frontend || exit 1
  while true; do
    echo "[Frontend] Starting Vite/React server..."
    npm run dev
    echo "[Frontend] Crashed! Restarting in 3 seconds..."
    sleep 3
  done
) &

echo ""
echo "Servers are booting up in the background!"
echo "👉 Local Frontend: http://localhost:3000 (check Vite output for exact port)"
echo "👉 Local Backend:  http://localhost:8000"
echo ""
echo "Press CTRL+C at any time to kill both servers and exit."
echo "========================================"

# Wait for both background processes (keeps the script running)
wait
