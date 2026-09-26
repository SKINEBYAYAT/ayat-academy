import { requirePageUser } from '@/lib/auth/session';
import { AdminSettings } from '@/lib/db/models/commerce';
import { PaymentSettingsForm } from '@/components/admin/payment-settings-form';

export const dynamic = 'force-dynamic';

export default async function AdminSettingsPage() {
  await requirePageUser(true);
  const settings = await AdminSettings.findOne({ key: 'business' }).lean();

  return <section className="admin-page narrow">
    <div className="admin-page-head">
      <div>
        <span className="eyebrow">Payments</span>
        <h1>Payment settings</h1>
        <p>Configure the manual USDT payment destination. Whish and card stay disabled until their official provider integrations are complete.</p>
      </div>
    </div>
    <div className="panel">
      <PaymentSettingsForm initial={{
        usdtWallet: settings?.usdtWallet ?? '',
        usdtNetwork: settings?.usdtNetwork ?? 'TRC20',
        usdtQr: settings?.usdtQr ?? '',
        usdtInstructions: settings?.usdtInstructions ?? '',
      }} />
    </div>
  </section>;
}
