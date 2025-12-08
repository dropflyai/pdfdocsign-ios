#!/bin/bash

# iOS Simulator Field Detection Test
# Automatically tests the PDF field detection in the iOS app

SIMULATOR_ID="523A8F96-B0A3-42AC-8DC9-B2CBB1E145B0"
BUNDLE_ID="com.dropfly.pdfeditor"

echo "=================================================="
echo "📱 iOS Simulator Field Detection Test"
echo "=================================================="
echo ""

# Step 1: Check if app is running
echo "1️⃣  Checking if app is running..."
APP_RUNNING=$(xcrun simctl listapps "$SIMULATOR_ID" | grep "$BUNDLE_ID" || echo "")

if [ -z "$APP_RUNNING" ]; then
    echo "   ⚠️  App not running, launching..."
    xcrun simctl launch "$SIMULATOR_ID" "$BUNDLE_ID"
    sleep 3
else
    echo "   ✅ App is running"
fi

# Step 2: Wait for app to be ready
echo ""
echo "2️⃣  Waiting for app to initialize..."
sleep 5

# Step 3: Capture logs in background
echo ""
echo "3️⃣  Starting console log capture..."
LOG_FILE="ios-field-detection-$(date +%Y%m%d-%H%M%S).log"

# Start capturing logs
xcrun simctl spawn "$SIMULATOR_ID" log stream --predicate 'eventMessage contains "field" OR eventMessage contains "Field" OR eventMessage contains "annotation" OR eventMessage contains "PDF"' > "$LOG_FILE" 2>&1 &
LOG_PID=$!

echo "   📁 Logging to: $LOG_FILE"
echo "   📊 Log process: $LOG_PID"

# Step 4: Instructions for manual testing
echo ""
echo "=================================================="
echo "📋 MANUAL TESTING INSTRUCTIONS"
echo "=================================================="
echo ""
echo "Please perform the following in the Simulator:"
echo ""
echo "1. Look at the PDF Doc Sign app"
echo "2. Click the green 'Test W9' button in the top right"
echo "3. Wait for the PDF to load"
echo "4. Observe if form fields appear highlighted"
echo ""
echo "⏳ Waiting 60 seconds for you to test..."
echo ""

# Wait for manual testing
sleep 60

# Step 5: Stop log capture
echo ""
echo "4️⃣  Stopping log capture..."
kill $LOG_PID 2>/dev/null
sleep 2

# Step 6: Analyze logs
echo ""
echo "=================================================="
echo "📊 LOG ANALYSIS"
echo "=================================================="
echo ""

# Check for field detection
echo "🔍 Field Detection Logs:"
echo "----------------------------------------"
grep -i "total fields found\|fields to convert\|annotations created" "$LOG_FILE" 2>/dev/null || echo "   No field detection logs found"

echo ""
echo "✅ Success Messages:"
echo "----------------------------------------"
grep "✅" "$LOG_FILE" 2>/dev/null | head -20 || echo "   No success messages found"

echo ""
echo "❌ Error Messages:"
echo "----------------------------------------"
grep -i "error\|fail\|❌" "$LOG_FILE" 2>/dev/null | head -20 || echo "   No errors found"

echo ""
echo "=================================================="
echo "📝 SUMMARY"
echo "=================================================="
echo ""

FIELDS_FOUND=$(grep -i "total fields found:" "$LOG_FILE" 2>/dev/null | tail -1)
ANNOTATIONS=$(grep -i "annotations created:" "$LOG_FILE" 2>/dev/null | tail -1)

if [ ! -z "$FIELDS_FOUND" ]; then
    echo "✅ $FIELDS_FOUND"
else
    echo "❌ NO FIELDS DETECTED"
fi

if [ ! -z "$ANNOTATIONS" ]; then
    echo "✅ $ANNOTATIONS"
else
    echo "⚠️  No annotation data found"
fi

echo ""
echo "📁 Full logs saved to: $LOG_FILE"
echo ""
echo "=================================================="
echo "✅ Test Complete"
echo "=================================================="
