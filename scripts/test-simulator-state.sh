#!/bin/bash

# Test iOS Simulator State
# Verifies layout and PDF loading in the actual running app

SIMULATOR_ID="523A8F96-B0A3-42AC-8DC9-B2CBB1E145B0"
BUNDLE_ID="com.dropfly.pdfeditor"

echo "📱 Testing iOS Simulator App State..."
echo ""

# Check if app is running
APP_PID=$(xcrun simctl spawn "$SIMULATOR_ID" launchctl list | grep "$BUNDLE_ID" | awk '{print $1}')

if [ -z "$APP_PID" ]; then
    echo "❌ App is not running"
    echo "Starting app..."
    xcrun simctl launch "$SIMULATOR_ID" "$BUNDLE_ID"
    sleep 3
    APP_PID=$(xcrun simctl spawn "$SIMULATOR_ID" launchctl list | grep "$BUNDLE_ID" | awk '{print $1}')
fi

echo "✅ App is running (PID: $APP_PID)"
echo ""

# Check deployed bundle version
BUNDLE_PATH=$(xcrun simctl get_app_container "$SIMULATOR_ID" "$BUNDLE_ID" app)
BUNDLE_VERSION=$(defaults read "$BUNDLE_PATH/Info.plist" CFBundleVersion 2>/dev/null || echo "Unknown")
echo "📦 Bundle Version: $BUNDLE_VERSION"
echo "📁 Bundle Path: $BUNDLE_PATH"
echo ""

# Check if Test W9 button exists in deployed HTML
if grep -q "Test W9" "$BUNDLE_PATH/public/index.html" 2>/dev/null; then
    echo "✅ Test W9 button found in deployed HTML"
else
    echo "❌ Test W9 button NOT found in deployed HTML"
fi

# Check if new layout classes exist
if grep -q "flex flex-col h-full" "$BUNDLE_PATH/public/index.html" 2>/dev/null; then
    echo "✅ New layout classes found in deployed HTML"
else
    echo "❌ New layout classes NOT found in deployed HTML"
fi

# Check if overflow-y-auto exists
if grep -q "overflow-y-auto" "$BUNDLE_PATH/public/index.html" 2>/dev/null; then
    echo "✅ overflow-y-auto class found in deployed HTML"
else
    echo "❌ overflow-y-auto class NOT found in deployed HTML"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📸 Please check the simulator visually and verify:"
echo "   1. Can you see the Test W9 button in the header?"
echo "   2. Can you see the full upload area with icons at bottom?"
echo "   3. Is the layout NOT cut off at the bottom?"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
