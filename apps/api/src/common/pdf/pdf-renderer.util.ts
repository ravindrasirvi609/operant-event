
import PDFDocument from 'pdfkit';
import {
  PDFDocument as PdfLibDocument,
  StandardFonts,
  rgb,
} from 'pdf-lib';
import QRCode from 'qrcode';

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

export interface CertificateTemplatePosition {
  x: number;
  y: number;
}

export type CertificateTemplateFieldPositions = Record<
  string,
  CertificateTemplatePosition
>;

export interface CertificatePdfData {
  certificateNumber: string;
  certificateType: string;
  holderName: string;
  conferenceName: string;
  issuedAt: Date;
  verificationCode: string;
  templateBuffer?: Buffer;
  templateMimeType?: string;
  fieldPositions?: CertificateTemplateFieldPositions;
}

function renderPdf(
  draw: (doc: PDFKit.PDFDocument) => void,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    try {
      draw(doc);
      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

export function renderInvoicePdf(
  data: InvoicePdfData,
): Promise<Buffer> {
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

    doc.fontSize(12).text(`Total: ${data.currency} ${data.total}`, {
      underline: true,
    });
  });
}

const DEFAULT_TEMPLATE_POSITIONS: CertificateTemplateFieldPositions = {
  participantName: { x: 50, y: 48 },
  conferenceName: { x: 50, y: 62 },
  date: { x: 50, y: 75 },
  certificateNumber: { x: 50, y: 85 },
  qrCode: { x: 90, y: 85 },
};

function isValidPosition(
  position: CertificateTemplatePosition | undefined,
): position is CertificateTemplatePosition {
  return (
    position !== undefined &&
    Number.isFinite(position.x) &&
    Number.isFinite(position.y) &&
    position.x >= 0 &&
    position.x <= 100 &&
    position.y >= 0 &&
    position.y <= 100
  );
}

function getPosition(
  field: string,
  positions: CertificateTemplateFieldPositions,
): CertificateTemplatePosition {
  const savedPosition = positions[field];

  if (isValidPosition(savedPosition)) {
    return savedPosition;
  }

  return DEFAULT_TEMPLATE_POSITIONS[field];
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(value, max));
}

/**
 * Generates a certificate PDF.
 *
 * With a PNG/PDF template:
 *   Uses the uploaded template as the background and overlays fields.
 *
 * Without a template:
 *   Uses the existing default certificate design.
 *
 * Field positions are percentages measured from the top-left corner.
 */
export async function renderCertificatePdf(
  data: CertificatePdfData,
): Promise<Buffer> {
  const hasBuffer = Boolean(data.templateBuffer?.length);
  const hasMimeType = Boolean(data.templateMimeType);

  // A partially configured template must not silently fall back
  // to the default design.
  if (hasBuffer !== hasMimeType) {
    throw new Error(
      'Certificate template configuration is incomplete: both template buffer and MIME type are required.',
    );
  }

  if (!hasBuffer && !hasMimeType) {
    return renderPdf((doc) => {
      doc.fontSize(24).text('Certificate', { align: 'center' });
      doc.fontSize(14).text(data.certificateType, {
        align: 'center',
      });

      doc.moveDown(2);

      doc.fontSize(11).text('This certifies that', {
        align: 'center',
      });

      doc.fontSize(20).text(data.holderName, {
        align: 'center',
      });

      doc.fontSize(11).text(
        `participated in ${data.conferenceName}`,
        { align: 'center' },
      );

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

  const templateBuffer = data.templateBuffer!;
  const templateMimeType = data.templateMimeType!;

  let pdf: PdfLibDocument;

  if (templateMimeType === 'application/pdf') {
    pdf = await PdfLibDocument.load(templateBuffer);
  } else if (templateMimeType === 'image/png') {
    pdf = await PdfLibDocument.create();

    const image = await pdf.embedPng(templateBuffer);
    const width = 842;
    const height = (width * image.height) / image.width;
    const page = pdf.addPage([width, height]);

    page.drawImage(image, {
      x: 0,
      y: 0,
      width,
      height,
    });
  } else {
    throw new Error(
      `Unsupported certificate template MIME type: ${templateMimeType}. Use PNG or PDF.`,
    );
  }

  const page = pdf.getPages()[0];

  if (!page) {
    throw new Error('The uploaded certificate template has no pages.');
  }

  const { width, height } = page.getSize();

  const regularFont = await pdf.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdf.embedFont(StandardFonts.HelveticaBold);

  const positions: CertificateTemplateFieldPositions = {
    ...DEFAULT_TEMPLATE_POSITIONS,
    ...(data.fieldPositions ?? {}),
  };

  const dateText = data.issuedAt.toISOString().slice(0, 10);

  const fields = [
    {
      key: 'participantName',
      value: data.holderName,
      fontSize: 22,
      bold: true,
    },
    {
      key: 'conferenceName',
      value: data.conferenceName,
      fontSize: 12,
      bold: false,
    },
    {
      key: 'date',
      value: dateText,
      fontSize: 12,
      bold: false,
    },
    {
      key: 'certificateNumber',
      value: data.certificateNumber,
      fontSize: 12,
      bold: false,
    },
  ];

  for (const field of fields) {
    const position = getPosition(field.key, positions);
    const font = field.bold ? boldFont : regularFont;

    const textWidth = font.widthOfTextAtSize(
      field.value,
      field.fontSize,
    );

    // x/y in the editor represent the centre of the text.
    const desiredX = (position.x / 100) * width - textWidth / 2;
    const desiredY =
      height - (position.y / 100) * height - field.fontSize / 2;

    page.drawText(field.value, {
      x: clamp(desiredX, 0, Math.max(0, width - textWidth)),
      y: clamp(desiredY, 0, Math.max(0, height - field.fontSize)),
      size: field.fontSize,
      font,
      color: rgb(0, 0, 0),
    });
  }

  const qrPosition = getPosition('qrCode', positions);

  const qrBuffer = await QRCode.toBuffer(data.verificationCode, {
    type: 'png',
    width: 240,
    margin: 1,
    errorCorrectionLevel: 'M',
  });

  const qrImage = await pdf.embedPng(qrBuffer);
  const qrSize = 72;

  const desiredQrX = (qrPosition.x / 100) * width - qrSize / 2;
  const desiredQrY = height - (qrPosition.y / 100) * height - qrSize / 2;

  page.drawImage(qrImage, {
    x: clamp(desiredQrX, 0, Math.max(0, width - qrSize)),
    y: clamp(desiredQrY, 0, Math.max(0, height - qrSize)),
    width: qrSize,
    height: qrSize,
  });

  return Buffer.from(await pdf.save());
}
