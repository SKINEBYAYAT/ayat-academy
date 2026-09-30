import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Award } from 'lucide-react';
import { getPublicCertificate } from '@/lib/certificates/service';
import { CertificateDownloadActions } from '@/components/certificate-download-actions';

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
  const date = new Date(certificate.completedAt).toLocaleDateString('en', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });

  return <section className="certificate-page">
    {completed === '1' && valid && <div className="certificate-earned-banner" role="status">
      <Award size={22} aria-hidden="true" />
      <div><strong>Course completed!</strong><span>Your certificate is ready.</span></div>
    </div>}

    <div className="certificate-shell">
      <div className="certificate-art">
        <div className="certificate-orb certificate-orb-one" />
        <div className="certificate-orb certificate-orb-two" />
        <div className="certificate-inner">
          <div className="certificate-brand">
            <span className="certificate-wordmark">ayat</span>
            <span className="certificate-academy">ACADEMY</span>
          </div>

          <span className="certificate-kicker">Certificate of completion</span>
          <p className="certificate-presented">This certificate is proudly presented to</p>
          <h1>{certificate.studentName}</h1>
          <div className="certificate-rule" />
          <p className="certificate-completed-copy">for successfully completing</p>
          <h2>{certificate.courseName}</h2>
          <p className="certificate-date">Completed on {date}</p>

          <div className="certificate-quote">Knowledge is the beginning of beautiful care.</div>

          <div className="certificate-footer-row">
            <div><small>Certificate ID</small><strong>{certificate.certificateId}</strong></div>
            <div className="certificate-seal"><Award size={34} aria-hidden="true" /><span>Verified</span></div>
            <div className="certificate-footer-brand"><small>Issued by</small><strong>{certificate.brandName}</strong></div>
          </div>
        </div>
      </div>

      <aside className="certificate-side-panel">
        <span className="eyebrow">Your achievement</span>
        <h2>{valid ? 'Your certificate is ready.' : 'Certificate unavailable'}</h2>
        <p>{valid
          ? 'Keep the PDF for official records or save the image to share your achievement.'
          : 'This certificate has been revoked and can no longer be downloaded.'}</p>

        <dl className="certificate-details">
          <dt>Student</dt><dd>{certificate.studentName}</dd>
          <dt>Course</dt><dd>{certificate.courseName}</dd>
          <dt>Completion date</dt><dd>{date}</dd>
          <dt>Certificate ID</dt><dd>{certificate.certificateId}</dd>
          <dt>Status</dt><dd>{valid ? 'Valid' : 'Revoked'}</dd>
        </dl>

        {valid && <CertificateDownloadActions
          studentName={certificate.studentName}
          courseName={certificate.courseName}
          certificateId={certificate.certificateId}
          completedDate={date}
        />}
        <Link className="text-link certificate-back-link" href="/certificates">View all certificates</Link>
      </aside>
    </div>
  </section>;
}
