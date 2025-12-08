import { test } from '@playwright/test';

test('analyze FW9 field positions and sizes', async ({ page }) => {
  await page.goto('http://localhost:3020');
  await page.waitForLoadState('networkidle');

  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles('/Users/rioallen/Downloads/fw9.pdf');
  await page.waitForTimeout(5000);

  const textInputs = page.locator('input[type="text"][tabindex="0"]');
  const count = await textInputs.count();

  console.log('\n📊 FW9 FIELD ANALYSIS\n');
  console.log(`Total fields: ${count}\n`);

  for (let i = 0; i < count; i++) {
    const input = textInputs.nth(i);
    const box = await input.boundingBox();
    const maxLength = await input.getAttribute('maxLength');

    if (box) {
      console.log(`Field ${i + 1}:`);
      console.log(`  Position: x=${box.x.toFixed(1)}, y=${box.y.toFixed(1)}`);
      console.log(`  Size: w=${box.width.toFixed(1)}, h=${box.height.toFixed(1)}`);
      console.log(`  MaxLength: ${maxLength || 'unlimited'}`);
      console.log(`  Type: ${box.width < 40 ? 'SINGLE DIGIT BOX' : 'TEXT FIELD'}`);
      console.log('');
    }
  }

  // Take annotated screenshot
  await page.screenshot({
    path: 'tests/screenshots/fw9-field-analysis.png',
    fullPage: true
  });

  console.log('📸 Screenshot saved: fw9-field-analysis.png');
});
