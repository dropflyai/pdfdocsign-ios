import { test, expect } from '@playwright/test';

/**
 * Annotation Rendering Test
 * Tests if detected form fields are actually rendering as annotations on the page
 */

test.describe('Annotation Rendering', () => {
  test('should render detected form fields as visible annotations', async ({ page }) => {
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

    // === CHECK 1: Verify fields were detected ===
    console.log('\n=== CHECK 1: Field Detection ===');
    const fieldsFoundMsg = consoleMessages.find(msg => msg.includes('Total fields found'));
    console.log(`Fields found message: ${fieldsFoundMsg || '✗ Not found'}`);

    let fieldCount = 0;
    if (fieldsFoundMsg) {
      const match = fieldsFoundMsg.match(/Total fields found:\s*(\d+)/);
      if (match) {
        fieldCount = parseInt(match[1]);
        console.log(`✓ Detected ${fieldCount} fields`);
      }
    }

    // === CHECK 2: Verify annotations were created ===
    console.log('\n=== CHECK 2: Annotation Creation ===');
    const annotationsMsg = consoleMessages.find(msg => msg.includes('Total annotations created'));
    console.log(`Annotations created message: ${annotationsMsg || '✗ Not found'}`);

    const annotationsStateMsg = consoleMessages.find(msg => msg.includes('Annotations state updated'));
    console.log(`Annotations state updated: ${annotationsStateMsg ? '✓' : '✗'}`);

    // === CHECK 3: Check annotations in state ===
    console.log('\n=== CHECK 3: Annotations in React State ===');
    const annotationsUpdatedMsgs = consoleMessages.filter(msg => msg.includes('Annotations updated:'));
    console.log(`Annotations updated messages: ${annotationsUpdatedMsgs.length}`);

    if (annotationsUpdatedMsgs.length > 0) {
      console.log('Last annotations update:', annotationsUpdatedMsgs[annotationsUpdatedMsgs.length - 1].substring(0, 200));
    }

    // === CHECK 4: Verify annotations are in the DOM ===
    console.log('\n=== CHECK 4: Annotations in DOM ===');

    // Check for input fields (text form fields)
    const inputFields = await page.locator('input[type="text"]').count();
    console.log(`Text input fields in DOM: ${inputFields}`);

    // Check for checkbox fields
    const checkboxFields = await page.locator('[role="checkbox"]').count();
    console.log(`Checkbox fields in DOM: ${checkboxFields}`);

    // Check for any positioned divs (annotations)
    const positionedDivs = await page.locator('div[style*="position: absolute"]').count();
    console.log(`Positioned divs in DOM: ${positionedDivs}`);

    // === CHECK 5: PDF Sizing ===
    console.log('\n=== CHECK 5: PDF Sizing ===');

    // Get the canvas (PDF page) dimensions
    const canvas = page.locator('canvas').first();
    const canvasBounds = await canvas.boundingBox();

    if (canvasBounds) {
      console.log(`PDF Canvas dimensions: ${canvasBounds.width}x${canvasBounds.height}`);

      // Get viewport width
      const viewportWidth = await page.evaluate(() => window.innerWidth);
      console.log(`Viewport width: ${viewportWidth}`);

      if (canvasBounds.width > viewportWidth) {
        console.log(`⚠️ PDF is OVERSIZED (${canvasBounds.width}px > ${viewportWidth}px viewport)`);
      } else {
        console.log(`✓ PDF fits viewport`);
      }
    } else {
      console.log('✗ Could not get canvas bounds');
    }

    // === CHECK 6: Page Scale ===
    console.log('\n=== CHECK 6: Page Scale ===');
    const pageScaleMsg = consoleMessages.find(msg => msg.includes('Calculated scale'));
    console.log(`Page scale message: ${pageScaleMsg || '✗ Not found'}`);

    const pageRenderMsg = consoleMessages.find(msg => msg.includes('Page rendered'));
    console.log(`Page rendered message: ${pageRenderMsg || '✗ Not found'}`);

    // === SUMMARY ===
    console.log('\n=== SUMMARY ===');
    console.log(`Fields detected: ${fieldCount}`);
    console.log(`Input fields rendered: ${inputFields}`);
    console.log(`Checkbox fields rendered: ${checkboxFields}`);
    console.log(`Total positioned elements: ${positionedDivs}`);

    const totalAnnotations = inputFields + checkboxFields;
    console.log(`Total annotation elements: ${totalAnnotations}`);

    if (fieldCount > 0 && totalAnnotations === 0) {
      console.log('\n❌ ISSUE FOUND: Fields detected but NO annotations rendered!');
    } else if (fieldCount > 0 && totalAnnotations > 0) {
      console.log(`\n✓ SUCCESS: ${totalAnnotations} annotations rendered for ${fieldCount} detected fields`);
    } else if (fieldCount === 0) {
      console.log('\n❌ ISSUE: No fields detected at all');
    }

    // Take screenshot
    await page.screenshot({ path: 'annotation-rendering-test.png', fullPage: true });
    console.log('\nScreenshot saved: annotation-rendering-test.png');

    // Assertions
    expect(fieldCount, 'Should detect fields').toBeGreaterThan(0);
    expect(totalAnnotations, 'Should render annotations for detected fields').toBeGreaterThan(0);
  });
});
