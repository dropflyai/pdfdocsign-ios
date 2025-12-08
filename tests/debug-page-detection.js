const { PDFDocument } = require('pdf-lib');
const fs = require('fs');

async function debugPageDetection() {
  const pdfBytes = fs.readFileSync('/Users/rioallen/Downloads/f1040es.pdf');
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const pages = pdfDoc.getPages();

  console.log(`\n📄 PDF has ${pages.length} pages\n`);

  const form = pdfDoc.getForm();
  const fields = form.getFields();

  console.log(`📋 Total fields: ${fields.length}\n`);

  // Track page detection methods
  let successfulDetections = 0;
  let failedDetections = 0;
  const pageFieldCounts = new Map();

  for (let i = 0; i < Math.min(fields.length, 30); i++) {
    const field = fields[i];
    const fieldName = field.getName();
    const widgets = field.acroField.getWidgets();

    if (widgets && widgets.length > 0) {
      const widget = widgets[0];
      const pageRef = widget.P();
      const rect = widget.getRectangle();

      console.log(`\nField ${i + 1}: ${fieldName}`);
      console.log(`  Rect: (${rect.x.toFixed(1)}, ${rect.y.toFixed(1)}) ${rect.width.toFixed(1)}x${rect.height.toFixed(1)}`);
      console.log(`  PageRef type: ${pageRef?.constructor?.name || 'undefined'}`);

      // Method 1: indexOf
      let pageIndex = pages.indexOf(pageRef);
      console.log(`  Method 1 (indexOf): ${pageIndex}`);

      // Method 2: Compare page.ref with pageRef
      if (pageIndex === -1) {
        for (let j = 0; j < pages.length; j++) {
          if (pages[j].ref === pageRef) {
            pageIndex = j;
            console.log(`  Method 2 (page.ref === pageRef): ${pageIndex}`);
            break;
          }
        }
      }

      // Method 3: Compare page.node with pageRef
      if (pageIndex === -1) {
        for (let j = 0; j < pages.length; j++) {
          const pageNode = pages[j].node;
          if (pageNode === pageRef || pageNode.dict === pageRef) {
            pageIndex = j;
            console.log(`  Method 3 (page.node comparison): ${pageIndex}`);
            break;
          }
        }
      }

      // Method 4: findIndex with ref comparison
      if (pageIndex === -1) {
        pageIndex = pages.findIndex(page => page.ref === pageRef);
        console.log(`  Method 4 (findIndex): ${pageIndex}`);
      }

      if (pageIndex !== -1) {
        successfulDetections++;
        const pageNum = pageIndex + 1;
        pageFieldCounts.set(pageNum, (pageFieldCounts.get(pageNum) || 0) + 1);
        console.log(`  ✓ DETECTED: Page ${pageNum}`);
      } else {
        failedDetections++;
        console.log(`  ✗ FAILED to detect page`);
      }
    }
  }

  console.log(`\n\n📊 SUMMARY:`);
  console.log(`  Successful detections: ${successfulDetections}`);
  console.log(`  Failed detections: ${failedDetections}`);
  console.log(`\n  Fields by page:`);
  for (const [pageNum, count] of [...pageFieldCounts.entries()].sort((a, b) => a[0] - b[0])) {
    console.log(`    Page ${pageNum}: ${count} fields`);
  }
}

debugPageDetection().catch(console.error);
