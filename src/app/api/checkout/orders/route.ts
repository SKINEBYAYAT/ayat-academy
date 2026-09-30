import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireUser } from '@/lib/auth/session';
import { createOrReuseOrder, enrollFreeCourse } from '@/lib/commerce/orders';
import { errorResponse, HttpError, readJson, sameOrigin } from '@/lib/http';
import { getPaymentMethodState } from '@/lib/commerce/payment-methods';

const schema = z.object({
  courseId: z.string().regex(/^[a-f\d]{24}$/i),
  paymentMethod: z.enum(['whish', 'card', 'usdt']).optional(),
});

export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const user = await requireUser();
    const input = schema.parse(await readJson(request));
    if (!input.paymentMethod) {
      const result = await enrollFreeCourse(user._id, input.courseId);
      return NextResponse.json({
        alreadyOwned: false,
        free: true,
        redirect: '/learn/' + result.course.slug,
      }, { status: 201 });
    }

    const methods = await getPaymentMethodState();
    if (input.paymentMethod === 'usdt' && !methods.usdt.enabled) throw new HttpError(503, 'USDT payments are not configured.');
    if (input.paymentMethod === 'whish' && !methods.whish.enabled) throw new HttpError(503, methods.whish.reason);
    if (input.paymentMethod === 'card' && !methods.card.enabled) throw new HttpError(503, methods.card.reason);
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
