import { test, expect } from '@playwright/test';
import path from 'path';

test('Debug PDF loading - check what happens step by step', async ({ page }) => {
  // Listen for all console messages
  const consoleMessages: string[] = [];
  page.on('console', msg => {
    consoleMessages.push(`${msg.type()}: ${msg.text()}`);
    console.log(`[CONSOLE ${msg.type()}]`, msg.text());
  });

  // Listen for page errors
  page.on('pageerror', error => {
    console.log('[PAGE ERROR]', error.message);
  });

  // Listen for network requests
  page.on('request', request => {
    if (request.url().includes('pdf') || request.url().includes('blob')) {
      console.log('[REQUEST]', request.method(), request.url());
    }
  });

  console.log('1. Navigating to home page...');
  await page.goto('/');

  console.log('2. Page loaded, looking for file input...');
  const fileInput = page.locator('input[type="file"]');
  await expect(fileInput).toBeVisible();
  console.log('✓ File input found');

  const testPdfPath = path.join(__dirname, '../public/test.pdf');
  console.log('3. Uploading PDF from:', testPdfPath);

  await fileInput.setInputFiles(testPdfPath);
  console.log('✓ File set on input');

  console.log('4. Waiting for PDF viewer to appear...');
  try {
    // Wait for canvas (PDF should render to canvas)
    await page.waitForSelector('canvas', { timeout: 10000 });
    console.log('✓ Canvas appeared - PDF loaded!');

    // Check if there's any error text
    const errorText = await page.locator('text=/error|failed|couldn\'t/i').count();
    if (errorText > 0) {
      console.log('⚠️  Error text found on page');
      const text = await page.locator('text=/error|failed|couldn\'t/i').first().textContent();
      console.log('Error message:', text);
    }

    // Get canvas count
    const canvasCount = await page.locator('canvas').count();
    console.log(`Found ${canvasCount} canvas element(s)`);

    // Check if PDF is actually rendered (canvas should have content)
    const hasContent = await page.evaluate(() => {
      const canvas = document.querySelector('canvas');
      if (!canvas) return false;
      const ctx = canvas.getContext('2d');
      if (!ctx) return false;
      // Check if canvas has been drawn to
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      return imageData.data.some(pixel => pixel !== 0);
    });

    if (hasContent) {
      console.log('✅ PDF has rendered content');
    } else {
      console.log('⚠️  Canvas exists but appears blank');
    }

    // Take screenshot for visual confirmation
    await page.screenshot({ path: 'test-results/pdf-loaded-screenshot.png', fullPage: true });
    console.log('Screenshot saved to test-results/pdf-loaded-screenshot.png');

  } catch (error) {
    console.log('❌ PDF did not load');
    console.log('Error:', error);

    // Take screenshot of failed state
    await page.screenshot({ path: 'test-results/pdf-failed-screenshot.png', fullPage: true });
    console.log('Screenshot saved to test-results/pdf-failed-screenshot.png');

    // Print page HTML to see what's there
    const html = await page.content();
    console.log('Page HTML length:', html.length);

    // Check for loading states
    const loadingCount = await page.locator('text=/loading|wait/i').count();
    console.log(`Found ${loadingCount} loading indicator(s)`);
  }

  console.log('\n=== Console messages from page ===');
  consoleMessages.forEach(msg => console.log(msg));
});

test('Test with a real-world PDF from URL', async ({ page }) => {
  console.log('Testing if app can handle PDF URLs...');

  await page.goto('/');

  // Some apps handle PDFs via URL parameter
  const pdfUrl = 'http://localhost:3025/test.pdf';
  console.log('Navigating to PDF URL:', pdfUrl);

  await page.goto(pdfUrl);
  await page.waitForTimeout(2000);

  const pageContent = await page.content();
  console.log('Response includes PDF?', pageContent.includes('%PDF'));
});
