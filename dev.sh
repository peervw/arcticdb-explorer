#!/bin/bash

# Cleanup function to kill child processes
cleanup() {
    echo ""
    echo "Shutting down ArcticDB Explorer..."
    if [ -n "$BACKEND_PID" ]; then
        kill $BACKEND_PID 2>/dev/null
    fi
    if [ -n "$FRONTEND_PID" ]; then
        kill $FRONTEND_PID 2>/dev/null
    fi
    exit
}

# Trap SIGINT (Ctrl+C)
trap cleanup SIGINT

echo "Starting ArcticDB Explorer in Development Mode..."

# 1. Start Backend
echo "------------------------------------------------"
echo "[Backend] Checking configuration..."
cd backend || exit

if [ ! -d "venv" ]; then
    echo "[Backend] Creating virtual environment..."
    python3 -m venv venv
    source venv/bin/activate
    echo "[Backend] Installing dependencies..."
    pip install -r requirements.txt
else
    source venv/bin/activate
fi

echo "[Backend] Starting server on port 8000..."
# Run uvicorn directly for hot reload support
uvicorn main:app --reload --port 8000 &
BACKEND_PID=$!
cd ..

# 2. Start Frontend
echo "------------------------------------------------"
echo "[Frontend] Checking configuration..."
cd frontend || exit

# Check if .env.local exists, if not create it
    echo "[Frontend] Creating .env.local..."
    echo "NEXT_PUBLIC_API_URL=http://127.0.0.1:8000/api" > .env.local
    echo "API_INTERNAL_URL=http://127.0.0.1:8000/api" >> .env.local

echo "[Frontend] Starting Next.js dev server..."
npm run dev &
FRONTEND_PID=$!
cd ..

echo "------------------------------------------------"
echo "ArcticDB Explorer is running!"
echo "Backend:  http://localhost:8000/api/health"
echo "Frontend: http://localhost:3000"
echo "------------------------------------------------"
echo "Press Ctrl+C to stop all services."

# Wait for processes
wait
