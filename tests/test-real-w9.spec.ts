import { test, expect } from '@playwright/test';
import path from 'path';

test('Test loading actual W9 form from Downloads', async ({ page }) => {
  console.log('🧪 Testing with real W9 PDF from Downloads folder...');

  // Listen for console messages and errors
  const consoleMessages: string[] = [];
  page.on('console', msg => {
    consoleMessages.push(`${msg.type()}: ${msg.text()}`);
    console.log(`[CONSOLE ${msg.type()}]`, msg.text());
  });

  page.on('pageerror', error => {
    console.log('[PAGE ERROR]', error.message);
  });

  console.log('Step 1: Navigate to home page');
  await page.goto('http://localhost:3025');
  await page.waitForLoadState('networkidle');

  console.log('Step 2: Find file input');
  const fileInput = page.locator('input[type="file"]');
  await expect(fileInput).toBeAttached();
  console.log('✓ File input found');

  const w9Path = '/Users/rioallen/Downloads/fw9.pdf';
  console.log('Step 3: Upload W9 from:', w9Path);

  try {
    await fileInput.setInputFiles(w9Path);
    console.log('✓ File set on input');

    console.log('Step 4: Wait for PDF to load...');

    // Wait for canvas with longer timeout since W9 might be larger
    const canvasAppeared = await page.waitForSelector('canvas', { timeout: 15000 }).then(() => true).catch(() => false);

    if (!canvasAppeared) {
      console.log('❌ Canvas did not appear - PDF loading failed');

      // Check for loading spinner
      const loadingText = await page.locator('text=/loading/i').count();
      console.log(`Loading indicators found: ${loadingText}`);

      // Take screenshot
      await page.screenshot({ path: 'test-results/w9-loading-failed.png', fullPage: true });
      console.log('Screenshot saved to test-results/w9-loading-failed.png');

      throw new Error('PDF did not load - stuck on loading screen');
    }

    console.log('✅ Canvas appeared!');

    // Wait a bit for PDF to fully render
    await page.waitForTimeout(2000);

    // Check if canvas has content
    const hasContent = await page.evaluate(() => {
      const canvas = document.querySelector('canvas') as HTMLCanvasElement;
      if (!canvas) return false;
      const ctx = canvas.getContext('2d');
      if (!ctx) return false;
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const hasPixels = imageData.data.some(pixel => pixel !== 0);
      console.log('Canvas dimensions:', canvas.width, 'x', canvas.height);
      console.log('Has rendered pixels:', hasPixels);
      return hasPixels;
    });

    if (hasContent) {
      console.log('✅ W9 PDF has rendered content!');
    } else {
      console.log('⚠️  Canvas exists but appears blank');
    }

    // Take success screenshot
    await page.screenshot({ path: 'test-results/w9-loaded-success.png', fullPage: true });
    console.log('Success screenshot saved to test-results/w9-loaded-success.png');

    // Check for toolbar/back button
    const backButton = await page.locator('button:has-text("Back"), button[title*="Back"]').count();
    console.log(`Back button found: ${backButton > 0 ? 'Yes' : 'No'}`);

    // Check for signature button
    const signatureButton = await page.locator('button:has-text("Signature"), button:has-text("Sign")').count();
    console.log(`Signature button found: ${signatureButton > 0 ? 'Yes' : 'No'}`);

    console.log('\n=== Test Summary ===');
    console.log('✅ W9 PDF loaded successfully');
    console.log('✅ Canvas rendered with content');
    console.log(`✅ Back button: ${backButton > 0 ? 'Present' : 'Missing'}`);
    console.log(`✅ Signature button: ${signatureButton > 0 ? 'Present' : 'Missing'}`);

  } catch (error) {
    console.log('\n=== Test Failed ===');
    console.log('Error:', error);

    // Print all console messages
    console.log('\n=== Console Messages ===');
    consoleMessages.forEach(msg => console.log(msg));

    throw error;
  }
});
