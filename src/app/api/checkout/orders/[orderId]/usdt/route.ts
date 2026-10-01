import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { z } from 'zod';
import { requireUser } from '@/lib/auth/session';
import { Order, Payment } from '@/lib/db/models/commerce';
import { markOrderPaidFromVerifiedProvider } from '@/lib/commerce/orders';
import {
  BSC_RPC_URL,
  BSC_USDT_CONTRACT,
  BUSINESS_BSC_WALLET,
  ERC20_TRANSFER_TOPIC,
  usdtAtomicFromMinor,
} from '@/lib/commerce/bsc-usdt';
import { errorResponse, HttpError, readJson, sameOrigin } from '@/lib/http';

const schema = z.object({
  transactionHash: z.string().regex(/^0x[0-9a-fA-F]{64}$/, 'Invalid transaction hash.'),
});

type Receipt = {
  status: string;
  blockNumber: string;
  logs: Array<{ address: string; topics: string[]; data: string }>;
};

async function rpc<T>(method: string, params: unknown[]): Promise<T> {
  const response = await fetch(BSC_RPC_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
    cache: 'no-store',
  });
  if (!response.ok) throw new HttpError(503, 'Blockchain verification is temporarily unavailable.');

  const payload = await response.json() as { result?: T; error?: unknown };
  if (payload.error) throw new HttpError(503, 'Blockchain verification is temporarily unavailable.');
  return payload.result as T;
}

function topicAddress(topic?: string) {
  if (!topic || !/^0x[0-9a-fA-F]{64}$/.test(topic)) return null;
  return ('0x' + topic.slice(-40)).toLowerCase();
}

export async function POST(request: Request, context: { params: Promise<{ orderId: string }> }) {
  try {
    sameOrigin(request);
    const user = await requireUser();
    const { orderId } = await context.params;
    if (!mongoose.Types.ObjectId.isValid(orderId)) throw new HttpError(404, 'Order not found.');

    const input = schema.parse(await readJson(request));
    const hash = input.transactionHash.toLowerCase();
    const order = await Order.findOne({ _id: orderId, userId: user._id });

    if (!order) throw new HttpError(404, 'Order not found.');
    if (order.paymentMethod !== 'usdt') throw new HttpError(409, 'This order does not use crypto payment.');
    if (order.paymentStatus === 'paid') return NextResponse.json({ paid: true });
    if (order.paymentStatus === 'refunded') throw new HttpError(409, 'This order was refunded.');
    if (order.currency.toUpperCase() !== 'USD') throw new HttpError(409, 'Crypto payment currently supports USD-priced courses only.');

    const duplicate = await Order.exists({
      _id: { $ne: order._id },
      paymentMethod: 'usdt',
      transactionHash: hash,
    });
    if (duplicate) throw new HttpError(409, 'This transaction was already used for another order.');

    if (
      order.transactionHash &&
      order.transactionHash.toLowerCase() !== hash &&
      !['failed', 'rejected', 'pending'].includes(order.paymentStatus)
    ) {
      throw new HttpError(409, 'This order already has a different payment transaction.');
    }

    const receipt = await rpc<Receipt | null>('eth_getTransactionReceipt', [hash]);

    order.transactionHash = hash;
    order.network = 'BEP20';
    order.walletAddress = BUSINESS_BSC_WALLET;
    order.providerStatus = 'direct_onchain';

    if (!receipt) {
      order.paymentStatus = 'awaiting_verification';
      await order.save();
      return NextResponse.json({ paid: false, message: 'Payment sent. Waiting for BNB Smart Chain confirmation…' }, { status: 202 });
    }

    if (receipt.status !== '0x1') {
      order.paymentStatus = 'failed';
      await order.save();
      throw new HttpError(422, 'The wallet transaction failed. No course access was granted.');
    }

    const expectedAmount = usdtAtomicFromMinor(order.amountMinor);
    const merchant = BUSINESS_BSC_WALLET.toLowerCase();

    const transfer = receipt.logs.find(log =>
      log.address.toLowerCase() === BSC_USDT_CONTRACT.toLowerCase() &&
      log.topics?.[0]?.toLowerCase() === ERC20_TRANSFER_TOPIC &&
      topicAddress(log.topics?.[2]) === merchant &&
      BigInt(log.data || '0x0') === expectedAmount
    );

    if (!transfer) {
      order.paymentStatus = 'rejected';
      await order.save();
      throw new HttpError(422, 'The transaction does not match this order, USDT amount, and business wallet.');
    }

    order.payerWallet = topicAddress(transfer.topics?.[1]) ?? undefined;

    const latestBlockHex = await rpc<string>('eth_blockNumber', []);
    const confirmations = BigInt(latestBlockHex) - BigInt(receipt.blockNumber) + 1n;

    if (confirmations < 3n) {
      order.paymentStatus = 'awaiting_verification';
      await order.save();
      return NextResponse.json({ paid: false, message: 'Payment found. Waiting for secure blockchain confirmations…' }, { status: 202 });
    }

    order.paymentStatus = 'awaiting_verification';
    await order.save();
    await markOrderPaidFromVerifiedProvider(order._id, hash);

    try {
      await Payment.create({
        orderId: order._id,
        provider: 'bsc-direct',
        eventId: hash,
        status: 'paid',
        verifiedAt: new Date(),
      });
    } catch (error) {
      if ((error as { code?: number }).code !== 11000) throw error;
    }

    return NextResponse.json({ paid: true, message: 'Payment verified. Course access is unlocked.' });
  } catch (error) {
    return errorResponse(error);
  }
}
