import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

test.use({
  viewport: { width: 390, height: 844 }  // iPhone 14 Pro dimensions
});

test('Visual Verification - Layout and PDF Loading', async ({ page }) => {
  console.log('🔍 Starting visual verification test...\n');

  // Navigate to the app
  await page.goto('http://localhost:3025', { waitUntil: 'networkidle' });
  console.log('✓ App loaded at http://localhost:3025\n');

  // Wait a moment for any animations
  await page.waitForTimeout(1000);

  // ============================================
  // STEP 1: VERIFY INITIAL LAYOUT
  // ============================================
  console.log('📐 STEP 1: Verifying initial layout...');

  // Take screenshot of initial state
  await page.screenshot({
    path: 'test-results/01-initial-layout.png',
    fullPage: true
  });
  console.log('   📸 Screenshot saved: 01-initial-layout.png');

  // Check if Test W9 button is visible
  const testW9Button = page.locator('button:has-text("Test W9")');
  const isTestW9Visible = await testW9Button.isVisible();
  console.log(`   ${isTestW9Visible ? '✅' : '❌'} Test W9 button visible: ${isTestW9Visible}`);

  if (!isTestW9Visible) {
    console.log('   ⚠️  WARNING: Test W9 button not found!');
  }

  // Check if bottom features are visible (Sign, Edit, Private)
  const signFeature = page.locator('text=Sign').first();
  const editFeature = page.locator('text=Edit').first();
  const privateFeature = page.locator('text=Private').first();

  const isSignVisible = await signFeature.isVisible();
  const isEditVisible = await editFeature.isVisible();
  const isPrivateVisible = await privateFeature.isVisible();

  console.log(`   ${isSignVisible ? '✅' : '❌'} "Sign" feature visible: ${isSignVisible}`);
  console.log(`   ${isEditVisible ? '✅' : '❌'} "Edit" feature visible: ${isEditVisible}`);
  console.log(`   ${isPrivateVisible ? '✅' : '❌'} "Private" feature visible: ${isPrivateVisible}`);

  // Check viewport height and scrollability
  const bodyHeight = await page.evaluate(() => document.body.scrollHeight);
  const viewportHeight = await page.evaluate(() => window.innerHeight);
  const isScrollable = bodyHeight > viewportHeight;

  console.log(`   📏 Body height: ${bodyHeight}px`);
  console.log(`   📏 Viewport height: ${viewportHeight}px`);
  console.log(`   ${isScrollable ? '⚠️' : '✅'} Content is ${isScrollable ? 'SCROLLABLE (may be cut off)' : 'NOT scrollable (fits in viewport)'}`);

  // Get bounding boxes to check if elements are truly visible
  if (isSignVisible && isEditVisible && isPrivateVisible) {
    const signBox = await signFeature.boundingBox();
    const editBox = await editFeature.boundingBox();
    const privateBox = await privateFeature.boundingBox();

    console.log(`   📍 Sign position: y=${signBox?.y}, bottom=${(signBox?.y || 0) + (signBox?.height || 0)}`);
    console.log(`   📍 Edit position: y=${editBox?.y}, bottom=${(editBox?.y || 0) + (editBox?.height || 0)}`);
    console.log(`   📍 Private position: y=${privateBox?.y}, bottom=${(privateBox?.y || 0) + (privateBox?.height || 0)}`);

    const bottomMostY = Math.max(
      (signBox?.y || 0) + (signBox?.height || 0),
      (editBox?.y || 0) + (editBox?.height || 0),
      (privateBox?.y || 0) + (privateBox?.height || 0)
    );

    if (bottomMostY > viewportHeight) {
      console.log(`   ❌ LAYOUT ISSUE: Bottom features extend beyond viewport (${bottomMostY}px > ${viewportHeight}px)`);
    } else {
      console.log(`   ✅ Layout OK: Bottom features within viewport (${bottomMostY}px <= ${viewportHeight}px)`);
    }
  }

  console.log('');

  // ============================================
  // STEP 2: TEST W9 BUTTON CLICK
  // ============================================
  console.log('🧪 STEP 2: Testing W9 button click...');

  if (isTestW9Visible) {
    // Listen for console logs
    page.on('console', msg => {
      if (msg.text().includes('Loading') || msg.text().includes('PDF') || msg.text().includes('✅') || msg.text().includes('❌')) {
        console.log(`   [Browser] ${msg.text()}`);
      }
    });

    // Listen for errors
    page.on('pageerror', error => {
      console.log(`   ❌ [Error] ${error.message}`);
    });

    await testW9Button.click();
    console.log('   ✓ Clicked Test W9 button');

    // Wait for PDF to start loading
    await page.waitForTimeout(2000);

    // Take screenshot after clicking
    await page.screenshot({
      path: 'test-results/02-after-w9-click.png',
      fullPage: true
    });
    console.log('   📸 Screenshot saved: 02-after-w9-click.png');

    // Check if we see "Loading PDF..." or if canvas appears
    const loadingText = page.locator('text=Loading PDF');
    const canvas = page.locator('canvas');

    const isLoading = await loadingText.isVisible().catch(() => false);
    const hasCanvas = await canvas.count() > 0;

    console.log(`   ${isLoading ? '⏳' : '✓'} Loading state: ${isLoading ? 'Still loading' : 'Not in loading state'}`);
    console.log(`   ${hasCanvas ? '✅' : '❌'} Canvas element: ${hasCanvas ? 'Present' : 'Not found'}`);

    if (hasCanvas) {
      // Wait a bit more for rendering
      await page.waitForTimeout(3000);

      // Check if canvas has actual content
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

      console.log(`   ${hasContent ? '✅' : '❌'} Canvas content: ${hasContent ? 'Rendered with pixels' : 'Empty/blank'}`);

      // Take final screenshot with PDF
      await page.screenshot({
        path: 'test-results/03-pdf-loaded.png',
        fullPage: true
      });
      console.log('   📸 Screenshot saved: 03-pdf-loaded.png');
    } else if (isLoading) {
      console.log('   ⚠️  WARNING: Stuck on loading screen');

      // Wait longer and check again
      await page.waitForTimeout(5000);
      const stillLoading = await loadingText.isVisible().catch(() => false);
      const nowHasCanvas = await canvas.count() > 0;

      console.log(`   After 5s wait - Still loading: ${stillLoading}, Has canvas: ${nowHasCanvas}`);

      await page.screenshot({
        path: 'test-results/03-stuck-loading.png',
        fullPage: true
      });
      console.log('   📸 Screenshot saved: 03-stuck-loading.png');
    }
  } else {
    console.log('   ❌ Cannot test - Test W9 button not visible');
  }

  console.log('');

  // ============================================
  // FINAL SUMMARY
  // ============================================
  console.log('📊 VERIFICATION SUMMARY:');
  console.log('========================');
  console.log(`Layout Issues:`);
  console.log(`  - Test W9 button visible: ${isTestW9Visible ? 'YES ✅' : 'NO ❌'}`);
  console.log(`  - Bottom features visible: ${isSignVisible && isEditVisible && isPrivateVisible ? 'YES ✅' : 'NO ❌'}`);
  console.log(`  - Content fits viewport: ${!isScrollable ? 'YES ✅' : 'NO (scrollable) ⚠️'}`);
  console.log('');
  console.log('Screenshots saved in test-results/:');
  console.log('  - 01-initial-layout.png');
  console.log('  - 02-after-w9-click.png');
  console.log('  - 03-pdf-loaded.png (or 03-stuck-loading.png)');
  console.log('');

  // Create a summary report
  const report = {
    timestamp: new Date().toISOString(),
    layout: {
      testW9ButtonVisible: isTestW9Visible,
      bottomFeaturesVisible: isSignVisible && isEditVisible && isPrivateVisible,
      contentFitsViewport: !isScrollable,
      viewportHeight,
      bodyHeight
    },
    screenshots: [
      '01-initial-layout.png',
      '02-after-w9-click.png',
      hasCanvas ? '03-pdf-loaded.png' : '03-stuck-loading.png'
    ]
  };

  fs.writeFileSync(
    'test-results/verification-report.json',
    JSON.stringify(report, null, 2)
  );
  console.log('📄 Report saved: verification-report.json');
});
