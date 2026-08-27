import { renderCertificatePdf, renderInvoicePdf } from './pdf-renderer.util';

describe('renderInvoicePdf', () => {
  it('renders a real PDF document (starts with the %PDF magic bytes)', async () => {
    const buffer = await renderInvoicePdf({
      invoiceNumber: 'INV-000001',
      orderNumber: 'ORD-000001',
      issuedAt: new Date('2027-06-01T00:00:00Z'),
      conferenceName: 'Operant Summit 2027',
      billedToName: 'Jane Doe',
      billedToEmail: 'jane@example.com',
      items: [
        {
          description: 'Standard Registration',
          quantity: 1,
          unitPrice: '2000.00',
          totalPrice: '2000.00',
        },
      ],
      subtotal: '2000.00',
      discount: '0.00',
      tax: '0.00',
      total: '2000.00',
      currency: 'USD',
    });

    expect(buffer.subarray(0, 4).toString('ascii')).toBe('%PDF');
    expect(buffer.length).toBeGreaterThan(0);
  });
});

describe('renderCertificatePdf', () => {
  it('renders a real PDF document (starts with the %PDF magic bytes)', async () => {
    const buffer = await renderCertificatePdf({
      certificateNumber: 'CERT-000001',
      certificateType: 'PARTICIPATION',
      holderName: 'Jane Doe',
      conferenceName: 'Operant Summit 2027',
      issuedAt: new Date('2027-06-01T00:00:00Z'),
      verificationCode: 'ABC123',
    });

    expect(buffer.subarray(0, 4).toString('ascii')).toBe('%PDF');
    expect(buffer.length).toBeGreaterThan(0);
  });
});
