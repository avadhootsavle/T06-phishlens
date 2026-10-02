#!/usr/bin/env bash
# PhishLens Unified Local Orchestrator

echo "🛡️ Starting PhishLens Services..."

# 1. Start Python ScamDNA Service
cd python_service
./venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000 &
PID_PY=$!
cd ..

# 2. Start Express Backend
cd backend
npm run dev &
PID_BACKEND=$!
cd ..

# 3. Start Frontend React PWA
cd frontend
npm run dev &
PID_FRONTEND=$!
cd ..

echo "✅ All PhishLens services launched!"
echo "   - React PWA:      http://localhost:3000"
echo "   - Express API:    http://localhost:5001"
echo "   - Python ScamDNA: http://localhost:8000"
echo "   - Chrome Ext:     chrome_extension/dist (Load unpacked in chrome://extensions)"

trap "kill $PID_PY $PID_BACKEND $PID_FRONTEND" EXIT
wait
