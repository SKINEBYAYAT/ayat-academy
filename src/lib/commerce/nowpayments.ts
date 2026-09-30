import 'server-only';

import crypto from 'node:crypto';
import { HttpError } from '@/lib/http';

const API_BASE = 'https://api.nowpayments.io/v1';

function apiKey() {
  const value = process.env.NOWPAYMENTS_API_KEY?.trim();
  if (!value) throw new HttpError(503, 'Crypto payments are not configured.');
  return value;
}

export function hasNowPaymentsConfig() {
  return Boolean(process.env.NOWPAYMENTS_API_KEY?.trim() && process.env.NOWPAYMENTS_IPN_SECRET?.trim());
}

export async function createNowPaymentsInvoice(input: {
  amount: number;
  currency: string;
  orderId: string;
  description: string;
  callbackUrl: string;
  successUrl: string;
  cancelUrl: string;
}) {
  const response = await fetch(API_BASE + '/invoice', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey(),
    },
    body: JSON.stringify({
      price_amount: input.amount,
      price_currency: input.currency.toLowerCase(),
      pay_currency: 'usdtbsc',
      order_id: input.orderId,
      order_description: input.description.slice(0, 200),
      ipn_callback_url: input.callbackUrl,
      success_url: input.successUrl,
      cancel_url: input.cancelUrl,
      is_fixed_rate: true,
      is_fee_paid_by_user: false,
    }),
    cache: 'no-store',
  });

  const payload = await response.json().catch(() => null) as null | {
    id?: string | number;
    invoice_url?: string;
    message?: string;
  };

  if (!response.ok || !payload?.id || !payload.invoice_url) {
    throw new HttpError(502, 'Unable to start the crypto checkout. Please try again.');
  }

  return {
    invoiceId: String(payload.id),
    invoiceUrl: payload.invoice_url,
  };
}

function sortedJson(value: Record<string, unknown>) {
  const ordered: Record<string, unknown> = {};
  for (const key of Object.keys(value).sort()) ordered[key] = value[key];
  return JSON.stringify(ordered);
}

export function verifyNowPaymentsIpn(payload: Record<string, unknown>, receivedSignature: string | null) {
  const secret = process.env.NOWPAYMENTS_IPN_SECRET?.trim();
  if (!secret || !receivedSignature || !/^[0-9a-fA-F]{128}$/.test(receivedSignature)) return false;

  const expected = crypto
    .createHmac('sha512', secret)
    .update(sortedJson(payload))
    .digest('hex');

  const received = receivedSignature.toLowerCase();
  return crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(received, 'hex'));
}
