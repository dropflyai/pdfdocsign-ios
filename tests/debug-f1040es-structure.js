const { PDFDocument } = require('pdf-lib');
const fs = require('fs');

async function analyzePDF() {
  const pdfBytes = fs.readFileSync('/Users/rioallen/Downloads/f1040es.pdf');
  const pdfDoc = await PDFDocument.load(pdfBytes);

  const form = pdfDoc.getForm();
  const fields = form.getFields();

  console.log(`\n📋 Total fields: ${fields.length}\n`);

  // Group fields by page
  const fieldsByPage = new Map();

  for (let i = 0; i < Math.min(fields.length, 20); i++) {
    const field = fields[i];
    const widgets = field.acroField.getWidgets();

    for (const widget of widgets) {
      const pageRef = widget.P();
      const pages = pdfDoc.getPages();
      const pageIndex = pages.findIndex(page => page.ref === pageRef);

      const rect = widget.getRectangle();

      if (!fieldsByPage.has(pageIndex + 1)) {
        fieldsByPage.set(pageIndex + 1, []);
      }

      fieldsByPage.get(pageIndex + 1).push({
        name: field.getName(),
        page: pageIndex + 1,
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height
      });
    }
  }

  // Print summary
  console.log('📊 Fields by page (first 20 fields):');
  for (const [pageNum, fields] of [...fieldsByPage.entries()].sort((a, b) => a[0] - b[0])) {
    console.log(`\nPage ${pageNum}: ${fields.length} fields`);
    fields.slice(0, 3).forEach(f => {
      console.log(`  - ${f.name}: (${f.x.toFixed(1)}, ${f.y.toFixed(1)})`);
    });
  }
}

analyzePDF().catch(console.error);
