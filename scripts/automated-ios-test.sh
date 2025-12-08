#!/bin/bash

# Automated iOS Field Detection Test
# This script fully automates the testing process

SIMULATOR_ID="523A8F96-B0A3-42AC-8DC9-B2CBB1E145B0"
BUNDLE_ID="com.dropfly.pdfeditor"
LOG_FILE="/Users/rioallen/Documents/DropFly-OS-App-Builder/DropFly-PROJECTS/pdf-editor/ios-automated-test.log"

echo "=== AUTOMATED iOS FIELD DETECTION TEST ==="
echo "Starting at $(date)"
echo ""

# Kill any existing instances
pkill -f "log stream.*PDF Doc Sign" 2>/dev/null
xcrun simctl terminate "$SIMULATOR_ID" "$BUNDLE_ID" 2>/dev/null

# Start log capture FIRST
echo "1. Starting console log capture..."
xcrun simctl spawn "$SIMULATOR_ID" log stream --process "$BUNDLE_ID" --level debug 2>&1 > "$LOG_FILE" &
LOG_PID=$!
echo "   Log PID: $LOG_PID"
sleep 2

# Launch the app
echo "2. Launching app..."
APP_PID=$(xcrun simctl launch "$SIMULATOR_ID" "$BUNDLE_ID" 2>&1 | grep -oE '[0-9]+' | head -1)
echo "   App PID: $APP_PID"
sleep 3

# Focus simulator window and click Test W9 button using AppleScript
echo "3. Clicking 'Test W9' button via AppleScript..."
osascript <<EOF
tell application "Simulator"
    activate
end tell

delay 1

tell application "System Events"
    tell process "Simulator"
        -- Find the Test W9 button (green button in top right)
        try
            click button "Test W9" of window 1
            return "SUCCESS: Clicked Test W9 button"
        on error errMsg
            -- Try clicking at coordinates (approximate location of button)
            tell window 1
                set windowPosition to position
                set windowSize to size
                -- Button should be in top-right: ~width-80, ~50
                set buttonX to (item 1 of windowPosition) + (item 1 of windowSize) - 80
                set buttonY to (item 2 of windowPosition) + 70
            end tell

            -- Click at calculated position
            do shell script "cliclick c:" & buttonX & "," & buttonY
            return "ATTEMPTED: Clicked at coordinates"
        end try
    end tell
end tell
EOF

echo "   Button click attempted"

# Wait for PDF loading and field detection
echo "4. Waiting 15 seconds for PDF loading and field detection..."
sleep 15

# Stop log capture
echo "5. Stopping log capture..."
kill $LOG_PID 2>/dev/null
sleep 1

# Analyze logs
echo ""
echo "=== LOG ANALYSIS ==="
echo ""

# Check for button click
echo "TEST W9 BUTTON CLICK:"
if grep -q "Test W9 button clicked" "$LOG_FILE"; then
    echo "  ✓ Button was clicked"
    grep "Test W9 button clicked" "$LOG_FILE" | head -1
else
    echo "  ✗ Button click not detected in logs"
fi

echo ""
echo "PDF FETCH:"
if grep -q "Fetch response" "$LOG_FILE"; then
    echo "  ✓ PDF fetch attempted"
    grep "Fetch response" "$LOG_FILE" | head -1
else
    echo "  ✗ PDF fetch not detected"
fi

echo ""
echo "FIELD EXTRACTION:"
if grep -q "STARTING FORM FIELD EXTRACTION" "$LOG_FILE"; then
    echo "  ✓ Field extraction started"
else
    echo "  ✗ Field extraction did NOT start"
fi

if grep -q "Total fields found" "$LOG_FILE"; then
    FIELDS_LINE=$(grep "Total fields found" "$LOG_FILE" | head -1)
    echo "  → $FIELDS_LINE"

    # Extract field count
    FIELD_COUNT=$(echo "$FIELDS_LINE" | grep -oE '[0-9]+' | tail -1)
    if [ "$FIELD_COUNT" -gt 0 ]; then
        echo "  ✓ FIELDS DETECTED: $FIELD_COUNT"
    else
        echo "  ✗ NO FIELDS DETECTED"
    fi
else
    echo "  ✗ Field count not found in logs"
fi

echo ""
echo "ERRORS:"
ERROR_COUNT=$(grep -iE "error|exception|failed" "$LOG_FILE" | grep -v "0 errors" | wc -l | tr -d ' ')
if [ "$ERROR_COUNT" -eq 0 ]; then
    echo "  ✓ No errors detected"
else
    echo "  ✗ Found $ERROR_COUNT error(s):"
    grep -iE "error|exception|failed" "$LOG_FILE" | grep -v "0 errors" | head -5
fi

echo ""
echo "=== SUMMARY ==="
echo ""

# Determine overall result
if grep -q "Total fields found" "$LOG_FILE"; then
    FIELD_COUNT=$(grep "Total fields found" "$LOG_FILE" | head -1 | grep -oE '[0-9]+' | tail -1)

    if [ "$FIELD_COUNT" -gt 0 ]; then
        echo "✓✓✓ TEST PASSED ✓✓✓"
        echo "Field detection is WORKING on iOS"
        echo "Detected $FIELD_COUNT form fields"
    else
        echo "✗✗✗ TEST FAILED ✗✗✗"
        echo "Field detection is NOT working - found 0 fields"
        echo "This is the bug we need to fix"
    fi
else
    echo "✗✗✗ TEST INCONCLUSIVE ✗✗✗"
    echo "Could not determine if field detection ran"
    echo "Check full log: cat $LOG_FILE"
fi

echo ""
echo "Full log file: $LOG_FILE"
echo "Test completed at $(date)"
