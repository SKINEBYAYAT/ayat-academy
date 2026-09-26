import 'server-only';

import { AdminSettings } from '@/lib/db/models/commerce';

export async function getPaymentMethodState() {
  const settings = await AdminSettings.findOne({ key: 'business' }).lean();

  const usdtReady = Boolean(settings?.usdtWallet && settings?.usdtNetwork);
  const whishCredentialsPresent = Boolean(process.env.WHISH_MERCHANT_ID && process.env.WHISH_API_KEY);
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
      credentialsPresent: whishCredentialsPresent,
      reason: whishCredentialsPresent
        ? 'Merchant credentials are present, but the official API contract/callback specification is still required before enabling live payments.'
        : 'Whish merchant credentials are not configured.',
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
