import { test, expect } from '@playwright/test';

test.describe('FW9 PDF Test', () => {
  test('should load and interact with fw9.pdf', async ({ page }) => {
    // Set up console logging
    const consoleLogs: string[] = [];
    page.on('console', msg => {
      const text = msg.text();
      consoleLogs.push(`[${msg.type()}] ${text}`);
      console.log(`Browser console [${msg.type()}]: ${text}`);
    });

    // Navigate to the app
    await page.goto('http://localhost:3020');
    await page.waitForLoadState('networkidle');

    console.log('📄 Uploading fw9.pdf...');

    // Upload the FW9 PDF
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles('/Users/rioallen/Downloads/fw9.pdf');

    // Wait for PDF to load
    await page.waitForTimeout(5000);

    console.log('⏳ Waiting for field detection...');

    // Take screenshot after upload
    await page.screenshot({
      path: 'tests/screenshots/fw9-after-upload.png',
      fullPage: true
    });

    // Check console logs for field detection
    console.log('\n=== CONSOLE LOGS ===');
    consoleLogs.forEach(log => console.log(log));

    // Look for form fields
    const textInputs = page.locator('input[type="text"][tabindex="0"]');
    const textInputCount = await textInputs.count();
    console.log(`\n📊 Found ${textInputCount} text input fields`);

    const checkboxes = page.locator('[role="checkbox"]');
    const checkboxCount = await checkboxes.count();
    console.log(`📊 Found ${checkboxCount} checkboxes`);

    // Get all detected fields and their positions
    for (let i = 0; i < Math.min(textInputCount, 5); i++) {
      const input = textInputs.nth(i);
      const isVisible = await input.isVisible();
      const box = await input.boundingBox();
      console.log(`\n  Field ${i + 1}:`);
      console.log(`    Visible: ${isVisible}`);
      console.log(`    Position: x=${box?.x}, y=${box?.y}, w=${box?.width}, h=${box?.height}`);
    }

    // Test interaction with first few fields
    if (textInputCount > 0) {
      console.log('\n🖱️ Testing field interactions...');

      // Try first field
      console.log('\n  Testing field 1...');
      const field1 = textInputs.first();
      await field1.click({ force: true });
      await page.waitForTimeout(500);
      await field1.fill('John Doe');
      await page.waitForTimeout(500);

      const value1 = await field1.inputValue();
      console.log(`    ✓ Field 1 value: "${value1}"`);

      // Take screenshot after first field
      await page.screenshot({
        path: 'tests/screenshots/fw9-field1-filled.png',
        fullPage: true
      });

      // Try second field if exists
      if (textInputCount > 1) {
        console.log('\n  Testing field 2...');
        const field2 = textInputs.nth(1);
        await field2.click({ force: true });
        await page.waitForTimeout(500);
        await field2.fill('123 Main St');
        await page.waitForTimeout(500);

        const value2 = await field2.inputValue();
        console.log(`    ✓ Field 2 value: "${value2}"`);

        // Take screenshot after second field
        await page.screenshot({
          path: 'tests/screenshots/fw9-field2-filled.png',
          fullPage: true
        });
      }

      // Try third field if exists
      if (textInputCount > 2) {
        console.log('\n  Testing field 3...');
        const field3 = textInputs.nth(2);
        await field3.click({ force: true });
        await page.waitForTimeout(500);
        await field3.fill('New York');
        await page.waitForTimeout(500);

        const value3 = await field3.inputValue();
        console.log(`    ✓ Field 3 value: "${value3}"`);

        // Take screenshot after third field
        await page.screenshot({
          path: 'tests/screenshots/fw9-field3-filled.png',
          fullPage: true
        });
      }

      // Take final screenshot
      await page.screenshot({
        path: 'tests/screenshots/fw9-final.png',
        fullPage: true
      });
    } else {
      console.error('❌ No input fields detected!');
      await page.screenshot({
        path: 'tests/screenshots/fw9-no-fields.png',
        fullPage: true
      });
    }

    // Test checkboxes if they exist
    if (checkboxCount > 0) {
      console.log('\n☑️ Testing checkbox...');
      const checkbox = checkboxes.first();
      const initialState = await checkbox.getAttribute('aria-checked');
      console.log(`  Initial state: ${initialState}`);

      await checkbox.click({ force: true });
      await page.waitForTimeout(500);

      const newState = await checkbox.getAttribute('aria-checked');
      console.log(`  New state: ${newState}`);

      await page.screenshot({
        path: 'tests/screenshots/fw9-checkbox-toggled.png',
        fullPage: true
      });
    }

    console.log('\n✅ Test complete!');
    console.log(`📸 Screenshots saved to tests/screenshots/`);
  });
});
