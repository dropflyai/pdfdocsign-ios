import { test } from '@playwright/test';

test('analyze PDF graphics in browser to find visual boxes', async ({ page }) => {
  // Navigate to app and intercept PDF loading
  await page.goto('http://localhost:3020');
  await page.waitForLoadState('networkidle');

  // Inject analysis code into the page
  const analysisResults = await page.evaluate(async () => {
    // Load the PDF
    const response = await fetch('/Users/rioallen/Downloads/fw9.pdf');
    const arrayBuffer = await response.arrayBuffer();

    const pdfjsLib = (window as any).pdfjsLib;
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;

    const page1 = await pdf.getPage(1);
    const viewport = page1.getViewport({ scale: 1 });

    // Get operator list (drawing commands)
    const ops = await page1.getOperatorList();

    const rectangles: any[] = [];

    // Scan through all operations to find rectangles
    for (let i = 0; i < ops.fnArray.length; i++) {
      const fn = ops.fnArray[i];
      const args = ops.argsArray[i];

      // OPS.rectangle = 43
      if (fn === 43) {
        rectangles.push({
          x: args[0],
          y: args[1],
          width: args[2],
          height: args[3]
        });
      }
    }

    // Filter for small boxes (potential digit boxes)
    const smallBoxes = rectangles.filter(r =>
      r.width > 5 && r.width < 50 &&
      r.height > 5 && r.height < 50
    );

    return {
      totalRectangles: rectangles.length,
      smallBoxes: smallBoxes,
      pageHeight: viewport.height,
      pageWidth: viewport.width
    };
  });

  console.log('\n📄 PDF Graphics Analysis Results\n');
  console.log(`Page dimensions: ${analysisResults.pageWidth} x ${analysisResults.pageHeight}`);
  console.log(`Total rectangles found: ${analysisResults.totalRectangles}`);
  console.log(`Small boxes (5-50px): ${analysisResults.smallBoxes.length}`);

  // Group boxes by similar Y position
  const grouped = new Map<number, any[]>();

  analysisResults.smallBoxes.forEach((box: any) => {
    const yRounded = Math.round(box.y / 10) * 10; // Group by 10px ranges
    if (!grouped.has(yRounded)) {
      grouped.set(yRounded, []);
    }
    grouped.get(yRounded)!.push(box);
  });

  console.log(`\n📊 Small boxes grouped by Y position:`);
  const sortedGroups = Array.from(grouped.entries()).sort((a, b) => b[0] - a[0]);

  sortedGroups.forEach(([y, boxes]) => {
    if (boxes.length >= 2) { // Only show rows with multiple boxes
      console.log(`\nY ≈ ${y}: ${boxes.length} boxes`);
      boxes.slice(0, 12).forEach((box: any, i: number) => {
        console.log(`  ${i + 1}. x=${box.x.toFixed(1)}, y=${box.y.toFixed(1)}, w=${box.width.toFixed(1)} x h=${box.height.toFixed(1)}`);
      });
      if (boxes.length > 12) {
        console.log(`  ... and ${boxes.length - 12} more`);
      }
    }
  });

  console.log('\n✅ Analysis complete!');
});
