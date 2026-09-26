import { requirePageUser } from '@/lib/auth/session';
import { launchReadiness, readinessSummary } from '@/lib/launch/readiness';

export const dynamic = 'force-dynamic';

export default async function SystemPage() {
  await requirePageUser(true);
  const checks = launchReadiness(process.env);
  const summary = readinessSummary(checks);

  return <section className="admin-page">
    <div className="admin-page-head">
      <div>
        <span className="eyebrow">Launch readiness</span>
        <h1>System check</h1>
        <p>Review production configuration before inviting students or accepting live payments.</p>
      </div>
      <div className="readiness-score"><strong>{summary.percentage}%</strong><span>{summary.ready}/{summary.total} ready</span></div>
    </div>

    <div className="readiness-list">
      {checks.map(check => <article className="panel readiness-item" key={check.key}>
        <span className={check.ready ? 'readiness-dot ready' : 'readiness-dot pending'} aria-hidden="true" />
        <div>
          <h3>{check.label}</h3>
          <p>{check.detail}</p>
        </div>
        <span className={check.ready ? 'status-badge published' : 'status-badge draft'}>{check.ready ? 'Ready' : 'Needs attention'}</span>
      </article>)}
    </div>

    <div className="panel launch-note">
      <h2>Before launch</h2>
      <p>Also run the complete lint, typecheck, build, unit-test, and integration-test suite; verify the PWA on iPhone/Android; confirm emails arrive; complete a real checkout; and test certificate generation from a fresh student account.</p>
    </div>
  </section>;
}
