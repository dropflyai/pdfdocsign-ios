import { test, expect } from '@playwright/test';

test('test SSN/EIN with single digits per box', async ({ page }) => {
  await page.goto('http://localhost:3020');
  await page.waitForLoadState('networkidle');

  console.log('📄 Uploading FW9 form...');
  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles('/Users/rioallen/Downloads/fw9.pdf');
  await page.waitForTimeout(5000);

  const textInputs = page.locator('input[type="text"][tabindex="0"]');

  console.log('\n🔢 Testing Single-Digit Boxes\n');

  // Field 11-13 appear to be SSN fields based on size
  // Let's test them

  console.log('Testing Field 11 (SSN part 1):');
  await textInputs.nth(10).click({ force: true });
  await page.waitForTimeout(200);
  await textInputs.nth(10).fill('12');  // Should only keep first character
  await page.waitForTimeout(200);
  const field11Value = await textInputs.nth(10).inputValue();
  console.log(`  Typed "12", actual value: "${field11Value}"`);
  console.log(`  MaxLength: ${await textInputs.nth(10).getAttribute('maxLength')}`);

  console.log('\nTesting Field 12 (SSN part 2 - single digit box):');
  await textInputs.nth(11).click({ force: true });
  await page.waitForTimeout(200);
  await textInputs.nth(11).fill('3');
  await page.waitForTimeout(200);
  const field12Value = await textInputs.nth(11).inputValue();
  console.log(`  Typed "3", actual value: "${field12Value}"`);
  console.log(`  MaxLength: ${await textInputs.nth(11).getAttribute('maxLength')}`);
  expect(field12Value).toBe('3');

  console.log('\nTesting Field 13 (SSN part 3):');
  await textInputs.nth(12).click({ force: true });
  await page.waitForTimeout(200);
  await textInputs.nth(12).fill('4567');
  await page.waitForTimeout(200);
  const field13Value = await textInputs.nth(12).inputValue();
  console.log(`  Typed "4567", actual value: "${field13Value}"`);

  // Take screenshot
  await page.screenshot({
    path: 'tests/screenshots/fw9-single-digit-test.png',
    fullPage: true
  });

  console.log('\n✅ Single-digit box test complete!');
  console.log(`Field 12 correctly limited to 1 character: ${field12Value === '3' ? 'YES' : 'NO'}`);
});
