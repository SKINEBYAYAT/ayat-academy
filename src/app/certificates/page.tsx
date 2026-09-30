import type { Metadata } from 'next';
import Link from 'next/link';
import { Award } from 'lucide-react';
import { requirePageUser } from '@/lib/auth/session';
import { Certificate } from '@/lib/db/models/commerce';

export const metadata: Metadata = { title: 'Your certificates', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default async function CertificatesPage() {
  const user = await requirePageUser();
  const certificates = await Certificate.find({
    userId: user._id,
    revokedAt: { $exists: false },
  }).sort({ completedAt: -1 }).lean();

  return <section className="workspace">
    <div className="workspace-head">
      <div>
        <span className="eyebrow">Achievements</span>
        <h1>Your certificates</h1>
        <p>Every completed course earns its own Ayat Academy certificate.</p>
      </div>
      <div className="actions"><Link className="button secondary small" href="/dashboard">Back to academy</Link></div>
    </div>

    <section className="panel student-course-panel">
      {certificates.length === 0 ? <div className="empty-state">
        <span className="empty-icon"><Award size={28} aria-hidden="true" /></span>
        <h3>No certificates yet.</h3>
        <p>Finish all published lessons in a course and your certificate will appear here automatically.</p>
      </div> : <div className="student-course-grid">
        {certificates.map(certificate => <article className="student-course-card" key={String(certificate._id)}>
          <div className="student-course-copy">
            <div className="status-row"><span className="status-badge published">Completed</span></div>
            <h3>{certificate.courseName}</h3>
            <p>Issued to {certificate.studentName}</p>
            <div className="student-progress-row">
              <span>{new Date(certificate.completedAt).toLocaleDateString('en', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' })}</span>
              <span>{certificate.certificateId}</span>
            </div>
            <div className="student-course-actions">
              <Link className="button small" href={'/certificate/' + certificate.certificateId}>View certificate</Link>
              <Link className="button secondary small" href={'/certificate/' + certificate.certificateId + '/pdf'}>Open PDF</Link>
            </div>
          </div>
        </article>)}
      </div>}
    </section>
  </section>;
}
