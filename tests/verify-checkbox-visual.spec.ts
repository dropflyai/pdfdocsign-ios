import { test, expect } from '@playwright/test';

test('verify checkboxes are visible and toggle with check mark', async ({ page }) => {
  await page.goto('http://localhost:3020');
  await page.waitForLoadState('networkidle');

  console.log('📄 Uploading FW9 form...');
  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles('/Users/rioallen/Downloads/fw9.pdf');
  await page.waitForTimeout(5000);

  console.log('\n🔍 Finding checkboxes...');
  const checkboxes = page.locator('[role="checkbox"]');
  const count = await checkboxes.count();
  console.log(`Found ${count} checkboxes\n`);

  // Test first 3 checkboxes in detail
  for (let i = 0; i < Math.min(3, count); i++) {
    const checkbox = checkboxes.nth(i);
    const box = await checkbox.boundingBox();

    console.log(`\nCheckbox ${i + 1}:`);
    console.log(`  Size: ${box?.width}px x ${box?.height}px`);
    console.log(`  Position: (${box?.x}, ${box?.y})`);

    // Check initial state - should be empty/unchecked
    const initialText = await checkbox.textContent();
    const initialChecked = await checkbox.getAttribute('aria-checked');
    console.log(`  Initial: text="${initialText}", aria-checked=${initialChecked}`);

    expect(initialChecked).toBe('false');
    expect(initialText?.trim()).toBe(''); // Should be empty when unchecked

    // Click to check it
    console.log(`  Clicking to CHECK...`);
    await checkbox.click();
    await page.waitForTimeout(300);

    // Verify it's now checked with a checkmark
    const checkedText = await checkbox.textContent();
    const checkedState = await checkbox.getAttribute('aria-checked');
    console.log(`  After 1st click: text="${checkedText}", aria-checked=${checkedState}`);

    expect(checkedState).toBe('true');
    expect(checkedText?.trim()).toBe('✓'); // Should show checkmark

    // Click again to uncheck it
    console.log(`  Clicking to UNCHECK...`);
    await checkbox.click();
    await page.waitForTimeout(300);

    // Verify it's back to unchecked
    const uncheckedText = await checkbox.textContent();
    const uncheckedState = await checkbox.getAttribute('aria-checked');
    console.log(`  After 2nd click: text="${uncheckedText}", aria-checked=${uncheckedState}`);

    expect(uncheckedState).toBe('false');
    expect(uncheckedText?.trim()).toBe(''); // Should be empty again

    console.log(`  ✅ Checkbox ${i + 1} works correctly!`);
  }

  // Take screenshot with some boxes checked
  console.log('\n📸 Checking a few boxes for screenshot...');
  await checkboxes.nth(0).click();
  await checkboxes.nth(2).click();
  await checkboxes.nth(4).click();
  await page.waitForTimeout(500);

  await page.screenshot({
    path: 'tests/screenshots/checkboxes-verified.png',
    fullPage: true
  });

  console.log('\n✅ All checkbox functionality verified!');
  console.log('📸 Screenshot saved: tests/screenshots/checkboxes-verified.png');
});
