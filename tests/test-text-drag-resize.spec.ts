import { test, expect } from '@playwright/test';

test('test text annotation drag and resize', async ({ page }) => {
  await page.goto('http://localhost:3020');
  await page.waitForLoadState('networkidle');

  console.log('📄 Uploading FW9 form...');
  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles('/Users/rioallen/Downloads/fw9.pdf');
  await page.waitForTimeout(5000);

  console.log('\n✅ Placing text annotation...');

  // Click Add Text button
  await page.locator('button:has-text("Add Text")').click();
  await page.waitForTimeout(500);

  // Click to place text field
  const pdfContainer = page.locator('.relative.bg-white.shadow-2xl');
  await pdfContainer.click({ position: { x: 400, y: 600 } });
  await page.waitForTimeout(1000);

  // Type in the text field
  const textField = page.locator('input[type="text"][placeholder="Type here..."]').first();
  await textField.fill('Test Date Field');
  console.log('  ✓ Text field created and filled');

  // Get initial position
  const initialBox = await textField.boundingBox();
  console.log(`\n📍 Initial position: (${initialBox?.x.toFixed(1)}, ${initialBox?.y.toFixed(1)})`);
  console.log(`  Size: ${initialBox?.width.toFixed(1)}px x ${initialBox?.height.toFixed(1)}px`);

  console.log('\n🖱️ Testing drag...');
  // Try to drag by the top area (drag handle)
  const parentDiv = page.locator('div').filter({ has: textField }).first();
  await parentDiv.hover({ position: { x: 50, y: 10 } });
  await page.mouse.down();
  await page.mouse.move(initialBox!.x + 100, initialBox!.y + 50, { steps: 10 });
  await page.mouse.up();
  await page.waitForTimeout(500);

  const newBox = await textField.boundingBox();
  console.log(`  ✓ New position: (${newBox?.x.toFixed(1)}, ${newBox?.y.toFixed(1)})`);

  const moved = Math.abs(newBox!.x - initialBox!.x) > 10 || Math.abs(newBox!.y - initialBox!.y) > 10;
  console.log(`  ${moved ? '✓' : '✗'} Field ${moved ? 'moved successfully' : 'did not move'}`);

  console.log('\n🔍 Testing resize...');
  // Look for resize handle (bottom-right corner)
  const resizeHandle = page.locator('div[style*="cursor: nwse-resize"]').first();
  const handleVisible = await resizeHandle.isVisible();
  console.log(`  ${handleVisible ? '✓' : '✗'} Resize handle ${handleVisible ? 'found' : 'not found'}`);

  if (handleVisible) {
    const handleBox = await resizeHandle.boundingBox();
    await page.mouse.move(handleBox!.x + 8, handleBox!.y + 8);
    await page.mouse.down();
    await page.mouse.move(handleBox!.x + 60, handleBox!.y + 20, { steps: 10 });
    await page.mouse.up();
    await page.waitForTimeout(500);

    const resizedBox = await textField.boundingBox();
    console.log(`  ✓ New size: ${resizedBox?.width.toFixed(1)}px x ${resizedBox?.height.toFixed(1)}px`);

    const resized = Math.abs(resizedBox!.width - newBox!.width) > 10;
    console.log(`  ${resized ? '✓' : '✗'} Field ${resized ? 'resized successfully' : 'did not resize'}`);
  }

  // Take screenshot
  await page.screenshot({
    path: 'tests/screenshots/text-drag-resize.png',
    fullPage: true
  });

  console.log('\n📸 Screenshot saved: tests/screenshots/text-drag-resize.png');
  console.log('\n✅ Test complete!');
});
