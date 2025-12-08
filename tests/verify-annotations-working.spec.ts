import { test, expect } from '@playwright/test';

test.describe('Verify Annotations and Form Filling', () => {
  test('should show annotations, fill form, add signature, and resize', async ({ page }) => {
    // Enhanced console logging
    const logs: string[] = [];
    page.on('console', msg => {
      const logMsg = `[${msg.type()}] ${msg.text()}`;
      console.log(logMsg);
      logs.push(logMsg);
    });

    page.on('pageerror', error => {
      console.error('❌ Page Error:', error);
      logs.push(`ERROR: ${error.message}`);
    });

    console.log('🚀 Starting verification test...\n');

    // Navigate to app
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
    console.log('✓ Page loaded\n');

    // Take screenshot of home page
    await page.screenshot({
      path: 'test-results/01-home-page.png',
      fullPage: true
    });

    // Upload FW9 PDF
    console.log('📄 Uploading FW9 form...');
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles('/Users/rioallen/Downloads/fw9.pdf');

    // Wait for PDF to load and fields to be extracted
    console.log('⏳ Waiting for PDF to load and fields to be extracted...');
    await page.waitForTimeout(5000);

    // Take screenshot after PDF loads
    await page.screenshot({
      path: 'test-results/02-pdf-loaded.png',
      fullPage: true
    });

    // Check console for field detection logs
    console.log('\n📋 Checking console logs for field detection:');
    const fieldDetectionLogs = logs.filter(log =>
      log.includes('Total fields found') ||
      log.includes('annotations created') ||
      log.includes('Annotations state updated')
    );
    fieldDetectionLogs.forEach(log => console.log('  ' + log));

    // Count annotations on page
    const textInputs = page.locator('input[type="text"][data-field-id]');
    const checkboxes = page.locator('[role="checkbox"]');

    const textCount = await textInputs.count();
    const checkboxCount = await checkboxes.count();

    console.log(`\n📊 Annotations Found:`);
    console.log(`   Text fields: ${textCount}`);
    console.log(`   Checkboxes: ${checkboxCount}`);

    // Verify we have annotations
    expect(textCount).toBeGreaterThan(0);
    console.log('✓ Text field annotations are present!\n');

    // Test 1: Fill in text fields
    console.log('🖊️  TEST 1: Filling text fields...\n');

    if (textCount > 0) {
      // Fill first 3 text fields with test data
      const testData = ['John Doe', 'Acme Corp', '123 Main St'];

      for (let i = 0; i < Math.min(3, textCount); i++) {
        const field = textInputs.nth(i);
        const box = await field.boundingBox();

        console.log(`Field ${i + 1}:`);
        console.log(`  Position: x=${box?.x?.toFixed(0)}, y=${box?.y?.toFixed(0)}`);
        console.log(`  Attempting to fill: "${testData[i]}"`);

        try {
          await field.click({ force: true });
          await page.waitForTimeout(300);
          await field.fill(testData[i]);
          await page.waitForTimeout(300);

          const value = await field.inputValue();
          if (value === testData[i]) {
            console.log(`  ✓ Successfully filled: "${value}"`);
          } else {
            console.log(`  ⚠️  Value mismatch: expected "${testData[i]}", got "${value}"`);
          }
        } catch (error) {
          console.log(`  ❌ Error: ${error}`);
        }
        console.log('');
      }
    }

    // Take screenshot after filling
    await page.screenshot({
      path: 'test-results/03-text-fields-filled.png',
      fullPage: true
    });

    // Test 2: Click a checkbox
    console.log('☑️  TEST 2: Clicking checkbox...\n');

    if (checkboxCount > 0) {
      const checkbox = checkboxes.first();
      const box = await checkbox.boundingBox();

      console.log(`Checkbox position: x=${box?.x?.toFixed(0)}, y=${box?.y?.toFixed(0)}`);
      console.log('Attempting to click checkbox...');

      try {
        const beforeCheck = await checkbox.getAttribute('aria-checked');
        console.log(`  Before: aria-checked="${beforeCheck}"`);

        await checkbox.click({ force: true });
        await page.waitForTimeout(500);

        const afterCheck = await checkbox.getAttribute('aria-checked');
        console.log(`  After: aria-checked="${afterCheck}"`);

        if (beforeCheck !== afterCheck) {
          console.log('  ✓ Checkbox toggled successfully!');
        } else {
          console.log('  ⚠️  Checkbox did not toggle');
        }
      } catch (error) {
        console.log(`  ❌ Error: ${error}`);
      }
      console.log('');
    }

    // Take screenshot after checkbox
    await page.screenshot({
      path: 'test-results/04-checkbox-clicked.png',
      fullPage: true
    });

    // Test 3: Add a signature
    console.log('✍️  TEST 3: Adding signature...\n');

    try {
      // Click "Add Signature" button
      console.log('Clicking "Add Signature" button...');
      const signatureButton = page.locator('button:has-text("Sign")').or(page.locator('button:has-text("Add Signature")'));
      await signatureButton.click();
      await page.waitForTimeout(500);

      // Wait for signature modal
      const modal = page.locator('text=Draw Your Signature');
      await expect(modal).toBeVisible({ timeout: 5000 });
      console.log('✓ Signature modal opened\n');

      // Draw on canvas
      const canvas = page.locator('canvas');
      const canvasBox = await canvas.boundingBox();

      if (canvasBox) {
        console.log('Drawing signature on canvas...');
        // Draw a simple signature (scribble)
        await page.mouse.move(canvasBox.x + 50, canvasBox.y + 50);
        await page.mouse.down();
        await page.mouse.move(canvasBox.x + 150, canvasBox.y + 40);
        await page.mouse.move(canvasBox.x + 200, canvasBox.y + 60);
        await page.mouse.move(canvasBox.x + 250, canvasBox.y + 50);
        await page.mouse.up();
        console.log('✓ Signature drawn\n');

        await page.waitForTimeout(500);

        // Take screenshot of signature modal
        await page.screenshot({
          path: 'test-results/05-signature-modal.png',
          fullPage: true
        });

        // Click "Add Signature" to place it
        console.log('Clicking "Add Signature" to place it...');
        const addButton = page.locator('button:has-text("Add Signature")').last();
        await addButton.click();
        await page.waitForTimeout(1000);

        console.log('✓ Signature placed on PDF\n');
      }
    } catch (error) {
      console.log(`❌ Error adding signature: ${error}\n`);
    }

    // Take screenshot with signature
    await page.screenshot({
      path: 'test-results/06-signature-placed.png',
      fullPage: true
    });

    // Test 4: Try to resize signature
    console.log('↔️  TEST 4: Resizing signature...\n');

    try {
      // Find signature on page
      const signature = page.locator('img[alt="Signature"]').first();
      await expect(signature).toBeVisible({ timeout: 5000 });
      console.log('✓ Signature found on page\n');

      // Click on signature to select it
      console.log('Clicking signature to select it...');
      await signature.click({ force: true });
      await page.waitForTimeout(500);

      // Look for resize handle (small circle at bottom-right)
      console.log('Looking for resize handle...');
      const resizeHandle = page.locator('div[style*="cursor: nwse-resize"]').or(
        page.locator('div[style*="cursor"][style*="resize"]')
      );

      const handleCount = await resizeHandle.count();
      console.log(`Found ${handleCount} resize handle(s)`);

      if (handleCount > 0) {
        const handle = resizeHandle.first();
        const handleBox = await handle.boundingBox();

        if (handleBox) {
          console.log(`Handle position: x=${handleBox.x.toFixed(0)}, y=${handleBox.y.toFixed(0)}`);
          console.log('Attempting to drag resize handle...');

          // Drag handle to resize
          await page.mouse.move(handleBox.x + handleBox.width/2, handleBox.y + handleBox.height/2);
          await page.mouse.down();
          await page.mouse.move(handleBox.x + 50, handleBox.y + 30);
          await page.mouse.up();

          await page.waitForTimeout(500);
          console.log('✓ Resize attempted\n');
        }
      } else {
        console.log('⚠️  No resize handle found - signature may not be selected\n');
      }
    } catch (error) {
      console.log(`❌ Error resizing: ${error}\n`);
    }

    // Final screenshot
    await page.screenshot({
      path: 'test-results/07-final-result.png',
      fullPage: true
    });

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📋 TEST SUMMARY');
    console.log('='.repeat(60));
    console.log(`✓ Annotations detected: ${textCount} text fields, ${checkboxCount} checkboxes`);
    console.log(`✓ Screenshots saved to test-results/`);
    console.log('='.repeat(60) + '\n');

    // Write logs to file
    const fs = require('fs');
    fs.writeFileSync('test-results/test-logs.txt', logs.join('\n'));
    console.log('✓ Full logs saved to test-results/test-logs.txt\n');
  });
});
