const { chromium } = require('playwright');

async function gatherEvidence() {
  console.log('🔍 EVIDENCE GATHERING - pdfdocsign.com\n');
  console.log('Following Engineering Brain Evidence Discipline Protocol:\n');
  console.log('1. Reproduce errors before fixing');
  console.log('2. Capture key error output');
  console.log('3. Identify root cause\n');

  const browser = await chromium.launch({
    headless: false,
    slowMo: 1000
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });

  const page = await context.newPage();

  const evidence = {
    pageLoaded: false,
    pdfUploaded: false,
    fieldsDetected: 0,
    ssnEinBoxes: [],
    checkboxes: [],
    consoleErrors: [],
    consoleLogs: []
  };

  page.on('console', msg => {
    const text = msg.text();
    if (msg.type() === 'error') {
      evidence.consoleErrors.push(text);
      console.log(`   ⚠️  Console error: ${text}`);
    }
    // Capture important logs about field extraction
    if (text.includes('Field type:') || text.includes('Extracted fields:') ||
        text.includes('Total fields') || text.includes('checkbox') ||
        text.includes('Converting field') || text.includes('Created annotation')) {
      evidence.consoleLogs.push(text);
      console.log(`   📝 Log: ${text}`);
    }
  });

  try {
    console.log('📄 Loading pdfdocsign.com...');
    await page.goto('https://pdfdocsign.com', {
      waitUntil: 'networkidle',
      timeout: 60000
    });
    evidence.pageLoaded = true;
    console.log('   ✅ Page loaded\n');

    // Take screenshot of landing page
    await page.screenshot({ path: '/tmp/evidence-1-landing.png' });
    console.log('📸 Evidence 1: Landing page → /tmp/evidence-1-landing.png\n');

    console.log('📤 Uploading PDF...');

    // The file input is hidden - we need to access it directly
    // It's typically hidden with CSS but still exists in the DOM
    const fileInput = await page.locator('input[type="file"]').first();

    // Check if it exists
    const inputCount = await page.locator('input[type="file"]').count();
    console.log(`   Found ${inputCount} file input(s)`);

    if (inputCount === 0) {
      console.log('   ❌ No file input found - checking for "Open PDF" button...');

      // Try clicking the "Open PDF" button first
      const openButton = page.locator('text=Open PDF');
      const buttonExists = await openButton.count() > 0;

      if (buttonExists) {
        console.log('   Found "Open PDF" button, but need direct file input access');
      }

      throw new Error('Could not find file input element');
    }

    // Set the file directly on the hidden input (this works even if input is hidden)
    await fileInput.setInputFiles('/tmp/fw9.pdf');
    console.log('   ✅ File selected via hidden input\n');

    console.log('⏳ Waiting for PDF to render (10 seconds)...');
    await page.waitForTimeout(10000);

    // Take screenshot after upload
    await page.screenshot({ path: '/tmp/evidence-2-after-upload.png' });
    console.log('📸 Evidence 2: After upload → /tmp/evidence-2-after-upload.png\n');

    console.log('🔍 ISSUE 1: Detecting all form fields...');
    const allFields = await page.locator('.absolute.border').all();
    evidence.fieldsDetected = allFields.length;
    console.log(`   Found: ${evidence.fieldsDetected} fields`);
    console.log(`   ${evidence.fieldsDetected > 20 ? '✅' : '❌'} Expected: 20+ fields\n`);

    console.log('🔍 ISSUE 2: Checking SSN/EIN boxes (should be 9 individual boxes)...');
    const textInputs = await page.locator('input[type="text"]').all();

    for (let i = 0; i < textInputs.length; i++) {
      const input = textInputs[i];
      const maxLen = await input.getAttribute('maxLength');
      const placeholder = await input.getAttribute('placeholder');
      const value = await input.inputValue();

      if (maxLen === '1' || placeholder?.includes('SSN') || placeholder?.includes('EIN')) {
        evidence.ssnEinBoxes.push({
          index: i,
          maxLength: maxLen,
          placeholder: placeholder,
          value: value
        });
      }
    }

    console.log(`   Found: ${evidence.ssnEinBoxes.length} SSN/EIN boxes with maxLength=1`);
    console.log(`   ${evidence.ssnEinBoxes.length === 9 ? '✅' : '❌'} Expected: 9 boxes (3+2+4 for SSN, 2+7 for EIN)`);

    if (evidence.ssnEinBoxes.length > 0) {
      console.log('   Details:');
      evidence.ssnEinBoxes.forEach(box => {
        console.log(`     Box ${box.index}: maxLength=${box.maxLength}, placeholder="${box.placeholder}"`);
      });
    }
    console.log();

    console.log('🔍 ISSUE 3: Testing checkboxes (should show check marks)...');
    const checkboxDivs = await page.locator('div[role="checkbox"]').all();
    console.log(`   Found: ${checkboxDivs.length} checkbox divs`);

    if (checkboxDivs.length > 0) {
      const firstCheckbox = checkboxDivs[0];
      const beforeClick = await firstCheckbox.textContent();
      await firstCheckbox.click();
      await page.waitForTimeout(500);
      const afterClick = await firstCheckbox.textContent();

      evidence.checkboxes.push({
        beforeClick,
        afterClick,
        works: beforeClick !== afterClick
      });

      console.log(`   Before click: "${beforeClick}"`);
      console.log(`   After click: "${afterClick}"`);
      console.log(`   ${beforeClick !== afterClick ? '✅' : '❌'} Checkbox state changed`);

      await page.screenshot({ path: '/tmp/evidence-3-checkbox-clicked.png' });
      console.log('📸 Evidence 3: Checkbox clicked → /tmp/evidence-3-checkbox-clicked.png\n');
    } else {
      console.log('   ❌ No checkboxes found\n');
    }

    // Summary
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('📊 EVIDENCE SUMMARY');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`✓ Page Loaded:           ${evidence.pageLoaded ? 'YES' : 'NO'}`);
    console.log(`✓ PDF Uploaded:          ${evidence.fieldsDetected > 0 ? 'YES' : 'NO'}`);
    console.log(`✓ Fields Detected:       ${evidence.fieldsDetected} ${evidence.fieldsDetected > 20 ? '✅' : '❌'}`);
    console.log(`✓ SSN/EIN Boxes:         ${evidence.ssnEinBoxes.length} ${evidence.ssnEinBoxes.length === 9 ? '✅' : '❌'} (expected 9)`);
    console.log(`✓ Checkboxes Found:      ${checkboxDivs.length}`);
    console.log(`✓ Checkboxes Work:       ${evidence.checkboxes.length > 0 ? (evidence.checkboxes[0].works ? '✅ YES' : '❌ NO') : 'N/A'}`);
    console.log(`✓ Console Errors:        ${evidence.consoleErrors.length} ${evidence.consoleErrors.length === 0 ? '✅' : '❌'}`);
    console.log(`✓ Console Logs Captured: ${evidence.consoleLogs.length}`);
    console.log('═══════════════════════════════════════════════════════════\n');

    if (evidence.consoleLogs.length > 0) {
      console.log('📋 CAPTURED CONSOLE LOGS:');
      console.log('═══════════════════════════════════════════════════════════');
      evidence.consoleLogs.forEach((log, i) => console.log(`${i + 1}. ${log}`));
      console.log('═══════════════════════════════════════════════════════════\n');
    }

    console.log('⏸️  Browser staying open for 30 seconds for manual inspection...\n');
    await page.waitForTimeout(30000);

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    await page.screenshot({ path: '/tmp/evidence-error.png' });
    console.log('Error screenshot: /tmp/evidence-error.png\n');
  } finally {
    await browser.close();
    console.log('🏁 Evidence gathering complete\n');

    // Write evidence to log file
    const fs = require('fs');
    fs.writeFileSync('/tmp/evidence-log.json', JSON.stringify(evidence, null, 2));
    console.log('📝 Evidence saved to /tmp/evidence-log.json\n');
  }
}

gatherEvidence().catch(console.error);
