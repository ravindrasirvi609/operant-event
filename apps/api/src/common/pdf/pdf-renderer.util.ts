import PDFDocument from 'pdfkit';

export interface InvoicePdfItem {
  description: string;
  quantity: number;
  unitPrice: string;
  totalPrice: string;
}

export interface InvoicePdfData {
  invoiceNumber: string;
  orderNumber: string;
  issuedAt: Date;
  conferenceName: string;
  billedToName: string;
  billedToEmail: string;
  items: InvoicePdfItem[];
  subtotal: string;
  discount: string;
  tax: string;
  total: string;
  currency: string;
}

export interface CertificatePdfData {
  certificateNumber: string;
  certificateType: string;
  holderName: string;
  conferenceName: string;
  issuedAt: Date;
  verificationCode: string;
}

function renderPdf(draw: (doc: PDFKit.PDFDocument) => void): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    draw(doc);
    doc.end();
  });
}

export function renderInvoicePdf(data: InvoicePdfData): Promise<Buffer> {
  return renderPdf((doc) => {
    doc.fontSize(20).text('Invoice', { align: 'center' });
    doc.moveDown();
    doc.fontSize(10);
    doc.text(`Invoice Number: ${data.invoiceNumber}`);
    doc.text(`Order Number: ${data.orderNumber}`);
    doc.text(`Issued: ${data.issuedAt.toISOString().slice(0, 10)}`);
    doc.text(`Conference: ${data.conferenceName}`);
    doc.moveDown();
    doc.text(`Billed To: ${data.billedToName}`);
    doc.text(data.billedToEmail);
    doc.moveDown();

    doc.fontSize(11).text('Items', { underline: true });
    doc.fontSize(10);
    for (const item of data.items) {
      doc.text(
        `${item.description} x${item.quantity} — ${data.currency} ${item.unitPrice} = ${data.currency} ${item.totalPrice}`,
      );
    }
    doc.moveDown();

    doc.text(`Subtotal: ${data.currency} ${data.subtotal}`);
    doc.text(`Discount: ${data.currency} ${data.discount}`);
    doc.text(`Tax: ${data.currency} ${data.tax}`);
    doc
      .fontSize(12)
      .text(`Total: ${data.currency} ${data.total}`, { underline: true });
  });
}

export function renderCertificatePdf(
  data: CertificatePdfData,
): Promise<Buffer> {
  return renderPdf((doc) => {
    doc.fontSize(24).text('Certificate', { align: 'center' });
    doc.fontSize(14).text(data.certificateType, { align: 'center' });
    doc.moveDown(2);
    doc.fontSize(11).text('This certifies that', { align: 'center' });
    doc.fontSize(20).text(data.holderName, { align: 'center' });
    doc.fontSize(11).text(`participated in ${data.conferenceName}`, {
      align: 'center',
    });
    doc.moveDown(2);
    doc.fontSize(9);
    doc.text(`Certificate Number: ${data.certificateNumber}`, {
      align: 'center',
    });
    doc.text(`Issued: ${data.issuedAt.toISOString().slice(0, 10)}`, {
      align: 'center',
    });
    doc.text(`Verification Code: ${data.verificationCode}`, {
      align: 'center',
    });
  });
}
