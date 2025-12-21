const { chromium } = require('playwright');

async function testPDFDocSign() {
  console.log('🚀 Testing PRODUCTION site: pdfdocsign.com\n');
  console.log('📋 Test Plan:');
  console.log('   1. Load pdfdocsign.com');
  console.log('   2. Auto-upload W-9 PDF');
  console.log('   3. Verify all form fields detected');
  console.log('   4. Verify SSN/EIN split into 9 boxes with maxLength=1');
  console.log('   5. Verify checkboxes work');
  console.log('   6. Verify NO bleeding on desktop');
  console.log('   7. Take screenshots as evidence\n');

  // Launch VISIBLE browser
  const browser = await chromium.launch({
    headless: false, // VISIBLE BROWSER - you will see it
    slowMo: 800
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }, // Desktop resolution
    ignoreHTTPSErrors: true,
    // Disable cache to get latest version
    extraHTTPHeaders: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    }
  });

  const page = await context.newPage();

  const results = {
    fieldsDetected: 0,
    ssnEinBoxes: 0,
    checkboxes: 0,
    checkboxWorks: false,
    bleeding: false,
    errors: []
  };

  page.on('console', msg => {
    if (msg.type() === 'error') {
      results.errors.push(msg.text());
    }
  });

  try {
    console.log('📄 Loading pdfdocsign.com...');
    await page.goto('https://pdfdocsign.com', {
      waitUntil: 'networkidle',
      timeout: 60000
    });
    console.log('   ✅ Site loaded\n');

    // Upload PDF
    console.log('📤 Uploading W-9 PDF...');
    const fileInput = await page.locator('input[type="file"]').first();
    await fileInput.setInputFiles('/tmp/fw9.pdf');
    console.log('   ✅ PDF uploaded\n');

    // Wait for rendering
    console.log('⏳ Waiting for PDF to render (8 seconds)...');
    await page.waitForTimeout(8000);

    // Count all fields
    console.log('🔍 Detecting form fields...');
    const allFields = await page.locator('.absolute.border').all();
    results.fieldsDetected = allFields.length;
    console.log(`   Total fields: ${results.fieldsDetected}\n`);

    // Count SSN/EIN boxes (should have maxLength=1)
    console.log('📝 Checking SSN/EIN boxes...');
    const textInputs = await page.locator('input[type="text"]').all();

    for (const input of textInputs) {
      const maxLen = await input.getAttribute('maxLength');
      if (maxLen === '1') {
        results.ssnEinBoxes++;
      }
    }

    console.log(`   SSN/EIN boxes (maxLength=1): ${results.ssnEinBoxes}`);
    console.log(`   Expected: 9 total (3+2+4 for SSN, 2+7 for EIN)`);
    console.log(`   ${results.ssnEinBoxes === 9 ? '✅ CORRECT' : '❌ INCORRECT'}\n`);

    // Test character limit
    if (results.ssnEinBoxes > 0) {
      console.log('✍️  Testing character limit on first SSN/EIN box...');
      const firstBox = textInputs.find(async (input) => {
        return await input.getAttribute('maxLength') === '1';
      });

      if (firstBox) {
        await firstBox.click();
        await firstBox.fill('999999');
        const value = await firstBox.inputValue();
        console.log(`   Tried "999999", got: "${value}"`);
        console.log(`   ${value.length === 1 ? '✅ Limit enforced' : '❌ Limit NOT enforced'}\n`);
      }
    }

    // Test checkboxes
    console.log('☑️  Testing checkboxes...');
    const checkboxes = await page.locator('div[role="checkbox"]').all();
    results.checkboxes = checkboxes.length;
    console.log(`   Found ${results.checkboxes} checkboxes`);

    if (checkboxes.length > 0) {
      const before = await checkboxes[0].textContent();
      await checkboxes[0].click();
      await page.waitForTimeout(500);
      const after = await checkboxes[0].textContent();
      results.checkboxWorks = (before !== after);
      console.log(`   ${results.checkboxWorks ? '✅ Clickable' : '❌ NOT clickable'}\n`);
    }

    // Check desktop bleeding
    console.log('📐 Checking for bleeding (44px min-dimensions)...');
    if (allFields.length > 0) {
      const styles = await allFields[0].evaluate(el => {
        const computed = window.getComputedStyle(el);
        return {
          minWidth: computed.minWidth,
          minHeight: computed.minHeight,
          width: computed.width,
          height: computed.height
        };
      });

      console.log(`   minWidth: ${styles.minWidth}, minHeight: ${styles.minHeight}`);
      results.bleeding = (styles.minWidth === '44px' || styles.minHeight === '44px');
      console.log(`   ${results.bleeding ? '❌ BLEEDING DETECTED' : '✅ No bleeding'}\n`);
    }

    // Screenshots
    console.log('📸 Taking screenshots...');
    await page.screenshot({ path: '/tmp/pdfdocsign-desktop-test.png', fullPage: true });
    console.log('   Saved: /tmp/pdfdocsign-desktop-test.png\n');

    // Summary
    console.log('═══════════════════════════════════════════════════════════');
    console.log('📊 TEST RESULTS - pdfdocsign.com (DESKTOP)');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`  Form Fields Detected:     ${results.fieldsDetected} ${results.fieldsDetected > 20 ? '✅' : '❌'}`);
    console.log(`  SSN/EIN Boxes (max=1):    ${results.ssnEinBoxes} ${results.ssnEinBoxes === 9 ? '✅' : '❌'} (expected 9)`);
    console.log(`  Checkboxes:               ${results.checkboxes}`);
    console.log(`  Checkbox Clickable:       ${results.checkboxWorks ? '✅ YES' : '❌ NO'}`);
    console.log(`  Desktop Bleeding:         ${results.bleeding ? '❌ YES (BROKEN)' : '✅ NO (correct)'}`);
    console.log(`  Console Errors:           ${results.errors.length === 0 ? '✅ NONE' : `❌ ${results.errors.length}`}`);
    console.log('═══════════════════════════════════════════════════════════\n');

    console.log('⏸️  Browser will stay open for 25 seconds...\n');
    console.log('👉 You can now see the ACTUAL production site being tested\n');

    await page.waitForTimeout(25000);

  } catch (error) {
    console.error('\n❌ FAILED:', error.message);
    await page.screenshot({ path: '/tmp/pdfdocsign-error.png' });
  } finally {
    await browser.close();
    console.log('🏁 Complete\n');
  }
}

testPDFDocSign().catch(console.error);
