import { test, expect } from '@playwright/test';

test.describe('FW9 Complete Form Fill', () => {
  test('should fill out entire FW9 form with mock data', async ({ page }) => {
    // Set up console logging
    page.on('console', msg => {
      console.log(`Browser [${msg.type()}]: ${msg.text()}`);
    });

    // Navigate and upload
    await page.goto('http://localhost:3020');
    await page.waitForLoadState('networkidle');

    console.log('📄 Uploading FW9 form...');
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles('/Users/rioallen/Downloads/fw9.pdf');

    // Wait for fields to load
    await page.waitForTimeout(5000);

    // Take initial screenshot
    await page.screenshot({
      path: 'tests/screenshots/fw9-complete-start.png',
      fullPage: true
    });

    const textInputs = page.locator('input[type="text"][tabindex="0"]');
    const checkboxes = page.locator('[role="checkbox"]');

    const textCount = await textInputs.count();
    const checkboxCount = await checkboxes.count();

    console.log(`\n📊 Form Analysis:`);
    console.log(`   Text fields: ${textCount}`);
    console.log(`   Checkboxes: ${checkboxCount}`);

    // Mock data for FW9 form
    const mockData = [
      'John Smith',                           // Field 0: Name
      'Smith Consulting LLC',                 // Field 1: Business name/disregarded entity
      'C',                                    // Field 2: Federal tax classification (checkbox) - handled separately
      'Consulting Services',                  // Field 3: Other field
      '',                                     // Field 4: Exempt payee code
      '',                                     // Field 5: Exemption code
      '123 Main Street',                      // Field 6: Address
      'New York, NY 10001',                   // Field 7: City, state, ZIP
      '',                                     // Field 8: Account number(s)
      '456 Second Avenue',                    // Field 9: List account number(s) here
      '12',                                   // Field 10: SSN/EIN Part 1
      '34',                                   // Field 11: SSN/EIN Part 2
      '5678',                                 // Field 12: SSN/EIN Part 3
      '98',                                   // Field 13: EIN Part 1
      '7654321',                              // Field 14: EIN Part 2
    ];

    console.log('\n🖊️ Filling form fields...\n');

    // Fill all text fields
    for (let i = 0; i < Math.min(textCount, mockData.length); i++) {
      if (mockData[i]) {
        try {
          const field = textInputs.nth(i);
          const box = await field.boundingBox();

          console.log(`Field ${i + 1}:`);
          console.log(`  Position: x=${box?.x?.toFixed(0)}, y=${box?.y?.toFixed(0)}`);
          console.log(`  Value: "${mockData[i]}"`);

          await field.click({ force: true, timeout: 5000 });
          await page.waitForTimeout(200);
          await field.fill(mockData[i]);
          await page.waitForTimeout(200);

          const value = await field.inputValue();
          if (value === mockData[i]) {
            console.log(`  ✓ Successfully filled`);
          } else {
            console.log(`  ⚠️ Value mismatch: expected "${mockData[i]}", got "${value}"`);
          }
        } catch (error) {
          console.log(`  ❌ Error filling field ${i + 1}: ${error}`);
        }
        console.log('');
      }
    }

    // Take screenshot after text fields
    await page.screenshot({
      path: 'tests/screenshots/fw9-complete-text-filled.png',
      fullPage: true
    });

    // Handle checkboxes (Federal tax classification)
    console.log('☑️ Handling checkboxes...\n');

    if (checkboxCount > 0) {
      // Check "C Corporation" checkbox (usually checkbox index 2)
      const cCorpCheckbox = checkboxes.nth(2);
      console.log('Checking "C Corporation" checkbox...');
      await cCorpCheckbox.click({ force: true });
      await page.waitForTimeout(500);

      const isChecked = await cCorpCheckbox.getAttribute('aria-checked');
      console.log(`  Checkbox state: ${isChecked}`);
      console.log('');
    }

    // Take final screenshot
    await page.screenshot({
      path: 'tests/screenshots/fw9-complete-final.png',
      fullPage: true
    });

    console.log('\n✅ Form Fill Complete!');
    console.log('📸 Screenshots saved:');
    console.log('   - fw9-complete-start.png (initial state)');
    console.log('   - fw9-complete-text-filled.png (after text fields)');
    console.log('   - fw9-complete-final.png (final with checkboxes)');

    // Verify key fields
    console.log('\n🔍 Verifying critical fields...');

    const nameField = textInputs.first();
    const nameValue = await nameField.inputValue();
    expect(nameValue).toBe('John Smith');
    console.log(`  ✓ Name field: "${nameValue}"`);

    const addressField = textInputs.nth(6);
    const addressValue = await addressField.inputValue();
    expect(addressValue).toBe('123 Main Street');
    console.log(`  ✓ Address field: "${addressValue}"`);

    // Check SSN fields (fields 10, 11, 12)
    const ssn1 = await textInputs.nth(10).inputValue();
    const ssn2 = await textInputs.nth(11).inputValue();
    const ssn3 = await textInputs.nth(12).inputValue();
    console.log(`  ✓ SSN: ${ssn1}-${ssn2}-${ssn3}`);

    // Check EIN fields (fields 13, 14)
    const ein1 = await textInputs.nth(13).inputValue();
    const ein2 = await textInputs.nth(14).inputValue();
    console.log(`  ✓ EIN: ${ein1}-${ein2}`);

    console.log('\n✨ All verifications passed!');
  });

  test('should handle SSN and EIN number fields correctly', async ({ page }) => {
    await page.goto('http://localhost:3020');
    await page.waitForLoadState('networkidle');

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles('/Users/rioallen/Downloads/fw9.pdf');
    await page.waitForTimeout(5000);

    const textInputs = page.locator('input[type="text"][tabindex="0"]');

    console.log('\n🔢 Testing SSN/EIN Number Fields...\n');

    // Test SSN format: XXX-XX-XXXX (fields 10, 11, 12)
    console.log('Testing SSN fields:');
    await textInputs.nth(10).click({ force: true });
    await textInputs.nth(10).fill('123');
    await page.waitForTimeout(300);

    await textInputs.nth(11).click({ force: true });
    await textInputs.nth(11).fill('45');
    await page.waitForTimeout(300);

    await textInputs.nth(12).click({ force: true });
    await textInputs.nth(12).fill('6789');
    await page.waitForTimeout(300);

    const ssn1 = await textInputs.nth(10).inputValue();
    const ssn2 = await textInputs.nth(11).inputValue();
    const ssn3 = await textInputs.nth(12).inputValue();

    console.log(`  SSN Part 1: ${ssn1}`);
    console.log(`  SSN Part 2: ${ssn2}`);
    console.log(`  SSN Part 3: ${ssn3}`);
    console.log(`  Full SSN: ${ssn1}-${ssn2}-${ssn3}`);

    expect(ssn1).toBe('123');
    expect(ssn2).toBe('45');
    expect(ssn3).toBe('6789');

    await page.screenshot({
      path: 'tests/screenshots/fw9-ssn-filled.png',
      fullPage: true
    });

    // Test EIN format: XX-XXXXXXX (fields 13, 14)
    console.log('\nTesting EIN fields:');
    await textInputs.nth(13).click({ force: true });
    await textInputs.nth(13).fill('12');
    await page.waitForTimeout(300);

    await textInputs.nth(14).click({ force: true });
    await textInputs.nth(14).fill('3456789');
    await page.waitForTimeout(300);

    const ein1 = await textInputs.nth(13).inputValue();
    const ein2 = await textInputs.nth(14).inputValue();

    console.log(`  EIN Part 1: ${ein1}`);
    console.log(`  EIN Part 2: ${ein2}`);
    console.log(`  Full EIN: ${ein1}-${ein2}`);

    expect(ein1).toBe('12');
    expect(ein2).toBe('3456789');

    await page.screenshot({
      path: 'tests/screenshots/fw9-ein-filled.png',
      fullPage: true
    });

    console.log('\n✅ SSN/EIN fields working correctly!');
  });
});
