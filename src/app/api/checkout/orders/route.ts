import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireUser } from '@/lib/auth/session';
import { createOrReuseOrder } from '@/lib/commerce/orders';
import { errorResponse, readJson, sameOrigin } from '@/lib/http';

const schema = z.object({
  courseId: z.string().regex(/^[a-f\d]{24}$/i),
  paymentMethod: z.enum(['whish', 'card', 'usdt']),
});

export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const user = await requireUser();
    const input = schema.parse(await readJson(request));
    const result = await createOrReuseOrder(user._id, input.courseId, input.paymentMethod);

    if (result.alreadyOwned) {
      return NextResponse.json({
        alreadyOwned: true,
        redirect: '/learn/' + result.course.slug,
      });
    }

    return NextResponse.json({
      alreadyOwned: false,
      order: {
        id: String(result.order!._id),
        amountMinor: result.order!.amountMinor,
        currency: result.order!.currency,
        paymentMethod: result.order!.paymentMethod,
        paymentStatus: result.order!.paymentStatus,
      },
      redirect: result.order!.paymentStatus === 'paid'
        ? '/learn/' + result.course.slug
        : '/checkout/order/' + result.order!._id,
    }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
