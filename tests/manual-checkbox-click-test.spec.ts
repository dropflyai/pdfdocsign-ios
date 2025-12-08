import { test, expect } from '@playwright/test';

test('manually click checkboxes in chromium and verify they toggle', async ({ page }) => {
  // Go to the app
  await page.goto('http://localhost:3020');
  await page.waitForLoadState('networkidle');

  console.log('📄 Uploading FW9 form...');
  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles('/Users/rioallen/Downloads/fw9.pdf');

  // Wait for PDF to load and render
  await page.waitForTimeout(5000);

  console.log('\n🔍 Looking for checkboxes...');
  const checkboxes = page.locator('[role="checkbox"]');
  const count = await checkboxes.count();
  console.log(`Found ${count} checkboxes\n`);

  expect(count).toBeGreaterThan(0);

  // Test each checkbox
  for (let i = 0; i < count; i++) {
    const checkbox = checkboxes.nth(i);

    // Get initial state
    const initialText = await checkbox.textContent();
    const initialChecked = await checkbox.getAttribute('aria-checked');

    console.log(`Checkbox ${i + 1}:`);
    console.log(`  Initial state: ${initialText} (aria-checked: ${initialChecked})`);

    // Click the checkbox
    await checkbox.click();
    await page.waitForTimeout(200);

    // Get new state
    const newText = await checkbox.textContent();
    const newChecked = await checkbox.getAttribute('aria-checked');

    console.log(`  After click: ${newText} (aria-checked: ${newChecked})`);

    // Verify it toggled
    const didToggle = initialText !== newText;
    console.log(`  ✓ Toggled: ${didToggle ? 'YES' : 'NO'}\n`);

    expect(didToggle).toBe(true);
  }

  // Take final screenshot showing all checked boxes
  await page.screenshot({
    path: 'tests/screenshots/checkboxes-all-checked.png',
    fullPage: true
  });

  console.log('✅ All checkboxes successfully toggle when clicked!');
  console.log('📸 Screenshot saved to: tests/screenshots/checkboxes-all-checked.png');
});
