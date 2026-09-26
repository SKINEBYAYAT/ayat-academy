function escapePdf(value: string) {
  return value.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)').replace(/[^\x20-\x7E]/g, '?');
}

function text(x: number, y: number, size: number, value: string, font = 'F1') {
  return `BT /${font} ${size} Tf ${x} ${y} Td (${escapePdf(value)}) Tj ET`;
}

function centerX(value: string, size: number, pageWidth = 842) {
  return Math.max(60, Math.round((pageWidth - value.length * size * 0.52) / 2));
}

export function certificatePdf(data: {
  studentName: string;
  courseName: string;
  brandName: string;
  certificateId: string;
  completedAt: Date;
}) {
  const date = new Intl.DateTimeFormat('en', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' }).format(data.completedAt);
  const commands = [
    '0.16 0.25 0.20 RG 3 w 28 28 786 539 re S',
    '0.70 0.59 0.40 RG 1.5 w 40 40 762 515 re S',
    text(centerX(data.brandName.toUpperCase(), 13), 505, 13, data.brandName.toUpperCase(), 'F2'),
    text(centerX('CERTIFICATE OF COMPLETION', 28), 430, 28, 'CERTIFICATE OF COMPLETION', 'F2'),
    text(centerX('This certifies that', 14), 380, 14, 'This certifies that'),
    text(centerX(data.studentName, 30), 330, 30, data.studentName, 'F2'),
    '0.70 0.59 0.40 RG 1 w 180 315 m 662 315 l S',
    text(centerX('has successfully completed', 14), 275, 14, 'has successfully completed'),
    text(centerX(data.courseName, 24), 230, 24, data.courseName, 'F2'),
    text(centerX('Completed on ' + date, 12), 170, 12, 'Completed on ' + date),
    text(70, 88, 10, 'Certificate ID: ' + data.certificateId),
    text(70, 68, 9, 'Verify this certificate on the Ayat Academy certificate verification page.'),
    text(650, 88, 10, data.brandName, 'F2'),
  ].join('\n');

  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 842 595] /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> /Contents 4 0 R >>',
    `<< /Length ${Buffer.byteLength(commands)} >>\nstream\n${commands}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Times-Bold >>',
  ];

  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  objects.forEach((obj, i) => {
    offsets.push(Buffer.byteLength(pdf));
    pdf += `${i + 1} 0 obj\n${obj}\nendobj\n`;
  });
  const xref = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= objects.length; i++) pdf += String(offsets[i]).padStart(10, '0') + ' 00000 n \n';
  pdf += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(pdf);
}
