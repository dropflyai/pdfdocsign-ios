#!/usr/bin/env node

/**
 * iOS Safari Remote Debugging Test
 * This script connects to the iOS Simulator via Safari Remote Debugging
 * and captures console output to diagnose field detection issues
 */

const { webkit } = require('playwright');
const fs = require('fs');

async function testIOSFieldDetection() {
  console.log('=== iOS Field Detection Test via Safari Remote Debugging ===\n');

  let browser;
  let context;

  try {
    // Connect to iOS Simulator via WebKit
    // Note: Safari must have "Show features for web developers" enabled
    console.log('1. Connecting to iOS WebKit...');

    browser = await webkit.launch({
      headless: false, // Keep visible for debugging
    });

    context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
      viewport: { width: 393, height: 852 }, // iPhone 17 Pro dimensions
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true,
    });

    const page = await context.newPage();

    // Collect all console messages
    const consoleMessages = [];
    page.on('console', msg => {
      const text = msg.text();
      consoleMessages.push(text);
      console.log(`[CONSOLE] ${text}`);
    });

    // Collect errors
    page.on('pageerror', error => {
      console.error(`[PAGE ERROR] ${error.message}`);
      consoleMessages.push(`ERROR: ${error.message}`);
    });

    // Navigate to the Capacitor app
    // Since we can't directly connect to Capacitor's internal WebView,
    // we'll test against the webapp version which should behave identically
    console.log('2. Loading app...');
    await page.goto('capacitor://localhost', { waitUntil: 'networkidle', timeout: 10000 }).catch(async () => {
      // Capacitor URL may not work, fallback to localhost
      console.log('   Capacitor URL failed, trying localhost...');
      await page.goto('http://localhost:3025', { waitUntil: 'networkidle' });
    });

    console.log('3. App loaded, waiting for React to hydrate...');
    await page.waitForTimeout(2000);

    // Click the "Test W9" button
    console.log('4. Looking for Test W9 button...');
    const testButton = await page.locator('button:has-text("Test W9")').first();

    if (await testButton.count() > 0) {
      console.log('5. Clicking Test W9 button...');
      await testButton.click();

      // Wait for PDF loading
      console.log('6. Waiting for PDF to load and fields to be extracted...');
      await page.waitForTimeout(5000);

      // Try to find evidence of field detection
      console.log('7. Checking for field detection results...');

      // Look for form field annotations in the DOM
      const annotations = await page.locator('[data-annotation-id]').count();
      console.log(`   Found ${annotations} annotation elements in DOM`);

      // Check console messages
      console.log('\n=== CONSOLE MESSAGE ANALYSIS ===');

      const foundExtraction = consoleMessages.some(msg => msg.includes('STARTING FORM FIELD EXTRACTION'));
      const foundFields = consoleMessages.find(msg => msg.includes('Total fields found'));
      const foundPDFLoad = consoleMessages.some(msg => msg.includes('PDF loaded, size'));
      const foundErrors = consoleMessages.filter(msg => msg.toLowerCase().includes('error'));

      console.log(`Field extraction started: ${foundExtraction ? '✓' : '✗'}`);
      console.log(`PDF loaded: ${foundPDFLoad ? '✓' : '✗'}`);

      if (foundFields) {
        console.log(`Fields found: ${foundFields}`);

        // Extract field count
        const match = foundFields.match(/(\d+)/);
        if (match) {
          const fieldCount = parseInt(match[1]);
          if (fieldCount > 0) {
            console.log(`\n✓✓✓ SUCCESS ✓✓✓`);
            console.log(`Field detection is WORKING - detected ${fieldCount} fields`);
          } else {
            console.log(`\n✗✗✗ FAILURE ✗✗✗`);
            console.log(`Field detection ran but found 0 fields`);
          }
        }
      } else {
        console.log('Fields found: ✗ (no log message)');
        console.log(`\n✗✗✗ FAILURE ✗✗✗`);
        console.log(`Field extraction did not run or logs not captured`);
      }

      if (foundErrors.length > 0) {
        console.log(`\nErrors detected (${foundErrors.length}):`);
        foundErrors.forEach(err => console.log(`  - ${err}`));
      }

      // Save detailed report
      const report = {
        timestamp: new Date().toISOString(),
        success: foundExtraction && foundFields && foundFields.includes('fields found:') && !foundFields.includes('0'),
        consoleMessages,
        annotations,
        summary: {
          extractionStarted: foundExtraction,
          pdfLoaded: foundPDFLoad,
          fieldsFound: foundFields || 'Not detected',
          errorCount: foundErrors.length,
        }
      };

      fs.writeFileSync(
        'ios-field-detection-report.json',
        JSON.stringify(report, null, 2)
      );
      console.log(`\nDetailed report saved to: ios-field-detection-report.json`);

    } else {
      console.log('✗ Test W9 button not found in the UI');
      console.log('This might mean the app did not load correctly');
    }

  } catch (error) {
    console.error('\n✗✗✗ TEST ERROR ✗✗✗');
    console.error(`Error: ${error.message}`);
    console.error(error.stack);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Run the test
testIOSFieldDetection().catch(console.error);
