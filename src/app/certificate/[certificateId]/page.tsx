import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getPublicCertificate } from '@/lib/certificates/service';

export const dynamic = 'force-dynamic';

export default async function CertificatePage({
  params,
  searchParams,
}: {
  params: Promise<{ certificateId: string }>;
  searchParams: Promise<{ completed?: string }>;
}) {
  const { certificateId } = await params;
  const { completed } = await searchParams;
  const certificate = await getPublicCertificate(certificateId);
  if (!certificate) notFound();

  const valid = !certificate.revokedAt;

  return <section className="certificate-page">
    {completed === '1' && valid && <div className="notice certificate-earned" role="status">
      <strong>Course completed!</strong> You earned your certificate. You can view or save it below.
    </div>}
    <div className="certificate-verification-card">
      <span className="eyebrow">Certificate verification</span>
      <div className={valid ? 'certificate-state valid' : 'certificate-state revoked'}>{valid ? '✓ Valid certificate' : 'Certificate revoked'}</div>
      <h1>{certificate.studentName}</h1>
      <p>completed <strong>{certificate.courseName}</strong> through {certificate.brandName}.</p>
      <dl className="certificate-details">
        <dt>Certificate ID</dt><dd>{certificate.certificateId}</dd>
        <dt>Completion date</dt><dd>{new Date(certificate.completedAt).toLocaleDateString('en', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' })}</dd>
        <dt>Status</dt><dd>{valid ? 'Valid' : 'Revoked'}</dd>
      </dl>
      {valid && <div className="actions"><Link className="button" href={'/certificate/' + certificate.certificateId + '/pdf'}>Open PDF certificate</Link></div>}
    </div>
  </section>;
}
