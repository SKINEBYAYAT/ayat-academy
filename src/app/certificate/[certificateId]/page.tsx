import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Award, CheckCircle2 } from 'lucide-react';
import { formatCertificateStudentName, getPublicCertificate } from '@/lib/certificates/service';
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
  const studentName = formatCertificateStudentName(certificate.studentName);
  const date = new Date(certificate.completedAt).toLocaleDateString('en', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });

  return <section className="certificate-page premium-certificate-page">
    {completed === '1' && valid && <div className="certificate-earned-banner" role="status">
      <Award size={20} aria-hidden="true" />
      <div><strong>Course completed</strong><span>Your Ayat Academy certificate is ready.</span></div>
    </div>}

    <div className="certificate-shell premium-certificate-shell">
      <article className="certificate-art premium-certificate-art" aria-label="Ayat Academy certificate">
        <div className="certificate-glow certificate-glow-top" />
        <div className="certificate-glow certificate-glow-bottom" />
        <div className="certificate-frame-outer" />
        <div className="certificate-frame-inner" />

        <div className="certificate-inner premium-certificate-inner">
          <header className="certificate-brand premium-certificate-brand">
            <span className="certificate-wordmark">ayat</span>
            <span className="certificate-academy">ACADEMY</span>
            <span className="certificate-brand-line" />
          </header>

          <div className="certificate-heading-block">
            <span className="certificate-kicker">Certificate of Completion</span>
            <p className="certificate-presented">This distinction is proudly awarded to</p>
          </div>

          <div className="certificate-recipient-block">
            <h1>{studentName}</h1>
            <span className="certificate-name-underline" />
          </div>

          <div className="certificate-course-block">
            <p className="certificate-completed-copy">for successfully completing</p>
            <h2>{certificate.courseName}</h2>
            <p className="certificate-date">Completed on {date}</p>
          </div>

          <div className="certificate-signature-row">
            <div className="certificate-signature">
              <span className="certificate-signature-line" />
              <strong>{certificate.brandName}</strong>
              <small>Issued by Ayat Academy</small>
            </div>

            <div className="certificate-medallion" aria-label={valid ? 'Verified certificate' : 'Revoked certificate'}>
              <div className="certificate-medallion-ring">
                {valid ? <CheckCircle2 size={30} aria-hidden="true" /> : <Award size={30} aria-hidden="true" />}
                <span>{valid ? 'VERIFIED' : 'REVOKED'}</span>
              </div>
            </div>

            <div className="certificate-id-block">
              <span className="certificate-id-line" />
              <strong>{certificate.certificateId}</strong>
              <small>Certificate ID</small>
            </div>
          </div>

          <footer className="certificate-bottom-note">
            <span>Professional skincare education</span>
            <i />
            <span>Knowledge is the beginning of beautiful care.</span>
          </footer>
        </div>
      </article>

      <aside className="certificate-side-panel premium-certificate-side-panel">
        <span className="eyebrow">Achievement</span>
        <h2>{valid ? 'A milestone worth keeping.' : 'Certificate unavailable'}</h2>
        <p>{valid
          ? 'Your certificate is ready in both PDF and image format. Save it, print it, or share your achievement.'
          : 'This certificate has been revoked and can no longer be downloaded.'}</p>

        <dl className="certificate-details">
          <dt>Student</dt><dd>{studentName}</dd>
          <dt>Course</dt><dd>{certificate.courseName}</dd>
          <dt>Completed</dt><dd>{date}</dd>
          <dt>Certificate ID</dt><dd>{certificate.certificateId}</dd>
          <dt>Status</dt><dd><span className={valid ? 'certificate-valid-pill' : 'certificate-revoked-pill'}>{valid ? 'Verified' : 'Revoked'}</span></dd>
        </dl>

        {valid && <CertificateDownloadActions
          studentName={studentName}
          courseName={certificate.courseName}
          certificateId={certificate.certificateId}
          completedDate={date}
        />}

        <Link className="text-link certificate-back-link" href="/certificates">View all certificates</Link>
      </aside>
    </div>
  </section>;
}
