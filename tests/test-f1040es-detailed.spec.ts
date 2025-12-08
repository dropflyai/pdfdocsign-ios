import { test } from '@playwright/test';

test('detailed f1040es field analysis by page', async ({ page }) => {
  await page.goto('http://localhost:3020');
  await page.waitForLoadState('networkidle');

  console.log('📄 Uploading f1040es.pdf...');
  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles('/Users/rioallen/Downloads/f1040es.pdf');
  await page.waitForTimeout(5000);

  // Get total page count
  const pageIndicator = page.locator('text=/Page \\d+ of \\d+/');
  const pageText = await pageIndicator.textContent();
  const totalPages = parseInt(pageText?.match(/of (\d+)/)?.[1] || '0');
  console.log(`\n📚 Total pages: ${totalPages}`);

  // Analyze each page
  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    // Navigate to page
    if (pageNum > 1) {
      const nextButton = page.locator('button:has-text("Next")');
      await nextButton.click();
      await page.waitForTimeout(1000);
    }

    // Count fields on this page
    const textFields = page.locator('input[type="text"]');
    const checkboxes = page.locator('div[role="checkbox"]');

    const textCount = await textFields.count();
    const checkboxCount = await checkboxes.count();

    if (textCount > 0 || checkboxCount > 0) {
      console.log(`\n📄 Page ${pageNum}:`);
      console.log(`   Text fields: ${textCount}`);
      console.log(`   Checkboxes: ${checkboxCount}`);

      // Sample first 3 field positions on this page
      for (let i = 0; i < Math.min(textCount, 3); i++) {
        const field = textFields.nth(i);
        const box = await field.boundingBox();
        if (box) {
          console.log(`   Field ${i + 1}: (${box.x.toFixed(0)}, ${box.y.toFixed(0)})`);
        }
      }

      // Take screenshot of this page if it has fields
      await page.screenshot({
        path: `tests/screenshots/f1040es-page-${pageNum}.png`,
        fullPage: true
      });
    } else {
      console.log(`\n📄 Page ${pageNum}: No fields detected`);
    }
  }

  console.log('\n✅ Analysis complete!');
});
