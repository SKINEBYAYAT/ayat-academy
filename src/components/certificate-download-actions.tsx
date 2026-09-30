'use client';

function fitFont(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, start: number, min = 24) {
  let size = start;
  while (size > min) {
    ctx.font = `600 ${size}px Georgia, "Times New Roman", serif`;
    if (ctx.measureText(text).width <= maxWidth) break;
    size -= 2;
  }
  return size;
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
    canvas.width = 1600;
    canvas.height = 1131;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const paper = '#f7f5ef';
    const green = '#294c3e';
    const muted = '#626b60';
    const sage = '#e7ecdf';
    const gold = '#b39666';

    ctx.fillStyle = paper;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = green;
    ctx.lineWidth = 5;
    ctx.strokeRect(42, 42, 1516, 1047);
    ctx.strokeStyle = gold;
    ctx.lineWidth = 2;
    ctx.strokeRect(62, 62, 1476, 1007);

    ctx.fillStyle = sage;
    ctx.beginPath();
    ctx.arc(140, 140, 76, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(1460, 990, 98, 0, Math.PI * 2);
    ctx.fill();

    ctx.textAlign = 'center';
    ctx.fillStyle = green;
    ctx.font = '64px Georgia, "Times New Roman", serif';
    ctx.fillText('ayat', 800, 155);
    ctx.font = '600 18px Arial, sans-serif';
    ctx.fillText('A C A D E M Y', 800, 196);

    ctx.fillStyle = muted;
    ctx.font = '600 20px Arial, sans-serif';
    ctx.fillText('CERTIFICATE OF COMPLETION', 800, 300);

    ctx.fillStyle = green;
    ctx.font = '30px Georgia, "Times New Roman", serif';
    ctx.fillText('This certificate is proudly presented to', 800, 378);

    const studentSize = fitFont(ctx, studentName, 1220, 76, 36);
    ctx.font = `600 ${studentSize}px Georgia, "Times New Roman", serif`;
    ctx.fillText(studentName, 800, 500);

    ctx.strokeStyle = gold;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(350, 540);
    ctx.lineTo(1250, 540);
    ctx.stroke();

    ctx.fillStyle = muted;
    ctx.font = '28px Arial, sans-serif';
    ctx.fillText('for successfully completing', 800, 615);

    ctx.fillStyle = green;
    const courseSize = fitFont(ctx, courseName, 1200, 54, 30);
    ctx.font = `600 ${courseSize}px Georgia, "Times New Roman", serif`;
    ctx.fillText(courseName, 800, 700);

    ctx.fillStyle = muted;
    ctx.font = '24px Arial, sans-serif';
    ctx.fillText(`Completed on ${completedDate}`, 800, 785);

    ctx.fillStyle = green;
    ctx.font = '600 22px Arial, sans-serif';
    ctx.fillText('Knowledge is the beginning of beautiful care.', 800, 875);

    ctx.textAlign = 'left';
    ctx.fillStyle = muted;
    ctx.font = '18px Arial, sans-serif';
    ctx.fillText('Certificate ID', 110, 1010);
    ctx.fillStyle = green;
    ctx.font = '600 18px Arial, sans-serif';
    ctx.fillText(certificateId, 110, 1045);

    ctx.textAlign = 'right';
    ctx.fillStyle = muted;
    ctx.font = '18px Arial, sans-serif';
    ctx.fillText('AYAT ACADEMY', 1490, 1010);
    ctx.fillStyle = green;
    ctx.font = '600 18px Arial, sans-serif';
    ctx.fillText('Professional skincare education', 1490, 1045);

    const link = document.createElement('a');
    link.download = certificateId + '.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  }

  return <div className="actions certificate-actions">
    <a className="button" href={'/certificate/' + certificateId + '/pdf'} target="_blank" rel="noreferrer">Get PDF</a>
    <button className="button secondary" type="button" onClick={downloadImage}>Get image</button>
  </div>;
}
