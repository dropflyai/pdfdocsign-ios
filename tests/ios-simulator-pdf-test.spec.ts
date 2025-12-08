import { test, expect, _electron as electron } from '@playwright/test';

/**
 * iOS Simulator PDF Loading Test
 *
 * This test verifies that PDFs load correctly in the iOS Capacitor build
 * by connecting to the app running in the iOS simulator.
 */

test.use({
  viewport: { width: 393, height: 852 }  // iPhone 14 dimensions
});

test('iOS Simulator - Test W9 Button PDF Loading', async ({ browser }) => {
  console.log('🧪 Testing PDF loading in iOS simulator...');

  // Connect to the iOS app running in simulator via WebKit
  // The app should be accessible via capacitor:// or localhost
  const context = await browser.newContext({
    // iPhone 14 user agent
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148'
  });

  const page = await context.newPage();

  // Listen for console logs
  page.on('console', msg => {
    console.log(`[iOS Console] ${msg.type()}: ${msg.text()}`);
  });

  // Listen for page errors
  page.on('pageerror', error => {
    console.error(`[iOS Error] ${error.message}`);
  });

  try {
    // Try to connect to the app - it's served via Capacitor's web server
    // In the simulator, Capacitor apps use a local web server
    await page.goto('capacitor://localhost', {
      waitUntil: 'networkidle',
      timeout: 10000
    });
    console.log('✓ Connected to iOS app');
  } catch (e) {
    console.log('⚠️  Could not connect via capacitor://, trying http://localhost...');
    await page.goto('http://localhost', {
      waitUntil: 'networkidle',
      timeout: 10000
    });
  }

  // Wait for the Test W9 button
  const testButton = page.locator('button:has-text("Test W9")');
  await expect(testButton).toBeVisible({ timeout: 10000 });
  console.log('✓ Found Test W9 button');

  // Click the Test W9 button
  await testButton.click();
  console.log('✓ Clicked Test W9 button');

  // Wait for PDF to load
  await page.waitForTimeout(5000);

  // Check if canvas appeared (PDF loaded)
  const canvas = page.locator('canvas');
  const canvasCount = await canvas.count();

  if (canvasCount > 0) {
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

    if (hasContent) {
      console.log('✅ PDF rendered successfully in iOS simulator!');
    } else {
      console.log('❌ Canvas is empty - PDF did not render');
      throw new Error('PDF canvas is empty');
    }
  } else {
    console.log('❌ No canvas found - PDF did not load');

    // Check if still loading
    const loadingText = await page.locator('text=Loading PDF').count();
    if (loadingText > 0) {
      console.log('⏳ Stuck on "Loading PDF..." screen');
    }

    throw new Error('PDF did not load - no canvas element');
  }

  // Take screenshot for visual verification
  await page.screenshot({
    path: 'test-results/ios-simulator-pdf-loaded.png',
    fullPage: true
  });
  console.log('📸 Screenshot saved');

  await context.close();
});

test('iOS Simulator - Check Layout and Margins', async ({ browser }) => {
  console.log('🧪 Testing layout and margins in iOS simulator...');

  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148'
  });

  const page = await context.newPage();

  try {
    await page.goto('capacitor://localhost', { waitUntil: 'networkidle' });
  } catch (e) {
    await page.goto('http://localhost', { waitUntil: 'networkidle' });
  }

  // Wait for page to load
  await page.waitForTimeout(2000);

  // Check viewport height
  const viewportHeight = await page.evaluate(() => window.innerHeight);
  console.log('Viewport height:', viewportHeight);

  // Check if all content is visible
  const uploadArea = page.locator('.border-dashed, [data-testid="upload-area"]').first();
  const isUploadAreaVisible = await uploadArea.isVisible();
  console.log('Upload area visible:', isUploadAreaVisible);

  // Check for bottom features section
  const featuresSection = page.locator('.grid.grid-cols-1');
  if (await featuresSection.count() > 0) {
    const featuresSectionVisible = await featuresSection.isVisible();
    console.log('Features section visible:', featuresSectionVisible);

    if (featuresSectionVisible) {
      const box = await featuresSection.boundingBox();
      if (box) {
        console.log('Features section position:', { y: box.y, bottom: box.y + box.height });
        console.log('Is within viewport:', (box.y + box.height) <= viewportHeight);

        if ((box.y + box.height) > viewportHeight) {
          console.log('⚠️  Warning: Features section is cut off at bottom');
        } else {
          console.log('✅ All content is visible within viewport');
        }
      }
    }
  }

  // Take screenshot
  await page.screenshot({
    path: 'test-results/ios-simulator-layout.png',
    fullPage: true
  });
  console.log('📸 Layout screenshot saved');

  await context.close();
});
