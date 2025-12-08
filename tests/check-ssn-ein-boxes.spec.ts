import { test } from '@playwright/test';

test('inspect SSN and EIN box splitting', async ({ page }) => {
  await page.goto('http://localhost:3020');
  await page.waitForLoadState('networkidle');

  console.log('📄 Uploading FW9 form...');
  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles('/Users/rioallen/Downloads/fw9.pdf');
  await page.waitForTimeout(5000);

  console.log('\n📋 ANALYZING SSN/EIN FIELD BOXES\n');

  // Get all text input fields
  const textFields = page.locator('input[type="text"]');
  const count = await textFields.count();
  console.log(`Total text input fields detected: ${count}\n`);

  // Analyze each field
  for (let i = 0; i < count; i++) {
    const field = textFields.nth(i);
    const box = await field.boundingBox();
    const maxLength = await field.getAttribute('maxLength');

    if (box && box.width < 50) {  // Small boxes are likely digit boxes
      console.log(`Field ${i + 1} (Digit box):`);
      console.log(`  Position: (${box.x.toFixed(1)}, ${box.y.toFixed(1)})`);
      console.log(`  Size: ${box.width.toFixed(1)}px x ${box.height.toFixed(1)}px`);
      console.log(`  maxLength: ${maxLength || 'none'}`);
      console.log('');
    }
  }

  // Check if there are specifically 9 SSN boxes and 9 EIN boxes
  const smallBoxes = [];
  for (let i = 0; i < count; i++) {
    const field = textFields.nth(i);
    const box = await field.boundingBox();
    if (box && box.width < 50) {
      smallBoxes.push({ index: i, width: box.width, x: box.x, y: box.y });
    }
  }

  console.log(`\n📊 Summary:`);
  console.log(`Total small digit boxes: ${smallBoxes.length}`);
  console.log(`Expected for SSN + EIN: 18 boxes (9 for SSN + 9 for EIN)`);

  if (smallBoxes.length !== 18) {
    console.log(`\n⚠️  ISSUE: Expected 18 digit boxes but found ${smallBoxes.length}`);
  }

  // Group by Y position to identify rows
  const rows: { [key: string]: any[] } = {};
  smallBoxes.forEach(box => {
    const yKey = box.y.toFixed(0);
    if (!rows[yKey]) rows[yKey] = [];
    rows[yKey].push(box);
  });

  console.log(`\nBoxes grouped by row (Y position):`);
  Object.keys(rows).forEach(yKey => {
    console.log(`  Y=${yKey}: ${rows[yKey].length} boxes`);
  });

  // Take screenshot
  await page.screenshot({
    path: 'tests/screenshots/ssn-ein-boxes.png',
    fullPage: true
  });

  console.log('\n📸 Screenshot saved: tests/screenshots/ssn-ein-boxes.png');
});
