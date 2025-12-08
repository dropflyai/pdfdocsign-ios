import { test, expect } from '@playwright/test';

test.use({
  viewport: { width: 390, height: 844 }  // iPhone 14 Pro dimensions
});

test('Test W9 Button PDF Loading', async ({ page }) => {
  console.log('🧪 Testing Test W9 button...');

  // Navigate to the app
  await page.goto('http://localhost:3025', { waitUntil: 'networkidle' });
  console.log('✓ App loaded');

  // Wait for the Test W9 button to appear
  const testButton = page.locator('button:has-text("Test W9")');
  await expect(testButton).toBeVisible({ timeout: 5000 });
  console.log('✓ Found Test W9 button');

  // Listen for console logs from the app
  page.on('console', msg => {
    console.log(`[Browser Console] ${msg.type()}: ${msg.text()}`);
  });

  // Listen for page errors
  page.on('pageerror', error => {
    console.error(`[Page Error] ${error.message}`);
  });

  // Click the Test W9 button
  await testButton.click();
  console.log('✓ Clicked Test W9 button');

  // Wait a bit and check what happens
  await page.waitForTimeout(3000);

  // Check if canvas appeared (PDF loaded successfully)
  const canvas = page.locator('canvas');
  const canvasExists = await canvas.count();

  if (canvasExists > 0) {
    console.log('✅ Canvas appeared - checking if PDF rendered...');

    // Check if canvas has content
    const hasContent = await page.evaluate(() => {
      const canvas = document.querySelector('canvas') as HTMLCanvasElement;
      if (!canvas) return false;

      const ctx = canvas.getContext('2d');
      if (!ctx) return false;

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const hasPixels = imageData.data.some(pixel => pixel !== 0);

      console.log(`Canvas: ${canvas.width}x${canvas.height}, Has pixels: ${hasPixels}`);
      return hasPixels;
    });

    console.log(hasContent ? '✅ PDF rendered with content!' : '❌ Canvas empty');
  } else {
    console.log('❌ No canvas found - PDF did not load');

    // Check if still showing loading screen
    const loadingText = await page.locator('text=Loading PDF').count();
    if (loadingText > 0) {
      console.log('⏳ Still showing "Loading PDF..." - stuck on loading');
    }
  }

  // Take screenshot
  await page.screenshot({
    path: 'test-results/test-w9-button.png',
    fullPage: true
  });
  console.log('📸 Screenshot saved');
});
