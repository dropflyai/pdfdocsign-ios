import { test } from '@playwright/test';

test('test with console logs', async ({ page }) => {
  // Listen to console messages
  page.on('console', msg => {
    console.log(`BROWSER: ${msg.text()}`);
  });

  await page.goto('http://localhost:3020');
  await page.waitForLoadState('networkidle');

  console.log('📄 Uploading FW9 form...');
  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles('/Users/rioallen/Downloads/fw9.pdf');
  await page.waitForTimeout(5000);

  console.log('\n✅ Placing text annotation...');
  await page.locator('button:has-text("Add Text")').click();
  await page.waitForTimeout(500);

  const pdfContainer = page.locator('.relative.bg-white.shadow-2xl');
  await pdfContainer.click({ position: { x: 400, y: 600 } });
  await page.waitForTimeout(1000);

  const textField = page.locator('input[type="text"][placeholder="Type here..."]').first();
  await textField.fill('Test');
  await page.waitForTimeout(500);

  console.log('\n🖱️ Attempting drag...');
  // Get the parent container of the text field
  const textAnnotation = page.locator('div').filter({ has: textField }).first();

  // Try to drag from the top area (drag handle)
  await textAnnotation.hover({ position: { x: 50, y: 10 } });
  await page.waitForTimeout(100);
  await page.mouse.down();
  await page.waitForTimeout(500);  // Wait to see if drag starts
  await page.mouse.move(500, 500, { steps: 5 });
  await page.waitForTimeout(500);
  await page.mouse.up();

  console.log('\n✅ Waiting...');
  await page.waitForTimeout(2000);

  console.log('\n📸 Taking screenshot...');
  await page.screenshot({
    path: 'tests/screenshots/console-test.png',
    fullPage: true
  });
});
