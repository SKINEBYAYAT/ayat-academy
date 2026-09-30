import 'server-only';

import { hasNowPaymentsConfig } from '@/lib/commerce/nowpayments';

export async function getPaymentMethodState() {
  const usdtReady = hasNowPaymentsConfig();
  const cardCredentialsPresent = Boolean(process.env.CARD_PROVIDER && process.env.CARD_API_KEY);

  return {
    usdt: {
      enabled: usdtReady,
      network: usdtReady ? 'BEP20' : null,
      wallet: null,
      qr: null,
      instructions: null,
      provider: usdtReady ? 'NOWPayments' : null,
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
