import { requirePageUser } from '@/lib/auth/session';
import { BUSINESS_BSC_WALLET } from '@/lib/commerce/bsc-usdt';

export const dynamic = 'force-dynamic';

export default async function AdminSettingsPage() {
  await requirePageUser(true);

  return <section className="admin-page narrow">
    <div className="admin-page-head">
      <div>
        <span className="eyebrow">Payments</span>
        <h1>Crypto wallet settings</h1>
        <p>Students pay directly from their connected MetaMask wallet. Ayat Academy verifies the transfer on BNB Smart Chain before granting course access.</p>
      </div>
    </div>
    <div className="panel">
      <dl className="order-details">
        <dt>Network</dt><dd>BNB Smart Chain (BEP-20)</dd>
        <dt>Receiving wallet</dt><dd className="break-value">{BUSINESS_BSC_WALLET}</dd>
        <dt>Payment flow</dt><dd>Connect wallet → approve USDT → automatic blockchain verification</dd>
      </dl>
      <div className="notice">Only the public receiving address is used. The website never stores or requests the business wallet private key or recovery phrase.</div>
    </div>
  </section>;
}
