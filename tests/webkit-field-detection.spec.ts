import { test, expect } from '@playwright/test';

/**
 * WebKit Field Detection Test
 * This tests field detection using WebKit engine (same as iOS Safari)
 * to diagnose if the issue is WebKit-specific
 */

test.describe('WebKit Field Detection', () => {
  test('should detect form fields in W9 PDF using WebKit', async ({ page }) => {
    const consoleMessages: string[] = [];

    // Capture all console output
    page.on('console', msg => {
      const text = msg.text();
      consoleMessages.push(text);
      console.log(`[CONSOLE] ${text}`);
    });

    // Capture errors
    page.on('pageerror', error => {
      console.error(`[PAGE ERROR] ${error.message}`);
      consoleMessages.push(`ERROR: ${error.message}`);
    });

    // Navigate to app
    console.log('Loading app...');
    await page.goto('http://localhost:3025', { waitUntil: 'networkidle' });

    // Wait for React
    await page.waitForTimeout(1000);

    // Click Test W9 button
    console.log('Clicking Test W9 button...');
    const testButton = page.locator('button:has-text("Test W9")');
    await expect(testButton).toBeVisible();
    await testButton.click();

    // Wait for PDF loading and field extraction
    console.log('Waiting for PDF field extraction...');
    await page.waitForTimeout(8000);

    // Analyze console messages
    console.log('\n=== ANALYSIS ===');

    const extractionStarted = consoleMessages.some(msg => msg.includes('STARTING FORM FIELD EXTRACTION'));
    const pdfLoaded = consoleMessages.some(msg => msg.includes('PDF loaded, size'));
    const fieldsFoundMsg = consoleMessages.find(msg => msg.includes('Total fields found'));
    const errors = consoleMessages.filter(msg =>
      msg.toLowerCase().includes('error') &&
      !msg.includes('0 errors')
    );

    console.log(`Extraction started: ${extractionStarted ? '✓' : '✗'}`);
    console.log(`PDF loaded: ${pdfLoaded ? '✓' : '✗'}`);
    console.log(`Fields found message: ${fieldsFoundMsg || '✗'}`);
    console.log(`Errors: ${errors.length}`);

    if (errors.length > 0) {
      console.log('\nERRORS DETECTED:');
      errors.forEach(err => console.log(`  - ${err}`));
    }

    // Check if field annotations appear in the DOM
    const annotations = await page.locator('[data-annotation-id]').count();
    console.log(`Annotations in DOM: ${annotations}`);

    // Assertions
    expect(extractionStarted, 'Field extraction should start').toBe(true);
    expect(pdfLoaded, 'PDF should load').toBe(true);
    expect(fieldsFoundMsg, 'Should find fields message in console').toBeTruthy();

    // Extract field count from console message
    if (fieldsFoundMsg) {
      const match = fieldsFoundMsg.match(/Total fields found:\s*(\d+)/);
      if (match) {
        const fieldCount = parseInt(match[1]);
        console.log(`\nField count: ${fieldCount}`);
        expect(fieldCount, 'Should detect at least 1 field').toBeGreaterThan(0);

        if (fieldCount > 0) {
          console.log('\n✓✓✓ TEST PASSED ✓✓✓');
          console.log(`Field detection works in WebKit - detected ${fieldCount} fields`);
        }
      }
    }

    // Check for specific iOS/WebKit compatibility issues
    const webkitIssues = consoleMessages.filter(msg =>
      msg.includes('pdf-lib') ||
      msg.includes('PDFDocument') ||
      msg.includes('ArrayBuffer') ||
      msg.includes('Blob')
    );

    if (webkitIssues.length > 0) {
      console.log('\nPotential WebKit compatibility issues:');
      webkitIssues.forEach(issue => console.log(`  - ${issue}`));
    }

    // Take screenshot for visual verification
    await page.screenshot({ path: 'webkit-field-detection-test.png', fullPage: true });
    console.log('\nScreenshot saved: webkit-field-detection-test.png');
  });
});
