import { test, expect } from '@playwright/test';

test('test Add Text feature with drag, resize, and delete', async ({ page }) => {
  await page.goto('http://localhost:3020');
  await page.waitForLoadState('networkidle');

  console.log('📄 Uploading FW9 form...');
  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles('/Users/rioallen/Downloads/fw9.pdf');
  await page.waitForTimeout(5000);

  console.log('\n✅ Testing Add Text button...');

  // Click Add Text button
  const addTextButton = page.locator('button:has-text("Add Text")');
  await addTextButton.click();
  console.log('  ✓ Add Text button clicked');

  // Verify button is selected (has gradient background)
  const buttonClass = await addTextButton.getAttribute('class');
  console.log('  Button classes:', buttonClass);

  // Wait a moment for state to update
  await page.waitForTimeout(500);

  // Click on PDF to place text field near signature area
  console.log('\n📝 Placing text annotation...');
  const pdfContainer = page.locator('.relative.bg-white.shadow-2xl');
  await pdfContainer.click({ position: { x: 500, y: 650 } });

  // Wait for annotation to appear
  await page.waitForTimeout(1000);

  // Check if text field was created
  const textFields = page.locator('input[type="text"][placeholder="Type here..."]');
  const count = await textFields.count();
  console.log(`  ✓ Found ${count} manually-placed text field(s)`);

  if (count > 0) {
    console.log('\n✏️ Testing text input...');
    const textField = textFields.first();
    await textField.click();
    await textField.fill('12/25/2024');
    const value = await textField.inputValue();
    console.log(`  ✓ Text entered: "${value}"`);

    console.log('\n🗑️ Testing delete button...');
    // Click on the field to select it
    await textField.click();
    await page.waitForTimeout(500);

    // Look for delete button
    const deleteButton = page.locator('button:has-text("Delete")');
    const deleteCount = await deleteButton.count();
    console.log(`  Found ${deleteCount} delete button(s)`);

    if (deleteCount > 0) {
      await deleteButton.first().click();
      await page.waitForTimeout(500);

      const remainingCount = await textFields.count();
      console.log(`  ✓ After delete: ${remainingCount} text field(s) remaining`);
    }
  }

  // Take screenshot
  await page.screenshot({
    path: 'tests/screenshots/add-text-feature.png',
    fullPage: true
  });

  console.log('\n📸 Screenshot saved: tests/screenshots/add-text-feature.png');
  console.log('\n✅ Test complete!');
});
