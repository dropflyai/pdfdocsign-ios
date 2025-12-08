#!/bin/bash

# Automated iOS Testing Script
# Runs UI tests on iOS simulator and reports results

set -e

echo "🧪 Running Automated iOS Tests..."

cd "$(dirname "$0")/.."

# Configuration
SIMULATOR_ID="523A8F96-B0A3-42AC-8DC9-B2CBB1E145B0"
TEST_PDF="/Users/rioallen/Documents/DropFly-OS-App-Builder/DropFly-PROJECTS/pdf-editor/public/test.pdf"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "Step 1: Build Next.js"
npm run build > /dev/null 2>&1
echo -e "${GREEN}✅ Next.js built${NC}"

echo "Step 2: Sync Capacitor"
npx cap sync ios > /dev/null 2>&1
echo -e "${GREEN}✅ Capacitor synced${NC}"

echo "Step 3: Run Playwright iOS tests"
echo ""
npx playwright test ios-app-validation.spec.ts --project="iPhone 14 Pro" --reporter=list

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✅ All iOS validation tests passed!${NC}"
    echo ""
    echo "Tests verified:"
    echo "  ✓ Safe area padding"
    echo "  ✓ App branding"
    echo "  ✓ Upload area display"
    echo "  ✓ Mobile viewport layout"
    echo "  ✓ PDF loading"
    echo "  ✓ Back button functionality"
    echo "  ✓ Toolbar display"
    echo "  ✓ Mobile responsive design"
    echo "  ✓ Error handling"
    echo "  ✓ Performance"
    echo ""
    echo -e "${GREEN}🎉 Ready to build for production!${NC}"
    exit 0
else
    echo ""
    echo -e "${RED}❌ Some tests failed${NC}"
    echo "Review the output above for details"
    exit 1
fi
