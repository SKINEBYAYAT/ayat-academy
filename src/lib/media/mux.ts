import 'server-only';

import { createSign } from 'node:crypto';
import { HttpError } from '@/lib/http';

const muxApi = 'https://api.mux.com/video/v1';

function credentials() {
  const tokenId = process.env.MUX_TOKEN_ID?.trim();
  const tokenSecret = process.env.MUX_TOKEN_SECRET?.trim();
  if (!tokenId || !tokenSecret) throw new HttpError(503, 'Mux video is not configured.');
  return { tokenId, tokenSecret };
}

function authHeader() {
  const { tokenId, tokenSecret } = credentials();
  return 'Basic ' + Buffer.from(tokenId + ':' + tokenSecret).toString('base64');
}

async function muxRequest(path: string, init?: RequestInit, options?: { allowNotFound?: boolean }) {
  const response = await fetch(muxApi + path, {
    ...init,
    headers: {
      Authorization: authHeader(),
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    cache: 'no-store',
  });
  const body = await response.json().catch(() => ({}));
  if (options?.allowNotFound && response.status === 404) return null;
  if (!response.ok) {
    console.error('Mux API error', response.status, body?.error?.type ?? body?.error?.message ?? 'unknown');
    throw new HttpError(502, 'Mux video service returned an error.');
  }
  return body.data;
}

export async function createMuxDirectUpload(origin: string) {
  return muxRequest('/uploads', {
    method: 'POST',
    body: JSON.stringify({
      cors_origin: origin,
      timeout: 3600,
      new_asset_settings: {
        playback_policies: ['signed'],
        video_quality: 'basic',
      },
    }),
  });
}

export async function getMuxDirectUpload(uploadId: string) {
  if (!/^[A-Za-z0-9_-]+$/.test(uploadId)) throw new HttpError(400, 'Invalid upload ID.');
  return muxRequest('/uploads/' + encodeURIComponent(uploadId));
}

export async function getMuxAsset(assetId: string) {
  if (!/^[A-Za-z0-9_-]+$/.test(assetId)) throw new HttpError(400, 'Invalid asset ID.');
  return muxRequest('/assets/' + encodeURIComponent(assetId));
}

function base64url(value: string | Buffer) {
  return Buffer.from(value).toString('base64url');
}

function privateKeyPem() {
  const raw = process.env.MUX_PRIVATE_KEY?.trim();
  if (!raw) throw new HttpError(503, 'Mux playback signing is not configured.');
  if (raw.includes('BEGIN')) return raw.replace(/\\n/g, '\n');
  try {
    return Buffer.from(raw, 'base64').toString('utf8');
  } catch {
    throw new HttpError(503, 'Mux playback signing key is invalid.');
  }
}

export function signMuxPlayback(playbackId: string, expiresInSeconds = 6 * 60 * 60) {
  const keyId = process.env.MUX_SIGNING_KEY_ID?.trim();
  if (!keyId) throw new HttpError(503, 'Mux playback signing is not configured.');

  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT', kid: keyId }));
  const payload = base64url(JSON.stringify({
    sub: playbackId,
    aud: 'v',
    exp: now + expiresInSeconds,
    iat: now,
  }));
  const unsigned = header + '.' + payload;
  const signer = createSign('RSA-SHA256');
  signer.update(unsigned);
  signer.end();
  const signature = signer.sign(privateKeyPem()).toString('base64url');
  return unsigned + '.' + signature;
}

export function muxAssetRef(playbackId: string) {
  return 'mux:' + playbackId;
}

export function muxPlaybackId(assetRef?: string | null) {
  if (!assetRef) return null;
  const match = assetRef.match(/^mux:([A-Za-z0-9_-]+)$/);
  return match?.[1] ?? null;
}


export async function deleteMuxAssetByRef(assetRef?: string | null) {
  const playbackId = muxPlaybackId(assetRef);
  if (!playbackId) return false;

  const playback = await muxRequest(
    '/playback-ids/' + encodeURIComponent(playbackId),
    undefined,
    { allowNotFound: true },
  );
  if (!playback) return true;

  if (playback.object?.type !== 'asset' || !playback.object?.id) {
    throw new HttpError(502, 'Mux playback is not attached to a video asset.');
  }

  await muxRequest(
    '/assets/' + encodeURIComponent(playback.object.id),
    { method: 'DELETE' },
    { allowNotFound: true },
  );
  return true;
}
