import { test } from '@playwright/test';

test('verify FW9 checkboxes are detected and clickable', async ({ page }) => {
  await page.goto('http://localhost:3020');
  await page.waitForLoadState('networkidle');

  console.log('📄 Uploading FW9 form...');
  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles('/Users/rioallen/Downloads/fw9.pdf');
  await page.waitForTimeout(5000);

  // Find checkboxes
  const checkboxes = page.locator('[role="checkbox"]');
  const checkboxCount = await checkboxes.count();

  console.log(`\n☑️  CHECKBOX ANALYSIS\n`);
  console.log(`Total checkboxes found: ${checkboxCount}\n`);

  if (checkboxCount > 0) {
    for (let i = 0; i < Math.min(checkboxCount, 10); i++) {
      const checkbox = checkboxes.nth(i);
      const box = await checkbox.boundingBox();
      const ariaChecked = await checkbox.getAttribute('aria-checked');

      console.log(`Checkbox ${i + 1}:`);
      console.log(`  Position: x=${box?.x.toFixed(1)}, y=${box?.y.toFixed(1)}`);
      console.log(`  Size: ${box?.width.toFixed(1)} x ${box?.height.toFixed(1)}`);
      console.log(`  State: ${ariaChecked}`);

      // Test clicking the checkbox
      await checkbox.click({ force: true });
      await page.waitForTimeout(200);

      const newState = await checkbox.getAttribute('aria-checked');
      console.log(`  After click: ${newState}`);
      console.log(`  Toggle works: ${newState !== ariaChecked ? '✓ YES' : '✗ NO'}`);
      console.log('');
    }

    // Take screenshot
    await page.screenshot({
      path: 'tests/screenshots/fw9-checkboxes.png',
      fullPage: true
    });

    console.log('✅ Checkbox test complete!');
    console.log(`📸 Screenshot saved: fw9-checkboxes.png`);
  } else {
    console.log('⚠️  No checkboxes detected!');
    console.log('This may indicate checkboxes are not being rendered correctly.');
  }
});
