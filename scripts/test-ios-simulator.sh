#!/bin/bash

# iOS Simulator Testing Script
# This script builds and tests the iOS app in the simulator

set -e

echo "🚀 Starting iOS Simulator Test..."

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
SIMULATOR_NAME="iPhone 17 Pro"
SIMULATOR_ID="523A8F96-B0A3-42AC-8DC9-B2CBB1E145B0"

echo "📱 Using simulator: $SIMULATOR_NAME"

# Step 1: Build Next.js
echo -e "${YELLOW}📦 Building Next.js app...${NC}"
npm run build
echo -e "${GREEN}✅ Next.js build complete${NC}"

# Step 2: Sync Capacitor
echo -e "${YELLOW}🔄 Syncing Capacitor...${NC}"
npx cap sync ios
echo -e "${GREEN}✅ Capacitor sync complete${NC}"

# Step 3: Boot simulator if not running
echo -e "${YELLOW}🔌 Checking simulator status...${NC}"
SIMULATOR_STATE=$(xcrun simctl list devices | grep "$SIMULATOR_ID" | awk -F'[()]' '{print $(NF-1)}')

if [ "$SIMULATOR_STATE" != "Booted" ]; then
    echo "Starting simulator..."
    xcrun simctl boot "$SIMULATOR_ID"
    sleep 5
else
    echo "Simulator already running"
fi

# Step 4: Build and run on simulator
echo -e "${YELLOW}🏗️  Building iOS app...${NC}"
cd ios/App

# Build for simulator
xcodebuild \
    -workspace App.xcworkspace \
    -scheme App \
    -configuration Debug \
    -sdk iphonesimulator \
    -derivedDataPath build \
    -destination "id=$SIMULATOR_ID" \
    build | grep -E "Build Succeeded|error:"

if [ ${PIPESTATUS[0]} -eq 0 ]; then
    echo -e "${GREEN}✅ iOS build successful${NC}"
else
    echo -e "${RED}❌ iOS build failed${NC}"
    exit 1
fi

# Step 5: Install app on simulator
echo -e "${YELLOW}📲 Installing app on simulator...${NC}"
APP_PATH=$(find build/Build/Products/Debug-iphonesimulator -name "*.app" | head -1)

if [ -z "$APP_PATH" ]; then
    echo -e "${RED}❌ Could not find built .app${NC}"
    exit 1
fi

xcrun simctl install "$SIMULATOR_ID" "$APP_PATH"
echo -e "${GREEN}✅ App installed${NC}"

# Step 6: Launch app
echo -e "${YELLOW}🚀 Launching app...${NC}"
BUNDLE_ID="com.dropfly.pdfeditor"
xcrun simctl launch "$SIMULATOR_ID" "$BUNDLE_ID"

echo -e "${GREEN}✅ App launched successfully!${NC}"
echo ""
echo "The app is now running in the iOS Simulator"
echo "You can manually test PDF loading by:"
echo "1. Click 'Open PDF' button"
echo "2. Select a PDF from Files"
echo "3. Verify it loads correctly"
echo ""
echo "Press Ctrl+C to stop monitoring"

# Monitor console logs
echo -e "${YELLOW}📋 Monitoring app logs...${NC}"
xcrun simctl spawn "$SIMULATOR_ID" log stream --predicate 'process == "App"' --level debug
