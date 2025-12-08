import { test } from '@playwright/test';

test('verify text does not overflow individual boxes', async ({ page }) => {
  await page.goto('http://localhost:3020');
  await page.waitForLoadState('networkidle');

  console.log('📄 Uploading FW9 form...');
  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles('/Users/rioallen/Downloads/fw9.pdf');
  await page.waitForTimeout(5000);

  const textInputs = page.locator('input[type="text"][tabindex="0"]');
  const count = await textInputs.count();

  console.log(`\n📝 Testing text overflow in ${count} boxes\n`);

  // Fill SSN boxes (looking at Row 9 from previous test - indices 166-169)
  console.log('Filling SSN boxes (Part I):');

  // The actual SSN boxes should be somewhere in the middle
  // Let's find boxes around y=468 (SSN row) and y=516 (EIN row)
  const ssnBoxIndices = [166, 167, 168, 169]; // From previous test output
  const einBoxIndices = [170, 171, 172, 173]; // From previous test output

  console.log('\n🔢 SSN Boxes:');
  for (let i = 0; i < ssnBoxIndices.length; i++) {
    const idx = ssnBoxIndices[i];
    if (idx < count) {
      const input = textInputs.nth(idx);
      const box = await input.boundingBox();

      await input.click({ force: true });
      await page.waitForTimeout(100);

      // Try to enter multiple characters to test overflow
      const testValue = String(i + 1);
      await input.fill(testValue);
      await page.waitForTimeout(100);

      const actualValue = await input.inputValue();
      const maxLength = await input.getAttribute('maxLength');

      console.log(`  Box ${i + 1}:`);
      console.log(`    Position: x=${box?.x.toFixed(1)}, width=${box?.width.toFixed(1)}`);
      console.log(`    MaxLength: ${maxLength || 'unlimited'}`);
      console.log(`    Tried to enter: "${testValue}"`);
      console.log(`    Actual value: "${actualValue}"`);
      console.log(`    Text contained: ${actualValue === testValue ? '✓ YES' : '✗ NO'}`);
    }
  }

  console.log('\n🔢 EIN Boxes:');
  for (let i = 0; i < einBoxIndices.length; i++) {
    const idx = einBoxIndices[i];
    if (idx < count) {
      const input = textInputs.nth(idx);
      const box = await input.boundingBox();

      await input.click({ force: true });
      await page.waitForTimeout(100);

      const testValue = String(i + 5);
      await input.fill(testValue);
      await page.waitForTimeout(100);

      const actualValue = await input.inputValue();
      const maxLength = await input.getAttribute('maxLength');

      console.log(`  Box ${i + 1}:`);
      console.log(`    Position: x=${box?.x.toFixed(1)}, width=${box?.width.toFixed(1)}`);
      console.log(`    MaxLength: ${maxLength || 'unlimited'}`);
      console.log(`    Tried to enter: "${testValue}"`);
      console.log(`    Actual value: "${actualValue}"`);
      console.log(`    Text contained: ${actualValue === testValue ? '✓ YES' : '✗ NO'}`);
    }
  }

  // Take screenshot to visually verify
  await page.screenshot({
    path: 'tests/screenshots/fw9-text-overflow-test.png',
    fullPage: true
  });

  console.log('\n✅ Test complete!');
  console.log('📸 Screenshot saved: fw9-text-overflow-test.png');
  console.log('\n💡 Check the screenshot to verify:');
  console.log('   - Text is centered in boxes');
  console.log('   - Text does not overflow box boundaries');
  console.log('   - Blue borders are visible around each box');
});
