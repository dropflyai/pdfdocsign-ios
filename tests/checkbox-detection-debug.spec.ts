import { test } from '@playwright/test';

test('debug checkbox detection in browser', async ({ page }) => {
  await page.goto('http://localhost:3020');
  await page.waitForLoadState('networkidle');

  console.log('📄 Uploading FW9 form...');
  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles('/Users/rioallen/Downloads/fw9.pdf');
  await page.waitForTimeout(5000);

  // Check console logs for field detection
  const logs: string[] = [];
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('checkbox') || text.includes('field') || text.includes('Form') || text.includes('☑') || text.includes('☐')) {
      logs.push(text);
      console.log('Console:', text);
    }
  });

  // Wait a bit more for processing
  await page.waitForTimeout(2000);

  // Try to find checkboxes by different selectors
  const byRole = page.locator('[role="checkbox"]');
  const byFieldType = page.locator('[data-field-type="checkbox"]');
  const byCheckmark = page.getByText('☐');
  const byChecked = page.getByText('☑');

  console.log('\n🔍 CHECKBOX DETECTION RESULTS:\n');
  console.log(`Checkboxes by role="checkbox": ${await byRole.count()}`);
  console.log(`Checkboxes by data-field-type: ${await byFieldType.count()}`);
  console.log(`Empty checkbox symbols (☐): ${await byCheckmark.count()}`);
  console.log(`Checked symbols (☑): ${await byChecked.count()}`);

  // Get all divs that might be checkboxes
  const allDivs = page.locator('div');
  const divCount = await allDivs.count();

  let potentialCheckboxes = 0;
  for (let i = 0; i < divCount; i++) {
    const div = allDivs.nth(i);
    const role = await div.getAttribute('role');
    if (role === 'checkbox') {
      potentialCheckboxes++;
      const box = await div.boundingBox();
      const text = await div.textContent();
      console.log(`\nCheckbox ${potentialCheckboxes}:`);
      console.log(`  Text: ${text}`);
      console.log(`  Position: x=${box?.x.toFixed(1)}, y=${box?.y.toFixed(1)}`);
      console.log(`  Size: ${box?.width.toFixed(1)} x ${box?.height.toFixed(1)}`);

      // Try to click it
      try {
        await div.click({ force: true, timeout: 1000 });
        await page.waitForTimeout(100);
        const newText = await div.textContent();
        console.log(`  After click: ${newText}`);
        console.log(`  Click worked: ${newText !== text ? '✓ YES' : '✗ NO'}`);
      } catch (e) {
        console.log(`  Click failed: ${e}`);
      }
    }
  }

  console.log(`\n📊 Total potential checkboxes found: ${potentialCheckboxes}`);
  console.log(`\n📋 Console logs containing checkbox/field info:`);
  logs.forEach(log => console.log(`  ${log}`));

  // Take screenshot
  await page.screenshot({
    path: 'tests/screenshots/checkbox-debug.png',
    fullPage: true
  });
  console.log('\n📸 Screenshot saved: checkbox-debug.png');
});
