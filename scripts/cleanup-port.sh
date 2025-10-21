#!/bin/bash

# Port Cleanup Script for Linux/Mac
# Usage: bash scripts/cleanup-port.sh [port]

PORT="${1:-${PORT:-5001}}"

echo "🔍 Checking for processes using port $PORT..."

# Find processes using the port
PIDS=$(lsof -ti:$PORT 2>/dev/null)

if [ -z "$PIDS" ]; then
    echo "✅ Port $PORT is already free"
    exit 0
fi

# Count processes
PID_COUNT=$(echo "$PIDS" | wc -l)
echo "📋 Found $PID_COUNT process(es) using port $PORT"

# Kill all processes
echo "$PIDS" | while read PID; do
    echo "🔪 Killing process $PID"
    kill -9 $PID 2>/dev/null
done

echo "✅ Port $PORT is now free"
