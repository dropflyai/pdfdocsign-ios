import { test } from '@playwright/test';

test('manual drag test - keep browser open', async ({ page }) => {
  page.on('console', msg => console.log(`BROWSER: ${msg.text()}`));

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
  await pdfContainer.click({ position: { x: 450, y: 400 } });
  await page.waitForTimeout(1000);

  const textField = page.locator('input[type="text"][placeholder="Type here..."]').first();
  await textField.fill('Test Date');

  console.log('\n⏸️  Browser will stay open for 60 seconds for manual testing...');
  console.log('  Try dragging the text field by clicking on the BORDER (not the input)');
  console.log('  Try resizing using the blue circle at bottom-right');

  await page.waitForTimeout(60000);
});
