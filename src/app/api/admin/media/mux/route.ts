import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth/session';
import { errorResponse, HttpError, sameOrigin } from '@/lib/http';
import { createMuxDirectUpload, getMuxAsset, getMuxDirectUpload, muxAssetRef } from '@/lib/media/mux';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    sameOrigin(request);
    await requireUser(true);

    if (process.env.MEDIA_PROVIDER?.trim() !== 'mux') {
      throw new HttpError(503, 'Mux video uploads are not enabled.');
    }

    // The admin endpoint itself is protected by sameOrigin + admin auth.
    // Use wildcard CORS only on Mux's short-lived signed upload URL so
    // production aliases/custom domains cannot break the browser PUT.
    const upload = await createMuxDirectUpload('*');
    return NextResponse.json({
      uploadId: upload.id,
      uploadUrl: upload.url,
    }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function GET(request: Request) {
  try {
    await requireUser(true);
    const uploadId = new URL(request.url).searchParams.get('uploadId');
    if (!uploadId) throw new HttpError(400, 'Upload ID is required.');

    const upload = await getMuxDirectUpload(uploadId);
    if (upload.status === 'errored' || upload.status === 'cancelled' || upload.status === 'timed_out') {
      throw new HttpError(422, upload.error?.message || 'Video upload failed.');
    }

    if (upload.status !== 'asset_created' || !upload.asset_id) {
      return NextResponse.json({ status: upload.status || 'processing', ready: false });
    }

    const asset = await getMuxAsset(upload.asset_id);
    const playback = (asset.playback_ids ?? []).find((item: { policy?: string }) => item.policy === 'signed');
    if (!playback?.id || asset.status !== 'ready') {
      return NextResponse.json({ status: asset.status || 'processing', ready: false });
    }

    return NextResponse.json({
      status: 'ready',
      ready: true,
      assetRef: muxAssetRef(playback.id),
      durationSeconds: typeof asset.duration === 'number' ? Math.round(asset.duration) : null,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
