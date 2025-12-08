import { test } from '@playwright/test';

test('list all detected form fields', async ({ page }) => {
  await page.goto('http://localhost:3020');
  await page.waitForLoadState('networkidle');

  console.log('📄 Uploading FW9 form...');
  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles('/Users/rioallen/Downloads/fw9.pdf');
  await page.waitForTimeout(5000);

  console.log('\n📋 ALL DETECTED FORM FIELDS:\n');

  // Get all text input fields
  const textFields = page.locator('input[type="text"]');
  const count = await textFields.count();
  console.log(`Total text fields: ${count}\n`);

  for (let i = 0; i < count; i++) {
    const field = textFields.nth(i);
    const box = await field.boundingBox();
    const placeholder = await field.getAttribute('placeholder');
    const value = await field.inputValue();

    console.log(`Field ${i + 1}:`);
    if (box) {
      console.log(`  Position: (${box.x.toFixed(1)}, ${box.y.toFixed(1)})`);
      console.log(`  Size: ${box.width.toFixed(1)}px x ${box.height.toFixed(1)}px`);
    }
    console.log(`  Value: "${value}"`);
    console.log(`  Placeholder: "${placeholder}"`);
    console.log('');
  }

  // Check for any fields with "date" in vicinity
  console.log('\n🔍 Looking for date-related text on the PDF...');

  // Take screenshot
  await page.screenshot({
    path: 'tests/screenshots/all-fields.png',
    fullPage: true
  });

  console.log('\n📸 Screenshot saved: tests/screenshots/all-fields.png');
});
