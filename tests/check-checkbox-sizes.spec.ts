import { test } from '@playwright/test';

test('inspect actual checkbox sizes detected from PDF', async ({ page }) => {
  await page.goto('http://localhost:3020');
  await page.waitForLoadState('networkidle');

  console.log('📄 Uploading FW9 form...');
  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles('/Users/rioallen/Downloads/fw9.pdf');
  await page.waitForTimeout(5000);

  console.log('\n📏 CHECKBOX SIZE ANALYSIS\n');

  const checkboxes = page.locator('[role="checkbox"]');
  const count = await checkboxes.count();
  console.log(`Total checkboxes found: ${count}\n`);

  for (let i = 0; i < count; i++) {
    const checkbox = checkboxes.nth(i);
    const box = await checkbox.boundingBox();

    console.log(`Checkbox ${i + 1} (Section 3a/3b):`);
    console.log(`  Position: (${box?.x.toFixed(1)}, ${box?.y.toFixed(1)})`);
    console.log(`  Width: ${box?.width}px`);
    console.log(`  Height: ${box?.height}px`);
    console.log(`  Area: ${box ? (box.width * box.height).toFixed(0) : 0}px²`);

    // Check if it's too small
    if (box && box.width < 15 && box.height < 15) {
      console.log(`  ⚠️  TOO SMALL - Hard to click manually!`);
    } else if (box && box.width < 20 && box.height < 20) {
      console.log(`  ⚡ Small - Could be bigger`);
    } else {
      console.log(`  ✓ Good size`);
    }
    console.log('');
  }

  // Take screenshot showing the checkboxes
  await page.screenshot({
    path: 'tests/screenshots/checkbox-sizes.png',
    fullPage: true
  });

  console.log('📸 Screenshot saved: tests/screenshots/checkbox-sizes.png');
});
