'use client';

function fitSerif(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, start: number, min = 28) {
  let size = start;
  while (size > min) {
    ctx.font = `600 ${size}px Georgia, "Times New Roman", serif`;
    if (ctx.measureText(text).width <= maxWidth) break;
    size -= 2;
  }
  return size;
}

function spacedText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, spacing: number) {
  const chars = [...text];
  const widths = chars.map(char => ctx.measureText(char).width);
  const total = widths.reduce((sum, width) => sum + width, 0) + Math.max(0, chars.length - 1) * spacing;
  let cursor = x - total / 2;
  for (let i = 0; i < chars.length; i++) {
    ctx.fillText(chars[i], cursor, y);
    cursor += widths[i] + spacing;
  }
}

export function CertificateDownloadActions({
  studentName,
  courseName,
  certificateId,
  completedDate,
}: {
  studentName: string;
  courseName: string;
  certificateId: string;
  completedDate: string;
}) {
  function downloadImage() {
    const canvas = document.createElement('canvas');
    canvas.width = 2000;
    canvas.height = 1414;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const paper = '#f7f5ef';
    const green = '#294c3e';
    const deep = '#1f352c';
    const muted = '#6b7369';
    const sage = '#e7ecdf';
    const gold = '#b39666';
    const paleGold = '#e9dfcd';

    ctx.fillStyle = paper;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Soft editorial accents
    ctx.fillStyle = sage;
    ctx.beginPath();
    ctx.arc(90, 95, 145, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(1915, 1335, 190, 0, Math.PI * 2);
    ctx.fill();

    // Double premium frame
    ctx.strokeStyle = green;
    ctx.lineWidth = 5;
    ctx.strokeRect(58, 58, 1884, 1298);
    ctx.strokeStyle = gold;
    ctx.lineWidth = 2;
    ctx.strokeRect(82, 82, 1836, 1250);

    // Header brand
    ctx.textAlign = 'center';
    ctx.fillStyle = green;
    ctx.font = '72px Georgia, "Times New Roman", serif';
    ctx.fillText('ayat', 1000, 190);
    ctx.font = '600 18px Arial, sans-serif';
    spacedText(ctx, 'ACADEMY', 1000, 232, 10);

    ctx.strokeStyle = gold;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(820, 268);
    ctx.lineTo(1180, 268);
    ctx.stroke();

    ctx.fillStyle = muted;
    ctx.font = '600 20px Arial, sans-serif';
    spacedText(ctx, 'CERTIFICATE OF COMPLETION', 1000, 360, 5);

    ctx.fillStyle = deep;
    ctx.font = '30px Georgia, "Times New Roman", serif';
    ctx.fillText('This distinction is proudly awarded to', 1000, 438);

    const studentSize = fitSerif(ctx, studentName, 1450, 92, 42);
    ctx.fillStyle = green;
    ctx.font = `600 ${studentSize}px Georgia, "Times New Roman", serif`;
    ctx.fillText(studentName, 1000, 565);

    ctx.strokeStyle = paleGold;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(475, 610);
    ctx.lineTo(1525, 610);
    ctx.stroke();

    ctx.fillStyle = muted;
    ctx.font = '27px Arial, sans-serif';
    ctx.fillText('for successfully completing', 1000, 690);

    const courseSize = fitSerif(ctx, courseName, 1420, 64, 34);
    ctx.fillStyle = deep;
    ctx.font = `600 ${courseSize}px Georgia, "Times New Roman", serif`;
    ctx.fillText(courseName, 1000, 785);

    ctx.fillStyle = muted;
    ctx.font = '23px Arial, sans-serif';
    ctx.fillText(`Completed on ${completedDate}`, 1000, 845);

    // Footer signature row, safely above frame
    const footerY = 1080;
    ctx.strokeStyle = gold;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(180, footerY);
    ctx.lineTo(600, footerY);
    ctx.moveTo(1400, footerY);
    ctx.lineTo(1820, footerY);
    ctx.stroke();

    ctx.textAlign = 'left';
    ctx.fillStyle = deep;
    ctx.font = '600 24px Georgia, "Times New Roman", serif';
    ctx.fillText('Ayat Academy', 180, footerY + 42);
    ctx.fillStyle = muted;
    ctx.font = '16px Arial, sans-serif';
    ctx.fillText('Issued by', 180, footerY + 72);

    ctx.textAlign = 'right';
    ctx.fillStyle = deep;
    ctx.font = '600 18px Arial, sans-serif';
    ctx.fillText(certificateId, 1820, footerY + 42);
    ctx.fillStyle = muted;
    ctx.font = '16px Arial, sans-serif';
    ctx.fillText('Certificate ID', 1820, footerY + 72);

    // Center verified medallion
    ctx.textAlign = 'center';
    ctx.strokeStyle = gold;
    ctx.fillStyle = paper;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(1000, footerY + 34, 74, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = green;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(1000, footerY + 34, 58, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = green;
    ctx.font = '600 15px Arial, sans-serif';
    spacedText(ctx, 'VERIFIED', 1000, footerY + 40, 3);

    ctx.strokeStyle = paleGold;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(620, 1240);
    ctx.lineTo(1380, 1240);
    ctx.stroke();

    ctx.fillStyle = green;
    ctx.font = 'italic 19px Georgia, "Times New Roman", serif';
    ctx.fillText('Knowledge is the beginning of beautiful care.', 1000, 1286);

    const link = document.createElement('a');
    link.download = certificateId + '.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  }

  return <div className="actions certificate-actions">
    <a className="button" href={'/certificate/' + certificateId + '/pdf'}>Download PDF</a>
    <button className="button secondary" type="button" onClick={downloadImage}>Download image</button>
  </div>;
}
