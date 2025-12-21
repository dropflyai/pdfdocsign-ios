const { chromium } = require('playwright');

async function testPDFEditor() {
  console.log('🚀 Starting VISIBLE Chromium test (you will see the browser)...\n');

  // Launch browser in HEADED mode (VISIBLE)
  const browser = await chromium.launch({
    headless: false, // THIS MAKES THE BROWSER VISIBLE
    slowMo: 1000, // Slow down actions so you can see them
    args: ['--start-maximized']
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });

  const page = await context.newPage();

  try {
    console.log('📄 Navigating to production URL...');
    console.log('   URL: https://pdf-editor-jomvw9mbl-dropflyai.vercel.app\n');

    await page.goto('https://pdf-editor-jomvw9mbl-dropflyai.vercel.app', {
      waitUntil: 'networkidle',
      timeout: 60000
    });

    console.log('✅ Page loaded successfully\n');
    console.log('⏸️  Browser is now VISIBLE. The test will:');
    console.log('   1. Wait 10 seconds for you to upload a PDF');
    console.log('   2. Then analyze the form fields');
    console.log('   3. Run verification checks');
    console.log('   4. Keep browser open for 30 seconds for manual inspection\n');

    console.log('👉 Please upload the W-9 PDF now in the visible browser...\n');

    // Wait for user to upload PDF
    await page.waitForTimeout(10000);

    console.log('🔍 Checking for form fields...');

    // Wait for any form fields to appear
    const formFields = page.locator('.absolute.border');
    const count = await formFields.count();
    console.log(`   Found ${count} form fields on page\n`);

    if (count > 0) {
      console.log('📊 Form Field Analysis:');

      // Get all text inputs
      const textInputs = await page.locator('input[type="text"]').all();
      console.log(`   - Text inputs: ${textInputs.length}`);

      // Check for inputs with maxLength attribute
      let maxLengthCount = 0;
      let maxLength1Count = 0;

      for (const input of textInputs) {
        const maxLen = await input.getAttribute('maxLength');
        if (maxLen) {
          maxLengthCount++;
          if (maxLen === '1') {
            maxLength1Count++;
          }
        }
      }

      console.log(`   - Inputs with maxLength attribute: ${maxLengthCount}`);
      console.log(`   - Inputs with maxLength=1: ${maxLength1Count} (SSN/EIN boxes should have this)\n`);

      // Check checkboxes
      const checkboxDivs = await page.locator('div[role="checkbox"]').all();
      console.log(`   - Checkbox elements (div[role="checkbox"]): ${checkboxDivs.length}\n`);

      // Measure first field for bleeding check
      if (textInputs.length > 0) {
        console.log('📐 Field Dimension Check (Desktop Bleeding):');
        const firstInput = textInputs[0];
        const box = await firstInput.boundingBox();

        const styles = await firstInput.evaluate(el => {
          const computed = window.getComputedStyle(el);
          const parent = el.parentElement;
          const parentComputed = window.getComputedStyle(parent);
          return {
            input: {
              minWidth: computed.minWidth,
              minHeight: computed.minHeight,
              width: computed.width,
              height: computed.height
            },
            parent: {
              minWidth: parentComputed.minWidth,
              minHeight: parentComputed.minHeight,
              width: parentComputed.width,
              height: parentComputed.height
            }
          };
        });

        console.log('   First input bounding box:', box);
        console.log('   Input styles:', styles.input);
        console.log('   Parent styles:', styles.parent);
        console.log(`   ✅ Desktop should NOT have minWidth/minHeight of 44px`);
        console.log(`   ❌ If you see 44px, the bleeding fix didn't work\n`);
      }

      // Test checkbox interaction
      if (checkboxDivs.length > 0) {
        console.log('☑️  Testing Checkbox Interaction:');
        const firstCheckbox = checkboxDivs[0];

        const before = await firstCheckbox.textContent();
        console.log(`   Before click: "${before}"`);

        await firstCheckbox.click();
        await page.waitForTimeout(500);

        const after = await firstCheckbox.textContent();
        console.log(`   After click: "${after}"`);

        if (before !== after) {
          console.log(`   ✅ Checkbox is clickable and toggles correctly`);
        } else {
          console.log(`   ❌ Checkbox did not toggle (may be broken)`);
        }
        console.log('');
      }

      // Take screenshot
      console.log('📸 Taking screenshot...');
      await page.screenshot({
        path: '/tmp/pdf-editor-verification.png',
        fullPage: true
      });
      console.log('   Screenshot saved: /tmp/pdf-editor-verification.png\n');
    } else {
      console.log('❌ No form fields found. Did you upload a PDF?\n');
    }

    // Check for console errors
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    console.log('🐛 Console Errors:');
    if (consoleErrors.length > 0) {
      console.log(`   ❌ Found ${consoleErrors.length} console errors:`);
      consoleErrors.forEach(err => console.log(`      - ${err}`));
    } else {
      console.log(`   ✅ No console errors detected`);
    }

    console.log('\n⏸️  Browser will remain OPEN for 30 seconds for manual inspection...');
    console.log('   👉 You can now inspect the page visually\n');

    await page.waitForTimeout(30000);

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
    await page.screenshot({ path: '/tmp/pdf-editor-test-error.png' });
    console.log('Error screenshot saved: /tmp/pdf-editor-test-error.png');
  } finally {
    console.log('\n🏁 Closing browser...');
    await browser.close();
    console.log('✅ Test complete\n');
  }
}

testPDFEditor().catch(console.error);
