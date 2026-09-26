import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireUser } from '@/lib/auth/session';
import { AdminSettings } from '@/lib/db/models/commerce';
import { errorResponse, readJson, sameOrigin } from '@/lib/http';

const schema = z.object({
  usdtWallet: z.string().trim().max(200).optional().default(''),
  usdtNetwork: z.enum(['TRC20', 'ERC20', 'BEP20']).optional(),
  usdtQr: z.string().trim().max(500).optional().default(''),
  usdtInstructions: z.string().trim().max(2000).optional().default(''),
});

export async function GET() {
  try {
    await requireUser(true);
    const settings = await AdminSettings.findOne({ key: 'business' }).lean();
    return NextResponse.json({
      settings: {
        usdtWallet: settings?.usdtWallet ?? '',
        usdtNetwork: settings?.usdtNetwork ?? 'TRC20',
        usdtQr: settings?.usdtQr ?? '',
        usdtInstructions: settings?.usdtInstructions ?? '',
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: Request) {
  try {
    sameOrigin(request);
    await requireUser(true);
    const input = schema.parse(await readJson(request));

    const settings = await AdminSettings.findOneAndUpdate(
      { key: 'business' },
      {
        $set: {
          usdtWallet: input.usdtWallet || undefined,
          usdtNetwork: input.usdtNetwork,
          usdtQr: input.usdtQr || undefined,
          usdtInstructions: input.usdtInstructions || undefined,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    return NextResponse.json({
      settings: {
        usdtWallet: settings.usdtWallet ?? '',
        usdtNetwork: settings.usdtNetwork ?? 'TRC20',
        usdtQr: settings.usdtQr ?? '',
        usdtInstructions: settings.usdtInstructions ?? '',
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
