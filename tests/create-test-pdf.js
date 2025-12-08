const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');
const fs = require('fs');

async function createTestPDF() {
  // Create a new PDF document
  const pdfDoc = await PDFDocument.create();

  // Add a page
  const page = pdfDoc.addPage([600, 800]);
  const { width, height } = page.getSize();

  // Add title
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  page.drawText('Test Form', {
    x: 50,
    y: height - 50,
    size: 24,
    font: boldFont,
    color: rgb(0, 0, 0),
  });

  // Get the form
  const form = pdfDoc.getForm();

  // Add text field 1
  page.drawText('Name:', {
    x: 50,
    y: height - 100,
    size: 12,
    font: font,
  });

  const nameField = form.createTextField('name');
  nameField.addToPage(page, {
    x: 150,
    y: height - 115,
    width: 200,
    height: 20,
  });
  nameField.setText('');

  // Add text field 2
  page.drawText('Email:', {
    x: 50,
    y: height - 150,
    size: 12,
    font: font,
  });

  const emailField = form.createTextField('email');
  emailField.addToPage(page, {
    x: 150,
    y: height - 165,
    width: 200,
    height: 20,
  });
  emailField.setText('');

  // Add text field 3
  page.drawText('Address:', {
    x: 50,
    y: height - 200,
    size: 12,
    font: font,
  });

  const addressField = form.createTextField('address');
  addressField.addToPage(page, {
    x: 150,
    y: height - 215,
    width: 300,
    height: 20,
  });
  addressField.setText('');

  // Add checkboxes
  page.drawText('Subscribe to newsletter:', {
    x: 50,
    y: height - 250,
    size: 12,
    font: font,
  });

  const checkbox1 = form.createCheckBox('newsletter');
  checkbox1.addToPage(page, {
    x: 250,
    y: height - 265,
    width: 15,
    height: 15,
  });

  page.drawText('I agree to terms:', {
    x: 50,
    y: height - 300,
    size: 12,
    font: font,
  });

  const checkbox2 = form.createCheckBox('terms');
  checkbox2.addToPage(page, {
    x: 250,
    y: height - 315,
    width: 15,
    height: 15,
  });

  // Save the PDF
  const pdfBytes = await pdfDoc.save();

  // Write to file
  fs.writeFileSync('tests/test-form.pdf', pdfBytes);
  console.log('✅ Test PDF created at tests/test-form.pdf');
  console.log('   - 3 text fields (name, email, address)');
  console.log('   - 2 checkboxes (newsletter, terms)');
}

createTestPDF().catch(console.error);
