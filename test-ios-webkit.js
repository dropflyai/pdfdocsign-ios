const { webkit } = require('playwright');

(async () => {
  console.log('🧪 Testing iOS app with WebKit...');

  const browser = await webkit.launch();
  const context = await browser.newContext({
    viewport: { width: 393, height: 852 },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148',
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
  });

  const page = await context.newPage();

  page.on('console', msg => {
    console.log('[Browser] ' + msg.type() + ': ' + msg.text());
  });

  page.on('pageerror', error => {
    console.error('[Error] ' + error.message);
  });

  try {
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle', timeout: 15000 });
    console.log('✓ Page loaded');

    const testButton = await page.locator('button:has-text("Test W9")');
    await testButton.waitFor({ state: 'visible', timeout: 5000 });
    console.log('✓ Found Test W9 button');

    await testButton.click();
    console.log('✓ Clicked Test W9 button');

    await page.waitForTimeout(5000);

    const canvasCount = await page.locator('canvas').count();
    console.log('Found ' + canvasCount + ' canvas elements');

    if (canvasCount > 0) {
      const hasContent = await page.evaluate(() => {
        const canvas = document.querySelector('canvas');
        if (!canvas) return false;

        const ctx = canvas.getContext('2d');
        if (!ctx) return false;

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const hasPixels = imageData.data.some(pixel => pixel !== 0);

        return hasPixels;
      });

      if (hasContent) {
        console.log('✅ PDF loaded and rendered successfully!');
      } else {
        console.log('❌ Canvas is empty - PDF did not render');
      }
    } else {
      console.log('❌ No canvas found - PDF did not load');
    }

    await page.screenshot({ path: 'test-results/ios-webkit-test.png', fullPage: true });
    console.log('📸 Screenshot saved');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await browser.close();
  }
})();
