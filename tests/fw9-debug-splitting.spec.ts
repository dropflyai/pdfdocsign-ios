import { test } from '@playwright/test';

test('debug field splitting logic', async ({ page }) => {
  // Listen to browser console
  const messages: string[] = [];
  page.on('console', msg => {
    messages.push(`[${msg.type()}] ${msg.text()}`);
    console.log(`Browser: ${msg.text()}`);
  });

  await page.goto('http://localhost:3020');
  await page.waitForLoadState('networkidle');

  console.log('📄 Uploading FW9 form...');
  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles('/Users/rioallen/Downloads/fw9.pdf');
  await page.waitForTimeout(8000); // Wait longer for processing

  // Print all console messages
  console.log('\n📋 ALL BROWSER CONSOLE MESSAGES:\n');
  messages.forEach(msg => {
    if (msg.includes('Splitting') || msg.includes('Converting') || msg.includes('annotation')) {
      console.log(msg);
    }
  });

  await page.screenshot({
    path: 'tests/screenshots/fw9-debug-splitting.png',
    fullPage: true
  });
});
