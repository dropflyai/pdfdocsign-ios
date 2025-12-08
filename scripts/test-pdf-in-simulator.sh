#!/bin/bash

# Test PDF Loading in iOS Simulator
# This script copies a PDF to the simulator and monitors logs

SIMULATOR_ID="523A8F96-B0A3-42AC-8DC9-B2CBB1E145B0"
BUNDLE_ID="com.dropfly.pdfeditor"
PDF_PATH="/Users/rioallen/Downloads/fw9.pdf"

echo "📱 Testing PDF loading in iOS Simulator..."
echo ""

# Check if PDF exists
if [ ! -f "$PDF_PATH" ]; then
    echo "❌ PDF not found at: $PDF_PATH"
    exit 1
fi

echo "✅ Found PDF: $PDF_PATH"
echo ""

# Copy PDF to simulator's Downloads folder
echo "📂 Copying PDF to simulator..."
xcrun simctl addmedia "$SIMULATOR_ID" "$PDF_PATH"
echo "✅ PDF copied to simulator"
echo ""

echo "📋 Monitoring app logs..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🔍 Look for these log messages:"
echo "   📄 File selected"
echo "   🔄 Reading file as ArrayBuffer"
echo "   ✅ ArrayBuffer read successfully"
echo "   ✅ PDF loaded successfully"
echo ""
echo "Or error messages like:"
echo "   ❌ Error processing PDF file"
echo "   ❌ PDF load error"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Press Ctrl+C to stop monitoring"
echo ""

# Monitor console logs from the app
xcrun simctl spawn "$SIMULATOR_ID" log stream --predicate 'process == "App" OR process == "com.dropfly.pdfeditor"' --level debug
