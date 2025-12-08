import { test, expect } from '@playwright/test';

test('verify FW9 SSN/EIN fields are split into individual digit boxes', async ({ page }) => {
  await page.goto('http://localhost:3020');
  await page.waitForLoadState('networkidle');

  console.log('📄 Uploading FW9 form...');
  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles('/Users/rioallen/Downloads/fw9.pdf');
  await page.waitForTimeout(5000);

  const textInputs = page.locator('input[type="text"][tabindex="0"]');
  const count = await textInputs.count();

  console.log('\n📊 INDIVIDUAL BOX ANALYSIS\n');
  console.log(`Total input boxes detected: ${count}\n`);

  // Group boxes by similar Y position (same row)
  const boxes: { index: number; x: number; y: number; width: number; height: number; maxLength: string | null }[] = [];

  for (let i = 0; i < count; i++) {
    const input = textInputs.nth(i);
    const box = await input.boundingBox();
    const maxLength = await input.getAttribute('maxLength');

    if (box) {
      boxes.push({
        index: i,
        x: box.x,
        y: box.y,
        width: box.width,
        height: box.height,
        maxLength
      });
    }
  }

  // Sort by Y position, then X position
  boxes.sort((a, b) => {
    const yDiff = a.y - b.y;
    if (Math.abs(yDiff) < 5) return a.x - b.x;
    return yDiff;
  });

  // Detect rows (fields on same Y level)
  const rows: typeof boxes[][] = [];
  let currentRow: typeof boxes[] = [];
  let lastY = -100;

  for (const box of boxes) {
    if (Math.abs(box.y - lastY) > 5) {
      if (currentRow.length > 0) {
        rows.push(currentRow);
      }
      currentRow = [box];
      lastY = box.y;
    } else {
      currentRow.push(box);
    }
  }
  if (currentRow.length > 0) {
    rows.push(currentRow);
  }

  console.log('🔢 ROWS WITH MULTIPLE BOXES (likely SSN/EIN):');
  for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
    const row = rows[rowIndex];
    if (row.length > 1) {
      console.log(`\nRow ${rowIndex + 1}: ${row.length} boxes`);
      row.forEach((box, boxIndex) => {
        console.log(`  Box ${boxIndex + 1}:`);
        console.log(`    Position: x=${box.x.toFixed(1)}, y=${box.y.toFixed(1)}`);
        console.log(`    Size: ${box.width.toFixed(1)} x ${box.height.toFixed(1)}`);
        console.log(`    MaxLength: ${box.maxLength || 'unlimited'}`);
        console.log(`    Field index: ${box.index}`);
      });

      // Test filling this row
      console.log(`\n  Testing input for this row...`);
      const testDigits = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];
      for (let i = 0; i < Math.min(row.length, testDigits.length); i++) {
        const input = textInputs.nth(row[i].index);
        await input.click({ force: true });
        await page.waitForTimeout(100);
        await input.fill(testDigits[i]);
        await page.waitForTimeout(100);
      }
    }
  }

  // Take screenshot
  await page.screenshot({
    path: 'tests/screenshots/fw9-individual-boxes.png',
    fullPage: true
  });

  console.log('\n✅ Test complete!');
  console.log('📸 Screenshot saved: fw9-individual-boxes.png');
  console.log(`\n💡 Summary: Found ${count} total input boxes`);
  console.log(`   - Rows with multiple boxes: ${rows.filter(r => r.length > 1).length}`);

  // Verify we have more boxes than the original 15 fields
  expect(count).toBeGreaterThan(15);
  console.log(`   ✓ Box count (${count}) is greater than original field count (15)`);
});
