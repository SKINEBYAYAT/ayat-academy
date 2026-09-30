function escapePdf(value: string) {
  return value.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)').replace(/[^\x20-\x7E]/g, '?');
}

function text(x: number, y: number, size: number, value: string, font = 'F1') {
  return `BT /${font} ${size} Tf ${x} ${y} Td (${escapePdf(value)}) Tj ET`;
}

function centerX(value: string, size: number, pageWidth = 842) {
  return Math.max(56, Math.round((pageWidth - value.length * size * 0.50) / 2));
}

function fitSize(value: string, start: number, min: number, maxWidth: number) {
  let size = start;
  while (size > min && value.length * size * 0.50 > maxWidth) size -= 1;
  return size;
}

export function certificatePdf(data: {
  studentName: string;
  courseName: string;
  brandName: string;
  certificateId: string;
  completedAt: Date;
}) {
  const date = new Intl.DateTimeFormat('en', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' }).format(data.completedAt);
  const studentSize = fitSize(data.studentName, 34, 22, 610);
  const courseSize = fitSize(data.courseName, 26, 18, 610);

  const commands = [
    // warm paper
    '0.969 0.961 0.937 rg 0 0 842 595 re f',
    // subtle corner circles
    '0.906 0.925 0.875 rg 34 505 105 105 re f',
    '0.906 0.925 0.875 rg 710 -25 160 160 re f',
    // double frame
    '0.16 0.30 0.24 RG 3 w 28 28 786 539 re S',
    '0.70 0.59 0.40 RG 1 w 40 40 762 515 re S',

    // brand
    text(centerX('ayat', 28), 520, 28, 'ayat', 'F2'),
    text(centerX('A Y A T   A C A D E M Y', 8), 495, 8, 'A Y A T   A C A D E M Y', 'F1'),
    '0.70 0.59 0.40 RG 1 w 330 478 m 512 478 l S',

    // title
    text(centerX('CERTIFICATE OF COMPLETION', 14), 435, 14, 'CERTIFICATE OF COMPLETION', 'F1'),
    text(centerX('This distinction is proudly awarded to', 12), 398, 12, 'This distinction is proudly awarded to'),

    // recipient
    text(centerX(data.studentName, studentSize), 346, studentSize, data.studentName, 'F2'),
    '0.85 0.78 0.65 RG 1 w 195 326 m 647 326 l S',

    // course
    text(centerX('for successfully completing', 11), 294, 11, 'for successfully completing'),
    text(centerX(data.courseName, courseSize), 252, courseSize, data.courseName, 'F2'),
    text(centerX('Completed on ' + date, 10), 218, 10, 'Completed on ' + date),

    // signature + id safely inside footer
    '0.70 0.59 0.40 RG 1 w 74 126 m 274 126 l S',
    '0.70 0.59 0.40 RG 1 w 568 126 m 768 126 l S',
    text(74, 106, 11, data.brandName, 'F2'),
    text(74, 90, 8, 'Issued by Ayat Academy'),
    text(568, 106, 9, data.certificateId, 'F2'),
    text(568, 90, 8, 'Certificate ID'),

    // verified medallion
    '0.70 0.59 0.40 RG 1.5 w 392 88 58 58 re S',
    text(centerX('VERIFIED', 8), 110, 8, 'VERIFIED', 'F2'),

    // bottom phrase
    '0.85 0.78 0.65 RG 0.7 w 272 65 m 570 65 l S',
    text(centerX('Knowledge is the beginning of beautiful care.', 9), 47, 9, 'Knowledge is the beginning of beautiful care.', 'F2'),
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
