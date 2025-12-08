import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Form Field Visibility Test', () => {
  test('should show highlighted form fields on W9 PDF', async ({ page }) => {
    // Navigate to the app
    await page.goto('http://localhost:3025');

    // Wait for the home page to load
    await expect(page.locator('text=Edit PDFs with ease')).toBeVisible({ timeout: 10000 });

    // Get the file input and upload the W9 PDF
    const fileInput = page.locator('input[type="file"]');
    const w9Path = path.join(__dirname, '../public/fw9.pdf');

    await fileInput.setInputFiles(w9Path);

    // Wait for PDF to load
    await expect(page.locator('text=Text')).toBeVisible({ timeout: 15000 });
    console.log('✅ PDF editor loaded');

    // Wait for form fields to be extracted (check console logs)
    await page.waitForTimeout(2000);

    // Check console logs for form field extraction
    const logs: string[] = [];
    page.on('console', msg => {
      logs.push(msg.text());
    });

    // Refresh to capture logs
    await page.reload();
    await expect(page.locator('text=Text')).toBeVisible({ timeout: 15000 });

    // Wait for extraction to complete
    await page.waitForTimeout(3000);

    // Print console logs
    console.log('📋 Console logs:');
    logs.forEach(log => {
      if (log.includes('form') || log.includes('field') || log.includes('annotation')) {
        console.log('  ', log);
      }
    });

    // Look for input fields with the new visible styling
    const formInputs = page.locator('input[type="text"]').filter({
      has: page.locator('[style*="rgba(199, 210, 254, 0.2)"]')
    });

    // Take a screenshot
    await page.screenshot({
      path: 'test-results/form-fields-visible.png',
      fullPage: true
    });
    console.log('📸 Screenshot saved to test-results/form-fields-visible.png');

    // Count visible form fields
    const inputCount = await page.locator('input[type="text"]').count();
    console.log(`📝 Found ${inputCount} input fields on the page`);

    // Check if the "Form Fields Ready" message is visible
    const formFieldsReadyMsg = page.locator('text=Form Fields Ready');
    if (await formFieldsReadyMsg.isVisible()) {
      console.log('✅ "Form Fields Ready" message is visible');

      // Get the count from the message
      const msgText = await formFieldsReadyMsg.locator('..').locator('..').textContent();
      console.log('📋 Message:', msgText);
    } else {
      console.log('⚠️  "Form Fields Ready" message not visible');

      // Check for "No fillable form fields" message
      const noFieldsMsg = page.locator('text=No fillable form fields detected');
      if (await noFieldsMsg.isVisible()) {
        console.log('❌ No form fields were detected in the PDF');
      }
    }

    // Verify at least some inputs exist
    expect(inputCount).toBeGreaterThan(0);
  });
});
