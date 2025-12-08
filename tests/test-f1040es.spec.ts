import { test } from '@playwright/test';

test('test f1040es PDF form field detection', async ({ page }) => {
  await page.goto('http://localhost:3020');
  await page.waitForLoadState('networkidle');

  console.log('📄 Uploading f1040es.pdf...');
  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles('/Users/rioallen/Downloads/f1040es.pdf');

  // Wait for form extraction
  await page.waitForTimeout(5000);

  console.log('\n📋 Analyzing detected form fields...');

  // Count all text input fields
  const textFields = page.locator('input[type="text"]');
  const textCount = await textFields.count();
  console.log(`  Total text fields detected: ${textCount}`);

  // Count checkboxes
  const checkboxes = page.locator('div[role="checkbox"]');
  const checkboxCount = await checkboxes.count();
  console.log(`  Total checkboxes detected: ${checkboxCount}`);

  // Get all detected fields with their positions
  console.log('\n📍 Field positions:');
  for (let i = 0; i < Math.min(textCount, 20); i++) {
    const field = textFields.nth(i);
    const box = await field.boundingBox();
    const placeholder = await field.getAttribute('placeholder');

    if (box) {
      console.log(`  Field ${i + 1}: (${box.x.toFixed(1)}, ${box.y.toFixed(1)}) ${box.width.toFixed(1)}x${box.height.toFixed(1)}px`);
    }
  }

  // Take screenshot
  await page.screenshot({
    path: 'tests/screenshots/f1040es-initial.png',
    fullPage: true
  });

  console.log('\n📸 Screenshot saved: tests/screenshots/f1040es-initial.png');
  console.log('\n✅ Test complete!');
});
