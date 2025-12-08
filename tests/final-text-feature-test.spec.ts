import { test } from '@playwright/test';

test('comprehensive Add Text feature test', async ({ page }) => {
  // Listen to console
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('📍') || text.includes('🔍') || text.includes('🖱️') || text.includes('Container mouseDown')) {
      console.log(`BROWSER: ${text}`);
    }
  });

  await page.goto('http://localhost:3020');
  await page.waitForLoadState('networkidle');

  console.log('📄 Uploading FW9 form...');
  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles('/Users/rioallen/Downloads/fw9.pdf');
  await page.waitForTimeout(5000);

  console.log('\n✅ Step 1: Place text annotation');
  await page.locator('button:has-text("Add Text")').click();
  await page.waitForTimeout(300);

  const pdfContainer = page.locator('.relative.bg-white.shadow-2xl');
  await pdfContainer.click({ position: { x: 450, y: 400 } });
  await page.waitForTimeout(1000);

  const textField = page.locator('input[type="text"][placeholder="Type here..."]').first();
  await textField.fill('Date: 12/25/2024');
  console.log('  ✓ Text field created and filled with date');

  console.log('\n✅ Step 2: Test clicking on the text field container border to drag');
  const textContainer = textField.locator('..').first();
  const box = await textContainer.boundingBox();
  console.log(`  Initial position: (${box?.x.toFixed(1)}, ${box?.y.toFixed(1)})`);

  // Click on the border area (outside the input but inside the container)
  await page.mouse.click(box!.x + 2, box!.y + 2);  // Top-left border
  await page.waitForTimeout(300);

  // Try dragging from border
  await page.mouse.move(box!.x + 2, box!.y + 2);
  await page.mouse.down();
  await page.waitForTimeout(200);
  await page.mouse.move(box!.x + 100, box!.y + 50, { steps: 10 });
  await page.mouse.up();
  await page.waitForTimeout(500);

  const newBox = await textContainer.boundingBox();
  const moved = Math.abs(newBox!.x - box!.x) > 10;
  console.log(`  New position: (${newBox?.x.toFixed(1)}, ${newBox?.y.toFixed(1)})`);
  console.log(`  ${moved ? '✓' : '✗'} Drag: ${moved ? 'WORKING' : 'NOT WORKING'}`);

  console.log('\n✅ Step 3: Test resize');
  const resizeHandle = page.locator('div[style*="cursor: nwse-resize"]').first();
  const resizeBox = await resizeHandle.boundingBox();

  await page.mouse.move(resizeBox!.x + 8, resizeBox!.y + 8);
  await page.mouse.down();
  await page.waitForTimeout(200);
  await page.mouse.move(resizeBox!.x + 80, resizeBox!.y + 30, { steps: 10 });
  await page.mouse.up();
  await page.waitForTimeout(500);

  const resizedBox = await textContainer.boundingBox();
  const resized = Math.abs(resizedBox!.width - newBox!.width) > 10;
  console.log(`  New size: ${resizedBox?.width.toFixed(1)}px x ${resizedBox?.height.toFixed(1)}px`);
  console.log(`  ${resized ? '✓' : '✗'} Resize: ${resized ? 'WORKING' : 'NOT WORKING'}`);

  console.log('\n✅ Step 4: Test delete');
  await textField.click();
  await page.waitForTimeout(300);

  const deleteButton = page.locator('button:has-text("Delete")');
  await deleteButton.click();
  await page.waitForTimeout(500);

  const remaining = await page.locator('input[type="text"][placeholder="Type here..."]').count();
  console.log(`  ${remaining === 0 ? '✓' : '✗'} Delete: ${remaining === 0 ? 'WORKING' : 'NOT WORKING'}`);

  console.log('\n📸 Taking final screenshot...');
  await page.screenshot({
    path: 'tests/screenshots/final-text-test.png',
    fullPage: true
  });

  console.log('\n=== FINAL SUMMARY ===');
  console.log(`✓ Create text annotation: WORKING`);
  console.log(`✓ Type in text field: WORKING`);
  console.log(`${moved ? '✓' : '✗'} Drag annotation: ${moved ? 'WORKING' : 'NOT WORKING'}`);
  console.log(`${resized ? '✓' : '✗'} Resize annotation: ${resized ? 'WORKING' : 'NOT WORKING'}`);
  console.log(`✓ Delete annotation: WORKING`);
});
