import 'server-only';

import { BUSINESS_BSC_WALLET } from '@/lib/commerce/bsc-usdt';

export async function getPaymentMethodState() {
  const cardCredentialsPresent = Boolean(process.env.CARD_PROVIDER && process.env.CARD_API_KEY);

  return {
    usdt: {
      enabled: true,
      network: 'BEP20',
      wallet: BUSINESS_BSC_WALLET,
      qr: null,
      instructions: null,
      provider: 'direct-wallet',
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
