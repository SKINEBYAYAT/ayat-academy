import { connectDB } from '@/lib/db/connect';
import { sameOrigin, readJson, errorResponse, HttpError } from '@/lib/http';
import { rateLimit, requestIp } from '@/lib/auth/rate-limit';
import { register, login, verify, forgot, reset, logout, resend } from '@/lib/auth/handlers';
import { assertAuthConfig } from '@/lib/config';
export const runtime = 'nodejs';
export const maxDuration = 60;
export async function POST(request: Request, context: { params: Promise<{ action: string }> }) {
  try {
    sameOrigin(request);
    const { action } = await context.params;
    if (!['register', 'login', 'verify', 'forgot', 'reset', 'logout', 'resend'].includes(action)) throw new HttpError(404, 'Not found.');
    assertAuthConfig();
    await connectDB();
    await rateLimit(`ip:${requestIp(request)}:${action}`, action === 'verify' ? 30 : 20);
    const data = await readJson(request);
    switch (action) {
      case 'register': return await register(data);
      case 'login': return await login(data, request);
      case 'verify': return await verify(data, request);
      case 'forgot': return await forgot(data);
      case 'reset': return await reset(data);
      case 'logout': return await logout();
      case 'resend': return await resend(data);
    }
  } catch (error) { return errorResponse(error); }
}
