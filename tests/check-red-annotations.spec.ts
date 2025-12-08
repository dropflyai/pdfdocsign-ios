import { test, expect } from '@playwright/test';

test('Check if red bordered annotations are visible', async ({ page }) => {
  console.log('Loading app...');
  await page.goto('http://localhost:3025');

  // Click Test W9 button
  console.log('Clicking Test W9 button...');
  const testButton = page.locator('button:has-text("Test W9")');
  await expect(testButton).toBeVisible();
  await testButton.click();

  // Wait for PDF to load and annotations to be created
  console.log('Waiting for annotations...');
  await page.waitForTimeout(10000);

  // Look for divs with red borders (our annotation containers)
  const redBorderedDivs = page.locator('div[style*="border: 2px solid red"]');
  const count = await redBorderedDivs.count();

  console.log(`Found ${count} red-bordered annotation containers`);

  // Take a screenshot
  await page.screenshot({ path: 'red-annotations-test.png', fullPage: true });
  console.log('Screenshot saved: red-annotations-test.png');

  // Check if we found any annotations
  if (count > 0) {
    console.log('✓ SUCCESS: Annotations are being rendered!');

    // Get the first annotation's position and size
    const firstAnnotation = redBorderedDivs.first();
    const box = await firstAnnotation.boundingBox();
    if (box) {
      console.log(`First annotation position: x=${box.x}, y=${box.y}, width=${box.width}, height=${box.height}`);
    }
  } else {
    console.log('✗ FAILED: No red-bordered annotations found in DOM');
  }

  expect(count).toBeGreaterThan(0);
});
