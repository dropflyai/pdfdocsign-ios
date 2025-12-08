#!/bin/bash

# iOS Field Detection Automated Test
# This script tests field detection in the iOS simulator and captures console logs

SIMULATOR_ID="523A8F96-B0A3-42AC-8DC9-B2CBB1E145B0"
BUNDLE_ID="com.dropfly.pdfeditor"
PROJECT_DIR="/Users/rioallen/Documents/DropFly-OS-App-Builder/DropFly-PROJECTS/pdf-editor"
LOG_FILE="$PROJECT_DIR/ios-field-detection-test.log"

echo "=== iOS Field Detection Automated Test ==="
echo "Starting at $(date)"
echo ""

# Kill any existing log captures
pkill -f "log stream.*$BUNDLE_ID" 2>/dev/null

# Start capturing console logs in background
echo "Starting console log capture..."
xcrun simctl spawn "$SIMULATOR_ID" log stream --process "$BUNDLE_ID" --level debug 2>&1 > "$LOG_FILE" &
LOG_PID=$!
echo "Log capture PID: $LOG_PID"

# Wait a moment for logger to start
sleep 2

# Launch the app
echo "Launching app..."
xcrun simctl launch "$SIMULATOR_ID" "$BUNDLE_ID" 2>&1 | head -5

# Wait for app to fully load
sleep 5

# Trigger file picker with test PDF using AppleScript to automate UI
echo "Attempting to load test PDF..."
echo "(You may need to manually upload a PDF in the simulator)"

# Wait for potential PDF loading
echo "Waiting 30 seconds for PDF interaction..."
echo "Please upload a PDF in the simulator NOW"
sleep 30

# Stop log capture
echo "Stopping log capture..."
kill $LOG_PID 2>/dev/null

# Analyze logs
echo ""
echo "=== ANALYZING LOGS ==="
echo ""

echo "1. Checking if field extraction started:"
grep -i "STARTING FORM FIELD EXTRACTION" "$LOG_FILE" && echo "   ✓ Extraction started" || echo "   ✗ No extraction attempt detected"

echo ""
echo "2. Checking for PDF load:"
grep -i "PDF loaded, size:" "$LOG_FILE" && echo "   ✓ PDF loaded" || echo "   ✗ PDF not loaded"

echo ""
echo "3. Checking for fields found:"
grep -i "Total fields found:" "$LOG_FILE" | head -1

echo ""
echo "4. Checking for errors:"
echo "   JavaScript errors:"
grep -E "(Error|error|exception|Exception)" "$LOG_FILE" | head -5

echo ""
echo "5. All relevant console logs:"
grep -E "(console\.log|console\.error|console\.warn)" "$LOG_FILE" | grep -E "(field|Field|PDF|form|Form|annotation)" | head -20

echo ""
echo "=== FULL LOG FILE ==="
echo "View complete logs: cat $LOG_FILE"
echo ""
echo "Test completed at $(date)"
