const { chromium } = require('playwright');
const path = require('path');

async function testPDFEditor() {
  console.log('🚀 Starting AUTOMATED VISIBLE Chromium test\n');
  console.log('📋 Test Plan:');
  console.log('   1. Load production site');
  console.log('   2. Auto-upload W-9 PDF');
  console.log('   3. Verify field detection');
  console.log('   4. Verify SSN/EIN character limits');
  console.log('   5. Verify checkboxes work');
  console.log('   6. Verify no desktop bleeding');
  console.log('   7. Take screenshots as evidence\n');

  // Launch VISIBLE browser
  const browser = await chromium.launch({
    headless: false, // VISIBLE
    slowMo: 500
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });

  const page = await context.newPage();

  const results = {
    pageLoaded: false,
    pdfUploaded: false,
    fieldsDetected: 0,
    textInputs: 0,
    maxLengthInputs: 0,
    maxLength1Inputs: 0,
    checkboxes: 0,
    checkboxClickable: false,
    desktopBleeding: null,
    consoleErrors: []
  };

  // Capture console errors
  page.on('console', msg => {
    if (msg.type() === 'error') {
      results.consoleErrors.push(msg.text());
    }
  });

  try {
    // 1. Load page
    console.log('📄 Step 1: Loading production site...');
    await page.goto('https://pdf-editor-jomvw9mbl-dropflyai.vercel.app', {
      waitUntil: 'networkidle',
      timeout: 60000
    });
    results.pageLoaded = true;
    console.log('   ✅ Page loaded\n');

    // 2. Upload PDF
    console.log('📤 Step 2: Uploading W-9 PDF...');
    const pdfPath = '/tmp/fw9.pdf';

    // Try different selectors for file input
    let fileInput;
    try {
      fileInput = await page.locator('input[type="file"]').first();
      await fileInput.waitFor({ timeout: 5000 });
    } catch (e) {
      console.log('   ⚠️  Standard file input not found, trying alternative selectors...');
      // Try other common patterns
      fileInput = await page.locator('input[accept*="pdf"]').first();
    }

    await fileInput.setInputFiles(pdfPath);
    console.log('   ✅ PDF file selected\n');

    // Wait for PDF to render
    console.log('⏳ Step 3: Waiting for PDF to render (10 seconds)...');
    await page.waitForTimeout(10000);
    results.pdfUploaded = true;
    console.log('   ✅ PDF should be rendered\n');

    // Take screenshot of initial render
    await page.screenshot({ path: '/tmp/pdf-editor-initial.png', fullPage: true });
    console.log('📸 Screenshot 1: /tmp/pdf-editor-initial.png\n');

    // 3. Detect form fields
    console.log('🔍 Step 4: Detecting form fields...');
    const allFields = await page.locator('.absolute.border').all();
    results.fieldsDetected = allFields.length;
    console.log(`   Found ${results.fieldsDetected} form fields\n`);

    if (results.fieldsDetected === 0) {
      console.log('   ❌ NO FIELDS DETECTED - PDF may not have rendered correctly');
      console.log('   Taking debug screenshot...\n');
      await page.screenshot({ path: '/tmp/pdf-editor-no-fields.png', fullPage: true });
    }

    // 4. Analyze text inputs
    console.log('📝 Step 5: Analyzing text inputs...');
    const textInputs = await page.locator('input[type="text"]').all();
    results.textInputs = textInputs.length;
    console.log(`   Total text inputs: ${results.textInputs}`);

    for (const input of textInputs) {
      const maxLen = await input.getAttribute('maxLength');
      if (maxLen) {
        results.maxLengthInputs++;
        if (maxLen === '1') {
          results.maxLength1Inputs++;
        }
      }
    }

    console.log(`   Inputs with maxLength: ${results.maxLengthInputs}`);
    console.log(`   Inputs with maxLength=1: ${results.maxLength1Inputs}`);
    console.log(`   ${results.maxLength1Inputs > 0 ? '✅' : '❌'} SSN/EIN boxes should have maxLength=1\n`);

    // Test SSN input if available
    if (results.maxLength1Inputs > 0) {
      console.log('✍️  Step 6: Testing SSN/EIN character limit...');
      const firstMaxLength1 = textInputs.find(async (input) => {
        const maxLen = await input.getAttribute('maxLength');
        return maxLen === '1';
      });

      if (firstMaxLength1) {
        await firstMaxLength1.click();
        await firstMaxLength1.fill('999');
        const value = await firstMaxLength1.inputValue();
        console.log(`   Tried to enter "999", got "${value}"`);
        console.log(`   ${value.length === 1 ? '✅' : '❌'} Character limit is enforced\n`);
      }
    }

    // 5. Test checkboxes
    console.log('☑️  Step 7: Testing checkboxes...');
    const checkboxDivs = await page.locator('div[role="checkbox"]').all();
    results.checkboxes = checkboxDivs.length;
    console.log(`   Found ${results.checkboxes} checkboxes`);

    if (checkboxDivs.length > 0) {
      const firstCheckbox = checkboxDivs[0];
      const before = await firstCheckbox.textContent();
      await firstCheckbox.click();
      await page.waitForTimeout(500);
      const after = await firstCheckbox.textContent();

      results.checkboxClickable = (before !== after);
      console.log(`   Before: "${before}", After: "${after}"`);
      console.log(`   ${results.checkboxClickable ? '✅' : '❌'} Checkbox is ${results.checkboxClickable ? 'clickable' : 'NOT clickable'}\n`);

      await page.screenshot({ path: '/tmp/pdf-editor-checkbox-clicked.png', fullPage: true });
      console.log('📸 Screenshot 2: /tmp/pdf-editor-checkbox-clicked.png\n');
    }

    // 6. Check for desktop bleeding
    console.log('📐 Step 8: Checking for desktop bleeding...');
    if (textInputs.length > 0) {
      const firstInput = textInputs[0];
      const styles = await firstInput.evaluate(el => {
        const computed = window.getComputedStyle(el);
        const parent = el.parentElement;
        const parentComputed = window.getComputedStyle(parent);
        return {
          input: {
            minWidth: computed.minWidth,
            minHeight: computed.minHeight
          },
          parent: {
            minWidth: parentComputed.minWidth,
            minHeight: parentComputed.minHeight
          }
        };
      });

      results.desktopBleeding = styles;
      console.log(`   Input minWidth: ${styles.input.minWidth}, minHeight: ${styles.input.minHeight}`);
      console.log(`   Parent minWidth: ${styles.parent.minWidth}, minHeight: ${styles.parent.minHeight}`);

      const hasBleeding = styles.parent.minWidth === '44px' || styles.parent.minHeight === '44px';
      console.log(`   ${hasBleeding ? '❌' : '✅'} ${hasBleeding ? 'BLEEDING DETECTED (44px on desktop)' : 'No bleeding (correct)'}\n`);
    }

    // 7. Console errors
    console.log('🐛 Step 9: Console errors check...');
    if (results.consoleErrors.length > 0) {
      console.log(`   ❌ Found ${results.consoleErrors.length} console errors:`);
      results.consoleErrors.forEach(err => console.log(`      - ${err}`));
    } else {
      console.log(`   ✅ No console errors\n`);
    }

    // Final screenshot
    await page.screenshot({ path: '/tmp/pdf-editor-final.png', fullPage: true });
    console.log('📸 Screenshot 3: /tmp/pdf-editor-final.png\n');

    // Summary
    console.log('📊 TEST SUMMARY:');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`  Page Loaded:              ${results.pageLoaded ? '✅ YES' : '❌ NO'}`);
    console.log(`  PDF Uploaded:             ${results.pdfUploaded ? '✅ YES' : '❌ NO'}`);
    console.log(`  Form Fields Detected:     ${results.fieldsDetected} ${results.fieldsDetected > 20 ? '✅' : '❌'}`);
    console.log(`  Text Inputs:              ${results.textInputs}`);
    console.log(`  maxLength=1 Inputs:       ${results.maxLength1Inputs} ${results.maxLength1Inputs > 0 ? '✅' : '❌'}`);
    console.log(`  Checkboxes:               ${results.checkboxes}`);
    console.log(`  Checkbox Clickable:       ${results.checkboxClickable ? '✅ YES' : '❌ NO'}`);
    console.log(`  Desktop Bleeding:         ${results.desktopBleeding ? (results.desktopBleeding.parent.minWidth === '44px' ? '❌ YES (broken)' : '✅ NO (correct)') : 'N/A'}`);
    console.log(`  Console Errors:           ${results.consoleErrors.length === 0 ? '✅ NONE' : `❌ ${results.consoleErrors.length}`}`);
    console.log('═══════════════════════════════════════════════════════════\n');

    console.log('⏸️  Browser will stay open for 20 seconds for manual inspection...\n');
    await page.waitForTimeout(20000);

  } catch (error) {
    console.error('\n❌ Test FAILED:', error.message);
    console.error(error.stack);
    await page.screenshot({ path: '/tmp/pdf-editor-error.png' });
    console.log('Error screenshot: /tmp/pdf-editor-error.png\n');
  } finally {
    await browser.close();
    console.log('🏁 Test complete. Browser closed.\n');
  }
}

testPDFEditor().catch(console.error);
