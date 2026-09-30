import { NextResponse } from 'next/server';
import { formatCertificateStudentName, getPublicCertificate } from '@/lib/certificates/service';
import { certificatePdf } from '@/lib/certificates/pdf';

export async function GET(_: Request, context: { params: Promise<{ certificateId: string }> }) {
  const { certificateId } = await context.params;
  const certificate = await getPublicCertificate(certificateId);
  if (!certificate || certificate.revokedAt) {
    return NextResponse.json({ error: 'Certificate not found.' }, { status: 404 });
  }

  const pdf = certificatePdf({
    studentName: formatCertificateStudentName(certificate.studentName),
    courseName: certificate.courseName,
    brandName: certificate.brandName,
    certificateId: certificate.certificateId,
    completedAt: new Date(certificate.completedAt),
  });

  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${certificate.certificateId}.pdf"`,
      'Cache-Control': 'public, max-age=300',
    },
  });
}
