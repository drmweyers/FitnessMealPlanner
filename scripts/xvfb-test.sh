#!/bin/sh
# Script to run tests with Xvfb virtual display

echo "Starting Xvfb virtual display..."

# Start Xvfb on display :99
Xvfb :99 -screen 0 1280x1024x24 -nolisten tcp -nolisten unix &
XVFB_PID=$!

# Wait for Xvfb to start
sleep 2

# Export display
export DISPLAY=:99

echo "Xvfb started on display :99"

# Run the test command passed as arguments
echo "Running tests: $@"
$@

# Capture test exit code
TEST_EXIT_CODE=$?

# Kill Xvfb
kill $XVFB_PID 2>/dev/null

echo "Xvfb stopped"

# Return the test exit code
exit $TEST_EXIT_CODE