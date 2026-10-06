import { requirePageUser } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

export default async function AdminSettingsPage() {
  await requirePageUser(true);

  return <section className="admin-page narrow">
    <div className="admin-page-head">
      <div>
        <span className="eyebrow">Settings</span>
        <h1>Academy settings</h1>
        <p>Payment and academy configuration will appear here as integrations are enabled.</p>
      </div>
    </div>
    <div className="panel">
      <div className="notice">Crypto payments are currently disabled.</div>
    </div>
  </section>;
}
