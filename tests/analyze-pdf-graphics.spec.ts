import { test } from '@playwright/test';
import * as pdfjs from 'pdfjs-dist';

test('analyze PDF graphics and visual boxes', async ({ page }) => {
  // This test will analyze the PDF's graphical content to find drawn boxes

  const pdfPath = '/Users/rioallen/Downloads/fw9.pdf';
  const fs = require('fs');
  const data = new Uint8Array(fs.readFileSync(pdfPath));

  const loadingTask = pdfjs.getDocument({ data });
  const pdf = await loadingTask.promise;

  console.log('\n📄 Analyzing PDF Graphics\n');
  console.log(`Total pages: ${pdf.numPages}`);

  // Analyze page 1 (where SSN/EIN boxes are)
  const page1 = await pdf.getPage(1);
  const viewport = page1.getViewport({ scale: 1 });

  console.log(`\nPage 1 dimensions: ${viewport.width} x ${viewport.height}`);

  // Get operators (drawing commands)
  const ops = await page1.getOperatorList();

  console.log(`\nTotal drawing operations: ${ops.fnArray.length}`);

  // Look for rectangle drawing operations
  const rectangles: any[] = [];
  let currentX = 0;
  let currentY = 0;

  for (let i = 0; i < ops.fnArray.length; i++) {
    const fn = ops.fnArray[i];
    const args = ops.argsArray[i];

    // Common PDF operators for drawing rectangles:
    // OPS.rectangle = 43 (draws rectangle)
    // OPS.moveTo = 21
    // OPS.lineTo = 22
    // OPS.stroke = 82
    // OPS.fill = 73

    if (fn === 43) { // OPS.rectangle
      rectangles.push({
        x: args[0],
        y: args[1],
        width: args[2],
        height: args[3],
        operation: 'rectangle'
      });
    }
  }

  console.log(`\n🔲 Found ${rectangles.length} rectangle operations`);

  if (rectangles.length > 0) {
    console.log('\nFirst 20 rectangles:');
    rectangles.slice(0, 20).forEach((rect, i) => {
      console.log(`  ${i + 1}. x=${rect.x.toFixed(2)}, y=${rect.y.toFixed(2)}, w=${rect.width.toFixed(2)}, h=${rect.height.toFixed(2)}`);
    });
  }

  // Look for small boxes (likely digit boxes) in the SSN/EIN area
  // SSN is around y=395 (in PDF coords), EIN is around y=347
  const ssnArea = rectangles.filter(r =>
    Math.abs(r.y - 395) < 30 && r.width < 50 && r.height < 50
  );

  const einArea = rectangles.filter(r =>
    Math.abs(r.y - 347) < 30 && r.width < 50 && r.height < 50
  );

  console.log(`\n🔢 Rectangles in SSN area (y≈395): ${ssnArea.length}`);
  if (ssnArea.length > 0 && ssnArea.length <= 20) {
    ssnArea.forEach((rect, i) => {
      console.log(`  ${i + 1}. x=${rect.x.toFixed(2)}, y=${rect.y.toFixed(2)}, w=${rect.width.toFixed(2)}, h=${rect.height.toFixed(2)}`);
    });
  }

  console.log(`\n🔢 Rectangles in EIN area (y≈347): ${einArea.length}`);
  if (einArea.length > 0 && einArea.length <= 20) {
    einArea.forEach((rect, i) => {
      console.log(`  ${i + 1}. x=${rect.x.toFixed(2)}, y=${rect.y.toFixed(2)}, w=${rect.width.toFixed(2)}, h=${rect.height.toFixed(2)}`);
    });
  }

  console.log('\n✅ Analysis complete!');
  console.log('\n💡 If we found 9 small boxes in SSN area and 9 in EIN area,');
  console.log('   we can use these visual boxes instead of guessing!');
});
