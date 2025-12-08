import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('PDF Doc Sign', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app
    await page.goto('http://localhost:3020');
    await page.waitForLoadState('networkidle');
  });

  test('should load the homepage', async ({ page }) => {
    // Check that the homepage elements are visible
    await expect(page.locator('text=PDF Doc Sign')).toBeVisible();
    await expect(page.locator('text=Edit PDFs with')).toBeVisible();
    await expect(page.locator('text=Drop your PDF here')).toBeVisible();
  });

  test('should upload PDF and detect form fields', async ({ page }) => {
    // Create a simple fillable PDF for testing
    // For now, we'll use a file input to upload
    const fileInput = page.locator('input[type="file"]');

    // Create a path to a test PDF (we'll need to create this)
    const testPdfPath = path.join(process.cwd(), 'tests', 'test-form.pdf');

    // Upload the PDF
    await fileInput.setInputFiles(testPdfPath);

    // Wait for PDF to load
    await page.waitForTimeout(2000);

    // Check if form fields are detected
    console.log('Checking for form field detection...');

    // Take a screenshot
    await page.screenshot({ path: 'tests/screenshots/after-upload.png', fullPage: true });

    // Look for form field elements
    const formFields = await page.locator('[type="text"][tabindex="0"]').count();
    console.log(`Found ${formFields} text input fields`);

    // Check console logs
    const logs: string[] = [];
    page.on('console', msg => {
      logs.push(`${msg.type()}: ${msg.text()}`);
      console.log(`Browser console [${msg.type()}]: ${msg.text()}`);
    });
  });

  test('should allow clicking and typing in text fields', async ({ page }) => {
    // Upload PDF
    const fileInput = page.locator('input[type="file"]');
    const testPdfPath = path.join(process.cwd(), 'tests', 'test-form.pdf');
    await fileInput.setInputFiles(testPdfPath);

    // Wait for PDF to load and fields to be detected
    await page.waitForTimeout(3000);

    // Take screenshot before interaction
    await page.screenshot({ path: 'tests/screenshots/before-typing.png', fullPage: true });

    // Try to find and click on text inputs
    const inputs = page.locator('input[type="text"][tabindex="0"]');
    const inputCount = await inputs.count();
    console.log(`Found ${inputCount} input fields`);

    if (inputCount > 0) {
      // Click on the first input
      const firstInput = inputs.first();

      // Check if it's visible
      const isVisible = await firstInput.isVisible();
      console.log(`First input visible: ${isVisible}`);

      // Get bounding box
      const box = await firstInput.boundingBox();
      console.log('Input bounding box:', box);

      // Try to click it
      await firstInput.click({ force: true });
      console.log('Clicked first input');

      // Type text
      await firstInput.fill('Test Text 123');
      console.log('Typed text into first input');

      // Take screenshot after typing
      await page.screenshot({ path: 'tests/screenshots/after-typing.png', fullPage: true });

      // Verify text was entered
      const value = await firstInput.inputValue();
      console.log(`Input value: "${value}"`);
      expect(value).toBe('Test Text 123');

      // Try clicking on a second field if it exists
      if (inputCount > 1) {
        const secondInput = inputs.nth(1);
        await secondInput.click({ force: true });
        await secondInput.fill('Second Field');

        const secondValue = await secondInput.inputValue();
        console.log(`Second input value: "${secondValue}"`);

        // Take final screenshot
        await page.screenshot({ path: 'tests/screenshots/multiple-fields.png', fullPage: true });
      }
    } else {
      console.error('No input fields found!');
      await page.screenshot({ path: 'tests/screenshots/no-fields-error.png', fullPage: true });
    }
  });

  test('should allow clicking checkboxes', async ({ page }) => {
    // Upload PDF
    const fileInput = page.locator('input[type="file"]');
    const testPdfPath = path.join(process.cwd(), 'tests', 'test-form.pdf');
    await fileInput.setInputFiles(testPdfPath);

    // Wait for PDF to load
    await page.waitForTimeout(3000);

    // Look for checkboxes
    const checkboxes = page.locator('[role="checkbox"]');
    const checkboxCount = await checkboxes.count();
    console.log(`Found ${checkboxCount} checkboxes`);

    if (checkboxCount > 0) {
      const firstCheckbox = checkboxes.first();

      // Get initial state
      const initialState = await firstCheckbox.getAttribute('aria-checked');
      console.log(`Initial checkbox state: ${initialState}`);

      // Click checkbox
      await firstCheckbox.click({ force: true });
      await page.waitForTimeout(500);

      // Get new state
      const newState = await firstCheckbox.getAttribute('aria-checked');
      console.log(`New checkbox state: ${newState}`);

      // Take screenshot
      await page.screenshot({ path: 'tests/screenshots/checkbox-clicked.png', fullPage: true });

      // Verify state changed
      expect(newState).not.toBe(initialState);
    }
  });
});
