const { chromium } = require('playwright');
const path = require('path');

async function testPDFEditor() {
  console.log('🚀 Starting visible Chromium test...\n');

  // Launch browser in HEADED mode (visible)
  const browser = await chromium.launch({
    headless: false, // VISIBLE BROWSER
    slowMo: 500 // Slow down so you can see what's happening
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 } // Desktop resolution
  });

  const page = await context.newPage();

  try {
    console.log('📄 Loading PDF editor...');
    await page.goto('https://pdf-editor-jomvw9mbl-dropflyai.vercel.app', {
      waitUntil: 'networkidle',
      timeout: 60000
    });

    console.log('✅ Page loaded\n');

    // Upload the W-9 PDF
    console.log('📤 Uploading W-9 PDF...');
    const pdfPath = '/tmp/fw9.pdf'; // Use actual PDF location
    const fileInput = await page.locator('input[type="file"]').first();
    await fileInput.setInputFiles(pdfPath);

    // Wait for PDF to load and render
    console.log('⏳ Waiting for PDF to render...');
    await page.waitForTimeout(5000);

    // Count form fields
    console.log('\n🔍 Analyzing form fields...');
    const allFields = await page.locator('.absolute.border-2.border-blue-500').all();
    console.log(`   Total form fields detected: ${allFields.length}`);

    // Check for SSN fields (should be 3 boxes: 3 digits + 2 digits + 4 digits)
    const ssnFields = await page.locator('input[placeholder*="SSN"]').all();
    console.log(`   SSN field boxes found: ${ssnFields.length} (expected: 3)`);

    // Check for EIN fields (should be 2 boxes: 2 digits + 7 digits)
    const einFields = await page.locator('input[placeholder*="EIN"]').all();
    console.log(`   EIN field boxes found: ${einFields.length} (expected: 2)`);

    // Test SSN/EIN character limits
    if (ssnFields.length > 0) {
      console.log('\n✍️  Testing SSN character limit...');
      const firstSSN = ssnFields[0];
      await firstSSN.click();
      await firstSSN.fill('123456789'); // Try to enter 9 digits
      const ssnValue = await firstSSN.inputValue();
      console.log(`   Entered "123456789", got: "${ssnValue}" (should be limited to field's maxLength)`);

      const maxLength = await firstSSN.getAttribute('maxLength');
      console.log(`   maxLength attribute: ${maxLength}`);
    }

    // Check checkboxes
    console.log('\n☑️  Checking checkboxes...');
    const checkboxes = await page.locator('div[role="checkbox"]').all();
    console.log(`   Checkbox elements found: ${checkboxes.length}`);

    if (checkboxes.length > 0) {
      console.log('   Testing checkbox click...');
      const firstCheckbox = checkboxes[0];
      const beforeClick = await firstCheckbox.textContent();
      console.log(`   Before click: "${beforeClick}"`);

      await firstCheckbox.click();
      await page.waitForTimeout(500);

      const afterClick = await firstCheckbox.textContent();
      console.log(`   After click: "${afterClick}"`);
      console.log(`   Checkbox toggled: ${beforeClick !== afterClick ? '✅ YES' : '❌ NO'}`);
    }

    // Check for bleeding (measure field dimensions)
    console.log('\n📐 Checking for field bleeding (desktop)...');
    if (allFields.length > 0) {
      const firstField = allFields[0];
      const box = await firstField.boundingBox();
      const computedStyle = await firstField.evaluate(el => {
        const style = window.getComputedStyle(el);
        return {
          minWidth: style.minWidth,
          minHeight: style.minHeight,
          width: style.width,
          height: style.height
        };
      });

      console.log(`   First field dimensions:`, box);
      console.log(`   Computed styles:`, computedStyle);
      console.log(`   Min dimensions should be auto/0px on desktop, not 44px`);
    }

    // Take screenshot
    console.log('\n📸 Taking screenshot...');
    await page.screenshot({
      path: '/tmp/pdf-editor-desktop-test.png',
      fullPage: true
    });
    console.log('   Screenshot saved to /tmp/pdf-editor-desktop-test.png');

    // Console errors
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    if (errors.length > 0) {
      console.log('\n❌ Console errors detected:');
      errors.forEach(err => console.log(`   - ${err}`));
    } else {
      console.log('\n✅ No console errors detected');
    }

    console.log('\n✅ Test complete! Browser will remain open for 30 seconds for you to inspect...');
    await page.waitForTimeout(30000);

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    await page.screenshot({ path: '/tmp/pdf-editor-error.png' });
  } finally {
    await browser.close();
    console.log('\n🏁 Browser closed');
  }
}

testPDFEditor().catch(console.error);
