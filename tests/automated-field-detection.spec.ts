import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Automated Field Detection Test', () => {
  test('should detect and display form fields from W9 PDF', async ({ page }) => {
    console.log('\n================================================');
    console.log('🧪 Starting Automated Field Detection Test');
    console.log('================================================\n');

    // Collect all console logs
    const consoleLogs: string[] = [];
    page.on('console', msg => {
      const text = msg.text();
      consoleLogs.push(`[${msg.type()}] ${text}`);
      console.log(`[BROWSER] ${text}`);
    });

    // Collect errors
    const errors: string[] = [];
    page.on('pageerror', error => {
      errors.push(error.message);
      console.error(`[PAGE ERROR] ${error.message}`);
    });

    // Navigate to the app
    console.log('1️⃣  Navigating to app...');
    await page.goto('http://localhost:3025');
    await page.waitForLoadState('networkidle');
    console.log('   ✓ Page loaded\n');

    // Take screenshot of home page
    await page.screenshot({ path: 'test-results/01-home-page.png', fullPage: true });
    console.log('📸 Screenshot: 01-home-page.png\n');

    // Find the file input
    console.log('2️⃣  Locating file input...');
    const fileInput = page.locator('input[type="file"]');
    await expect(fileInput).toBeAttached({ timeout: 5000 });
    console.log('   ✓ File input found\n');

    // Upload the W9 PDF
    console.log('3️⃣  Uploading W9 PDF...');
    const w9Path = path.join(__dirname, '../public/test-w9.pdf');
    console.log(`   📁 File path: ${w9Path}`);

    await fileInput.setInputFiles(w9Path);
    console.log('   ✓ File uploaded\n');

    // Wait for PDF to load and field extraction to complete
    console.log('4️⃣  Waiting for PDF editor to load...');
    await page.waitForTimeout(3000);

    // Take screenshot after upload
    await page.screenshot({ path: 'test-results/02-pdf-loaded.png', fullPage: true });
    console.log('📸 Screenshot: 02-pdf-loaded.png\n');

    // Wait additional time for field extraction
    console.log('5️⃣  Waiting for field extraction (10 seconds)...');
    await page.waitForTimeout(10000);

    // Take screenshot after field extraction
    await page.screenshot({ path: 'test-results/03-fields-extracted.png', fullPage: true });
    console.log('📸 Screenshot: 03-fields-extracted.png\n');

    // Analyze console logs
    console.log('\n================================================');
    console.log('📋 CONSOLE LOG ANALYSIS');
    console.log('================================================\n');

    // Field extraction logs
    const fieldLogs = consoleLogs.filter(log =>
      log.includes('field') || log.includes('Field') ||
      log.includes('annotation') || log.includes('form')
    );

    console.log('🔍 Field Detection Logs:');
    console.log('----------------------------------------');
    fieldLogs.forEach(log => console.log(log));

    // Success indicators
    const successLogs = consoleLogs.filter(log =>
      log.includes('✅') || log.includes('✓') || log.includes('success')
    );

    console.log('\n✅ Success Indicators:');
    console.log('----------------------------------------');
    successLogs.forEach(log => console.log(log));

    // Error indicators
    const errorLogs = consoleLogs.filter(log =>
      log.includes('❌') || log.includes('error') || log.includes('Error')
    );

    console.log('\n❌ Error Indicators:');
    console.log('----------------------------------------');
    if (errorLogs.length > 0) {
      errorLogs.forEach(log => console.log(log));
    } else {
      console.log('No errors found ✓');
    }

    // Extract key metrics
    const fieldsFoundLog = consoleLogs.find(log => log.includes('Total fields found:'));
    const annotationsCreatedLog = consoleLogs.find(log => log.includes('Total annotations created:'));
    const annotationsUpdatedLog = consoleLogs.find(log => log.includes('Annotations state updated'));

    console.log('\n================================================');
    console.log('📊 FIELD DETECTION SUMMARY');
    console.log('================================================\n');

    if (fieldsFoundLog) {
      console.log('✅ Fields Found:', fieldsFoundLog);
    } else {
      console.log('❌ Fields Found: NO DATA');
    }

    if (annotationsCreatedLog) {
      console.log('✅ Annotations Created:', annotationsCreatedLog);
    } else {
      console.log('⚠️  Annotations Created: NO DATA');
    }

    if (annotationsUpdatedLog) {
      console.log('✅ State Updated:', annotationsUpdatedLog);
    } else {
      console.log('❌ State Updated: NO DATA');
    }

    // Check for visible form fields
    console.log('\n6️⃣  Checking for visible form field inputs...');
    const formInputs = page.locator('input[type="text"]');
    const inputCount = await formInputs.count();
    console.log(`   📝 Found ${inputCount} text input fields on page\n`);

    // Check for form fields ready message
    const formFieldsReadyMsg = page.locator('text=Form Fields Ready');
    const isFormFieldsMsgVisible = await formFieldsReadyMsg.isVisible().catch(() => false);

    if (isFormFieldsMsgVisible) {
      console.log('✅ "Form Fields Ready" message is visible');
      const msgParent = formFieldsReadyMsg.locator('..').locator('..');
      const msgText = await msgParent.textContent();
      console.log(`   📋 ${msgText}`);
    } else {
      console.log('⚠️  "Form Fields Ready" message not visible');

      // Check for "No fillable form fields" message
      const noFieldsMsg = page.locator('text=No fillable form fields detected');
      const isNoFieldsMsgVisible = await noFieldsMsg.isVisible().catch(() => false);

      if (isNoFieldsMsgVisible) {
        console.log('❌ "No fillable form fields detected" message is visible');
      }
    }

    // Save all logs to file
    const fs = require('fs');
    const logFilePath = `test-results/field-detection-logs-${Date.now()}.txt`;
    fs.writeFileSync(logFilePath, consoleLogs.join('\n'));
    console.log(`\n📁 Full console logs saved to: ${logFilePath}`);

    // Page errors
    if (errors.length > 0) {
      console.log('\n⚠️  Page Errors Detected:');
      errors.forEach(err => console.log(`   - ${err}`));
    }

    console.log('\n================================================');
    console.log('✅ Test Complete!');
    console.log('================================================\n');

    // Assertions
    expect(errors.length, 'Should have no page errors').toBe(0);
    expect(fieldsFoundLog, 'Should find form fields').toBeTruthy();
    expect(inputCount, 'Should have visible input fields').toBeGreaterThan(0);
  });
});
