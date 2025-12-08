import { test, expect } from '@playwright/test';

test.use({
  viewport: { width: 390, height: 844 }  // iPhone 14 Pro dimensions
});

test('Simple W9 PDF Loading Test', async ({ page }) => {
  console.log('🧪 Testing W9 PDF loading...');

  // Navigate to already running dev server
  await page.goto('http://localhost:3025', { waitUntil: 'networkidle' });

  // Find file input
  const fileInput = await page.locator('input[type="file"]');
  await expect(fileInput).toBeAttached();
  console.log('✓ Found file input');

  // Load W9 PDF
  const w9Path = '/Users/rioallen/Downloads/fw9.pdf';
  await fileInput.setInputFiles(w9Path);
  console.log('✓ Selected W9 file');

  // Wait for canvas to appear (PDF loaded)
  try {
    await page.waitForSelector('canvas', { timeout: 15000 });
    console.log('✓ Canvas appeared - PDF loaded!');

    // Wait a bit for rendering
    await page.waitForTimeout(2000);

    // Check canvas has content
    const hasContent = await page.evaluate(() => {
      const canvas = document.querySelector('canvas') as HTMLCanvasElement;
      if (!canvas) return false;

      const ctx = canvas.getContext('2d');
      if (!ctx) return false;

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const hasPixels = imageData.data.some(pixel => pixel !== 0);

      console.log(`Canvas: ${canvas.width}x${canvas.height}, Has content: ${hasPixels}`);
      return hasPixels;
    });

    expect(hasContent).toBe(true);
    console.log('✅ W9 PDF rendered successfully!');

    // Take screenshot
    await page.screenshot({
      path: 'test-results/w9-success.png',
      fullPage: true
    });

  } catch (error) {
    console.log('❌ Failed to load PDF');
    await page.screenshot({
      path: 'test-results/w9-failure.png',
      fullPage: true
    });
    throw error;
  }
});
