import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { z } from 'zod';
import { requireUser } from '@/lib/auth/session';
import { User } from '@/lib/db/models/auth';
import { Certificate } from '@/lib/db/models/commerce';
import { fullName } from '@/lib/auth/validation';
import { formatCertificateStudentName } from '@/lib/certificates/service';
import { errorResponse, HttpError, readJson, sameOrigin } from '@/lib/http';

const schema = z.object({ fullName });

export async function PATCH(request: Request, context: { params: Promise<{ userId: string }> }) {
  try {
    sameOrigin(request);
    await requireUser(true);
    const { userId } = await context.params;
    if (!mongoose.Types.ObjectId.isValid(userId)) throw new HttpError(404, 'Student not found.');

    const input = schema.parse(await readJson(request));
    const normalized = formatCertificateStudentName(input.fullName);

    const student = await User.findOneAndUpdate(
      { _id: userId, role: 'student' },
      { $set: { fullName: normalized } },
      { returnDocument: 'after', runValidators: true },
    );
    if (!student) throw new HttpError(404, 'Student not found.');

    await Certificate.updateMany(
      { userId: student._id },
      { $set: { studentName: normalized } },
    );

    return NextResponse.json({
      message: 'Student name updated. Existing certificates were updated too.',
      fullName: normalized,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
