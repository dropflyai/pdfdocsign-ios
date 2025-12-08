import { test } from '@playwright/test';

test('open browser and wait for manual testing', async ({ page }) => {
  await page.goto('http://localhost:3020');
  await page.waitForLoadState('networkidle');

  console.log('\n🌐 Browser opened at http://localhost:3020');
  console.log('📄 Uploading FW9 form...');

  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles('/Users/rioallen/Downloads/fw9.pdf');
  await page.waitForTimeout(5000);

  console.log('\n✅ Form loaded. Browser will stay open for 2 minutes for manual testing.');
  console.log('👆 Try clicking the checkboxes in sections 3a/3b manually');
  console.log('🔍 Open DevTools (F12) to see console logs when you click\n');

  // Listen for console messages
  page.on('console', msg => {
    if (msg.text().includes('Checkbox clicked')) {
      console.log('✓ CONSOLE:', msg.text());
    }
  });

  // Keep browser open for 2 minutes for manual testing
  await page.waitForTimeout(120000);

  console.log('⏰ Test timeout - closing browser');
});
