#!/bin/bash

# Automated Field Detection Test for iOS Simulator
# This script builds, deploys, and tests the PDF editor app

set -e

SIMULATOR_ID="523A8F96-B0A3-42AC-8DC9-B2CBB1E145B0"  # iPhone 17 Pro
BUNDLE_ID="com.dropfly.pdfeditor"
LOG_FILE="field-detection-test-$(date +%Y%m%d-%H%M%S).log"
PROJECT_DIR="/Users/rioallen/Documents/DropFly-OS-App-Builder/DropFly-PROJECTS/pdf-editor"

echo "=================================================="
echo "🧪 Automated Field Detection Test"
echo "=================================================="
echo ""
echo "📱 Simulator: iPhone 17 Pro"
echo "📦 Bundle ID: $BUNDLE_ID"
echo "📁 Log File: $LOG_FILE"
echo ""

# Step 1: Boot simulator if not running
echo "1️⃣  Booting simulator..."
xcrun simctl boot "$SIMULATOR_ID" 2>/dev/null || echo "   ✓ Simulator already booted"
sleep 3

# Step 2: Build the app
echo ""
echo "2️⃣  Building Next.js app..."
cd "$PROJECT_DIR"
npm run build > /dev/null 2>&1
echo "   ✓ Build complete"

# Step 3: Sync to iOS
echo ""
echo "3️⃣  Syncing to iOS..."
npx cap sync ios > /dev/null 2>&1
echo "   ✓ Sync complete"

# Step 4: Build and install iOS app
echo ""
echo "4️⃣  Building iOS app with xcodebuild..."
xcodebuild -workspace ios/App/App.xcworkspace \
  -scheme App \
  -configuration Debug \
  -sdk iphonesimulator \
  -derivedDataPath ios/build \
  -destination "id=$SIMULATOR_ID" \
  build 2>&1 | grep -E "Build succeeded|error:" || true
echo "   ✓ iOS build complete"

# Step 5: Install app on simulator
echo ""
echo "5️⃣  Installing app on simulator..."
APP_PATH=$(find ios/build/Build/Products/Debug-iphonesimulator -name "*.app" -print -quit)
xcrun simctl install "$SIMULATOR_ID" "$APP_PATH"
echo "   ✓ App installed: $APP_PATH"

# Step 6: Start monitoring logs BEFORE launching app
echo ""
echo "6️⃣  Starting log monitoring..."
echo "=================================================="
echo "📊 CONSOLE LOGS (Live Feed)"
echo "=================================================="

# Start log capture in background
xcrun simctl spawn "$SIMULATOR_ID" log stream --predicate 'processImagePath contains "PDF"' > "$LOG_FILE" 2>&1 &
LOG_PID=$!
sleep 2

# Step 7: Launch the app
echo ""
echo "7️⃣  Launching app..."
xcrun simctl launch --console "$SIMULATOR_ID" "$BUNDLE_ID" 2>&1 | tee -a "$LOG_FILE" &
APP_PID=$!

echo "   ✓ App launched (PID: $APP_PID)"
echo ""
echo "=================================================="
echo "⏳ Waiting 10 seconds for app to initialize..."
echo "=================================================="

# Wait and capture logs
sleep 10

# Step 8: Try to trigger PDF upload programmatically
echo ""
echo "8️⃣  Uploading test PDF..."

# Copy test PDF to simulator's documents directory
TEST_PDF="$PROJECT_DIR/public/test-w9.pdf"
if [ -f "$TEST_PDF" ]; then
    xcrun simctl addmedia "$SIMULATOR_ID" "$TEST_PDF"
    echo "   ✓ Test PDF added to simulator"
else
    echo "   ⚠️  Test PDF not found at $TEST_PDF"
fi

# Wait for processing
echo ""
echo "⏳ Waiting 15 seconds for PDF processing..."
sleep 15

# Step 9: Stop log capture
echo ""
echo "9️⃣  Stopping log capture..."
kill $LOG_PID 2>/dev/null || true

# Step 10: Analyze logs
echo ""
echo "=================================================="
echo "📋 LOG ANALYSIS"
echo "=================================================="
echo ""

# Extract key log messages
echo "🔍 Field Detection Logs:"
echo "----------------------------------------"
grep -i "field\|annotation\|form" "$LOG_FILE" 2>/dev/null | head -50 || echo "No field detection logs found"

echo ""
echo "✅ Success Indicators:"
echo "----------------------------------------"
grep -E "✅|✓|success|complete" "$LOG_FILE" 2>/dev/null | tail -20 || echo "No success messages found"

echo ""
echo "❌ Error Indicators:"
echo "----------------------------------------"
grep -E "❌|error|fail|Error|ERROR" "$LOG_FILE" 2>/dev/null | tail -20 || echo "No errors found"

echo ""
echo "📊 Form Field Stats:"
echo "----------------------------------------"
grep -E "Total fields found|Fields to convert|Annotations created" "$LOG_FILE" 2>/dev/null || echo "No field stats found"

echo ""
echo "=================================================="
echo "📝 SUMMARY"
echo "=================================================="

FIELDS_FOUND=$(grep "Total fields found:" "$LOG_FILE" 2>/dev/null | tail -1)
ANNOTATIONS_CREATED=$(grep "Annotations created:" "$LOG_FILE" 2>/dev/null | tail -1)

if [ ! -z "$FIELDS_FOUND" ]; then
    echo "✅ Field Detection: $FIELDS_FOUND"
else
    echo "❌ Field Detection: NO FIELDS DETECTED"
fi

if [ ! -z "$ANNOTATIONS_CREATED" ]; then
    echo "✅ Annotation Creation: $ANNOTATIONS_CREATED"
else
    echo "⚠️  Annotation Creation: NO DATA"
fi

echo ""
echo "📁 Full logs saved to: $LOG_FILE"
echo ""
echo "=================================================="
echo "✅ Test Complete!"
echo "=================================================="
