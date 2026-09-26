import { NextResponse } from 'next/server';
import { getPublicCertificate } from '@/lib/certificates/service';
import { certificatePdf } from '@/lib/certificates/pdf';

export async function GET(_: Request, context: { params: Promise<{ certificateId: string }> }) {
  const { certificateId } = await context.params;
  const certificate = await getPublicCertificate(certificateId);
  if (!certificate || certificate.revokedAt) {
    return NextResponse.json({ error: 'Certificate not found.' }, { status: 404 });
  }

  const pdf = certificatePdf({
    studentName: certificate.studentName,
    courseName: certificate.courseName,
    brandName: certificate.brandName,
    certificateId: certificate.certificateId,
    completedAt: new Date(certificate.completedAt),
  });

  return new NextResponse(pdf, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${certificate.certificateId}.pdf"`,
      'Cache-Control': 'public, max-age=300',
    },
  });
}
