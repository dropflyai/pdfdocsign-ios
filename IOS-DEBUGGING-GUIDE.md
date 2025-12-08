# iOS Simulator Debugging Guide
## PDF Field Detection Testing

**Status:** App is installed and running in iOS Simulator
**Issue:** Need to verify field detection with Safari Web Inspector

---

## ✅ What I've Done

1. **Built iOS app** with enhanced logging ✓
2. **Installed on simulator** (iPhone 17 Pro) ✓
3. **App is running** and ready to test ✓
4. **Test W9 button** is visible in the app ✓
5. **PDF file** is bundled in the app ✓

---

## 🔍 How to Debug Field Detection in iOS Simulator

### Step 1: Open Safari Web Inspector

1. **Open Safari** on your Mac
2. **Enable Developer Menu:**
   - Safari → Settings → Advanced
   - Check "Show features for web developers"
3. **Open Web Inspector:**
   - Safari → Develop → iPhone 17 Pro (Simulator) → PDF Doc Sign
   - OR: Right-click the simulator in Develop menu → Inspect

### Step 2: Test Field Detection

1. **In the Simulator:**
   - Click the green **"Test W9"** button in the top right
   - Wait for PDF to load

2. **In Safari Web Inspector Console:**
   - Watch for console.log messages
   - Look for these key logs:

**Expected Logs (if working):**
```
✅ PDF loaded, size: 140815 bytes
✅ Total fields found: 23
📋 Detected form type: FW9
✅ Total annotations created: 36
✅ Annotations state updated with 36 items
```

**If NOT working, you'll see:**
```
❌ No field detection logs
OR
✅ Total fields found: 0
OR
Errors about pdf-lib or PDF.js
```

### Step 3: Visual Verification

- **If working:** You should see highlighted form fields on the PDF
- **If broken:** PDF loads but no form fields appear

---

## 🐛 Common Issues & Fixes

### Issue 1: JavaScript Not Loading
**Symptoms:** No console logs at all
**Fix:** Check Network tab in Web Inspector for failed script loads

### Issue 2: PDF.js Worker Error
**Symptoms:** Error about "pdf.worker.min.mjs"
**Fix:** Already configured to load from CDN, but check Network tab

### Issue 3: pdf-lib Not Working on iOS
**Symptoms:** Error when calling `PDFDocument.load()`
**Fix:** This is the most likely issue - pdf-lib may not work in iOS WebKit

### Issue 4: File Reading Issues
**Symptoms:** Error reading ArrayBuffer
**Fix:** May need to use Capacitor Filesystem API instead

---

## 📊 Quick Test Commands

### Relaunch App and Monitor
```bash
cd /Users/rioallen/Documents/DropFly-OS-App-Builder/DropFly-PROJECTS/pdf-editor

# Kill and relaunch app
xcrun simctl terminate 523A8F96-B0A3-42AC-8DC9-B2CBB1E145B0 com.dropfly.pdfeditor
xcrun simctl launch 523A8F96-B0A3-42AC-8DC9-B2CBB1E145B0 com.dropfly.pdfeditor
```

Then open Safari Web Inspector immediately.

### Rebuild and Reinstall
```bash
# If you make changes
npm run build
npx cap sync ios

# Rebuild iOS app
xcodebuild -workspace ios/App/App.xcworkspace -scheme App -configuration Debug -sdk iphonesimulator -derivedDataPath ios/build -destination "id=523A8F96-B0A3-42AC-8DC9-B2CBB1E145B0" build

# Install
xcrun simctl install 523A8F96-B0A3-42AC-8DC9-B2CBB1E145B0 ios/build/Build/Products/Debug-iphonesimulator/App.app

# Launch
xcrun simctl launch 523A8F96-B0A3-42AC-8DC9-B2CBB1E145B0 com.dropfly.pdfeditor
```

---

## 🔧 What to Look For

### In Safari Web Inspector Console:

1. **First, check if JavaScript is running:**
   - Type: `console.log('test')`
   - If this works, JS is running

2. **Check if pdf-lib is loaded:**
   - Type: `PDFDocument`
   - Should return: `[Function: PDFDocument]`
   - If undefined: pdf-lib not loaded

3. **Check if PDF.js is loaded:**
   - Type: `pdfjsLib`
   - Should return an object
   - If undefined: PDF.js not loaded

4. **Manually trigger field detection:**
   - Click "Test W9" button
   - Watch console for logs starting with:
     - `📄 File selected:`
     - `🔍 Starting field extraction...`
     - `✅ Total fields found:`

---

## 🎯 Expected Behavior

**Webapp (working):**
- Loads PDF
- Detects 23 fields
- Creates 36 annotations
- Shows highlighted form fields

**iOS App (currently testing):**
- Should behave identically
- If not, Safari Web Inspector will show the error

---

## 📝 Report Back

After testing in Safari Web Inspector, please share:

1. **Do you see ANY console.log messages?** (Yes/No)
2. **Do you see the field detection logs?** (Copy/paste them)
3. **Are there any RED errors in the console?** (Copy/paste them)
4. **Do form fields appear highlighted on the PDF?** (Yes/No)

This will tell me exactly what's broken and how to fix it!

---

## 🚨 Most Likely Issue

Based on the fact that the webapp works but iOS doesn't, the most likely culprits are:

1. **pdf-lib not compatible with iOS WebKit**
   - Solution: Use PDF.js annotations API instead

2. **ArrayBuffer/Blob handling different on iOS**
   - Solution: Use Capacitor Filesystem API

3. **CORS issues loading PDF.js worker**
   - Solution: Bundle worker locally instead of CDN

---

**App Location:** Simulator is running
**Next Step:** Open Safari Web Inspector and click "Test W9"
**Report:** Share what you see in the console!
