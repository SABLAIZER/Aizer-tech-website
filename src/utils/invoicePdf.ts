import { InvoiceRecord, StudioSettings } from '../types';

function escapePdfText(raw: string): string {
  return (raw || '')
    .replace(/[^\x20-\x7E]/g, ' ')
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
}

function wrapLine(text: string, maxChars: number): string[] {
  const clean = (text || '').replace(/\s+/g, ' ').trim();
  if (!clean) return [''];
  const words = clean.split(' ');
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    if (!current) {
      current = word;
    } else if (current.length + 1 + word.length <= maxChars) {
      current += ` ${word}`;
    } else {
      lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

export function buildInvoicePdfBlob(
  invoice: InvoiceRecord,
  settings: StudioSettings
): Blob {
  const amountFormatted = `GHS ${Math.round(invoice.amountGhs).toLocaleString('en-GH')}`;
  const statusText = invoice.status === 'paid' ? 'PAID' : 'UNPAID';
  const descLines = wrapLine(invoice.description, 72).slice(0, 6);
  const momoNum = settings.momoNumber || '027 633 5736';
  const momoName = settings.momoName || 'AizerTech GH';

  const commands: string[] = [];

  // Dark luxury page background header & gold accent frame (A4: 595 x 842 pt)
  commands.push('0.04 0.04 0.04 rg');
  commands.push('0 692 595 150 re f');

  // Gold stripe under header
  commands.push('0.831 0.686 0.216 rg');
  commands.push('0 688 595 4 re f');

  // Brand title in header
  commands.push('BT /F2 22 Tf 0.98 0.85 0.35 rg 46 785 Td (AIZERTECH GH) Tj ET');
  commands.push(
    'BT /F1 10 Tf 0.82 0.82 0.84 rg 46 765 Td (Luxury Websites, Mobile Apps & Digital Engineering - Accra, Ghana) Tj ET'
  );

  // Invoice badge & number on right of header
  commands.push('BT /F2 20 Tf 1 1 1 rg 415 785 Td (INVOICE) Tj ET');
  commands.push(
    `BT /F2 13 Tf 0.98 0.85 0.35 rg 415 764 Td (${escapePdfText(invoice.invoiceNumber)}) Tj ET`
  );
  commands.push(
    `BT /F2 10 Tf ${
      invoice.status === 'paid' ? '0.30 0.85 0.55' : '0.98 0.78 0.25'
    } rg 415 744 Td (STATUS: ${statusText}) Tj ET`
  );

  // Client & Invoice Meta block
  commands.push('BT /F2 10 Tf 0.55 0.43 0.10 rg 46 650 Td (BILLED TO) Tj ET');
  commands.push(
    `BT /F2 14 Tf 0.08 0.08 0.09 rg 46 631 Td (${escapePdfText(invoice.clientName)}) Tj ET`
  );
  commands.push(
    `BT /F1 10 Tf 0.28 0.28 0.30 rg 46 614 Td (Phone: ${escapePdfText(
      invoice.clientPhone || 'Not provided'
    )}) Tj ET`
  );
  commands.push(
    `BT /F1 10 Tf 0.28 0.28 0.30 rg 46 599 Td (Email: ${escapePdfText(
      invoice.clientEmail || 'Not provided'
    )}) Tj ET`
  );

  commands.push('BT /F2 10 Tf 0.55 0.43 0.10 rg 385 650 Td (INVOICE DETAILS) Tj ET');
  commands.push(
    `BT /F1 10 Tf 0.20 0.20 0.22 rg 385 631 Td (Date: ${escapePdfText(
      invoice.invoiceDate
    )}) Tj ET`
  );
  commands.push(
    `BT /F1 10 Tf 0.20 0.20 0.22 rg 385 615 Td (Contact: ${escapePdfText(
      settings.contactEmail
    )}) Tj ET`
  );

  // Table header bar
  commands.push('0.07 0.07 0.08 rg');
  commands.push('46 540 503 28 re f');
  commands.push('BT /F2 10 Tf 0.98 0.85 0.35 rg 60 550 Td (SERVICE & SCOPE OF WORK) Tj ET');
  commands.push('BT /F2 10 Tf 0.98 0.85 0.35 rg 455 550 Td (AMOUNT) Tj ET');

  // Table row content box
  commands.push('0.96 0.96 0.97 rg');
  commands.push('46 410 503 130 re f');
  commands.push('0.831 0.686 0.216 RG 0.8 w');
  commands.push('46 410 503 130 re S');

  commands.push(
    `BT /F2 12 Tf 0.08 0.08 0.09 rg 60 516 Td (${escapePdfText(invoice.service)}) Tj ET`
  );
  commands.push(
    `BT /F2 13 Tf 0.08 0.08 0.09 rg 450 516 Td (${escapePdfText(amountFormatted)}) Tj ET`
  );

  let yPos = 492;
  for (const line of descLines) {
    commands.push(
      `BT /F1 10 Tf 0.25 0.25 0.28 rg 60 ${yPos} Td (${escapePdfText(line)}) Tj ET`
    );
    yPos -= 15;
  }

  // Total strip
  commands.push('0.04 0.04 0.04 rg');
  commands.push('320 356 229 38 re f');
  commands.push('BT /F2 11 Tf 0.85 0.85 0.88 rg 336 371 Td (TOTAL DUE:) Tj ET');
  commands.push(
    `BT /F2 14 Tf 0.98 0.85 0.35 rg 442 370 Td (${escapePdfText(amountFormatted)}) Tj ET`
  );

  // MTN MoMo / Telecel Payment Card
  commands.push('0.98 0.96 0.90 rg');
  commands.push('46 218 503 114 re f');
  commands.push('0.831 0.686 0.216 RG 1.2 w');
  commands.push('46 218 503 114 re S');

  commands.push(
    'BT /F2 11 Tf 0.55 0.41 0.06 rg 62 308 Td (PAYMENT INSTRUCTIONS - MTN MOMO / TELECEL CASH) Tj ET'
  );
  commands.push(
    `BT /F2 12 Tf 0.08 0.08 0.09 rg 62 284 Td (Pay via MTN MoMo / Telecel Cash to: ${escapePdfText(
      momoNum
    )}) Tj ET`
  );
  commands.push(
    `BT /F2 11 Tf 0.08 0.08 0.09 rg 62 264 Td (Account Name: ${escapePdfText(
      momoName
    )}) Tj ET`
  );
  commands.push(
    'BT /F1 10 Tf 0.28 0.28 0.30 rg 62 240 Td (Please send your payment screenshot on WhatsApp after transfer so your project starts immediately.) Tj ET'
  );

  // Footer
  commands.push('0.831 0.686 0.216 rg');
  commands.push('46 115 503 1.5 re f');
  commands.push(
    'BT /F2 12 Tf 0.08 0.08 0.09 rg 195 88 Td (Thank you for choosing AizerTech) Tj ET'
  );
  commands.push(
    `BT /F1 9 Tf 0.42 0.42 0.45 rg 145 68 Td (AizerTech GH  |  Accra, Ghana  |  WhatsApp: +${escapePdfText(
      settings.whatsappNumber
    )}) Tj ET`
  );

  const streamContent = commands.join('\n');

  const objects: string[] = [
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n',
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> >>\nendobj\n',
    `4 0 obj\n<< /Length ${streamContent.length} >>\nstream\n${streamContent}\nendstream\nendobj\n`,
    '5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n',
    '6 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj\n',
  ];

  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [0];
  for (const obj of objects) {
    offsets.push(pdf.length);
    pdf += obj;
  }

  const xrefStart = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += '0000000000 65535 f \n';
  for (let i = 1; i < offsets.length; i++) {
    pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;

  return new Blob([pdf], { type: 'application/pdf' });
}

export function downloadInvoicePdf(
  invoice: InvoiceRecord,
  settings: StudioSettings
): void {
  const blob = buildInvoicePdfBlob(invoice, settings);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `AizerTech-${invoice.invoiceNumber || 'Invoice'}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.setTimeout(() => URL.revokeObjectURL(url), 4000);
}
