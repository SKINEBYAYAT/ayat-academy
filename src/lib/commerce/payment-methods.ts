import 'server-only';

import { AdminSettings } from '@/lib/db/models/commerce';

export async function getPaymentMethodState() {
  const settings = await AdminSettings.findOne({ key: 'business' }).lean();

  const usdtReady = Boolean(settings?.usdtWallet && settings?.usdtNetwork);
  const cardCredentialsPresent = Boolean(process.env.CARD_PROVIDER && process.env.CARD_API_KEY);

  return {
    usdt: {
      enabled: usdtReady,
      network: settings?.usdtNetwork ?? null,
      wallet: settings?.usdtWallet ?? null,
      qr: settings?.usdtQr ?? null,
      instructions: settings?.usdtInstructions ?? null,
    },
    whish: {
      enabled: false,
      credentialsPresent: false,
      reason: 'Whish Pay is intentionally skipped for now.',
    },
    card: {
      enabled: false,
      credentialsPresent: cardCredentialsPresent,
      reason: cardCredentialsPresent
        ? 'Card credentials are present, but a concrete provider integration is not implemented yet.'
        : 'Card provider credentials are not configured.',
    },
  };
}
