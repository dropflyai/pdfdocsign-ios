import { test } from '@playwright/test';

test('test drag using visible drag handle', async ({ page }) => {
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('📍') || text.includes('🔍') || text.includes('🖱️')) {
      console.log(`BROWSER: ${text}`);
    }
  });

  await page.goto('http://localhost:3020');
  await page.waitForLoadState('networkidle');

  console.log('📄 Uploading FW9 form...');
  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles('/Users/rioallen/Downloads/fw9.pdf');
  await page.waitForTimeout(5000);

  console.log('\n✅ Placing text annotation...');
  await page.locator('button:has-text("Add Text")').click();
  await page.waitForTimeout(500);

  const pdfContainer = page.locator('.relative.bg-white.shadow-2xl');
  await pdfContainer.click({ position: { x: 450, y: 400 } });
  await page.waitForTimeout(1000);

  const textField = page.locator('input[type="text"][placeholder="Type here..."]').first();
  await textField.fill('Date: 12/25/2024');
  console.log('  ✓ Text field created');

  // Get the container
  const textContainer = textField.locator('..').first();
  const box = await textContainer.boundingBox();
  console.log(`\n📍 Initial position: (${box?.x.toFixed(1)}, ${box?.y.toFixed(1)})`);

  // Look for the drag handle (the bar with ⋮⋮⋮)
  const dragHandle = page.locator('div').filter({ hasText: /^⋮⋮⋮$/ }).first();
  const handleVisible = await dragHandle.isVisible();
  console.log(`  Drag handle visible: ${handleVisible ? 'YES' : 'NO'}`);

  if (handleVisible) {
    const handleBox = await dragHandle.boundingBox();
    console.log(`  Drag handle at: (${handleBox?.x.toFixed(1)}, ${handleBox?.y.toFixed(1)})`);

    // Drag from the handle
    console.log('\n🖱️ Dragging from handle...');
    await page.mouse.move(handleBox!.x + handleBox!.width / 2, handleBox!.y + handleBox!.height / 2);
    await page.mouse.down();
    await page.waitForTimeout(200);
    await page.mouse.move(handleBox!.x + 100, handleBox!.y + 50, { steps: 10 });
    await page.mouse.up();
    await page.waitForTimeout(500);

    const newBox = await textContainer.boundingBox();
    const moved = Math.abs(newBox!.x - box!.x) > 10;
    console.log(`  New position: (${newBox?.x.toFixed(1)}, ${newBox?.y.toFixed(1)})`);
    console.log(`  ${moved ? '✓' : '✗'} DRAG: ${moved ? 'WORKING' : 'NOT WORKING'}`);
  }

  // Test resize
  console.log('\n🔍 Testing resize...');
  const resizeHandle = page.locator('div[style*="cursor: nwse-resize"]').first();
  const resizeVisible = await resizeHandle.isVisible();
  console.log(`  Resize handle visible: ${resizeVisible ? 'YES' : 'NO'}`);

  if (resizeVisible) {
    const resizeBox = await resizeHandle.boundingBox();
    await page.mouse.move(resizeBox!.x + 8, resizeBox!.y + 8);
    await page.mouse.down();
    await page.waitForTimeout(200);
    await page.mouse.move(resizeBox!.x + 80, resizeBox!.y + 30, { steps: 10 });
    await page.mouse.up();
    await page.waitForTimeout(500);

    const box2 = await textContainer.boundingBox();
    const resizedBox = await textContainer.boundingBox();
    const resized = Math.abs(resizedBox!.width - box!.width) > 10;
    console.log(`  New size: ${resizedBox?.width.toFixed(1)}px x ${resizedBox?.height.toFixed(1)}px`);
    console.log(`  ${resized ? '✓' : '✗'} RESIZE: ${resized ? 'WORKING' : 'NOT WORKING'}`);
  }

  await page.screenshot({
    path: 'tests/screenshots/drag-handle-test.png',
    fullPage: true
  });

  console.log('\n📸 Screenshot saved');
});
