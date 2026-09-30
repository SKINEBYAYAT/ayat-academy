import 'server-only';

import { muxPlaybackId, signMuxPlayback } from '@/lib/media/mux';

export type VideoSource =
  | { type: 'mux'; playbackId: string; playbackToken: string }
  | { type: 'url'; src: string };

export function resolvePrivateAsset(assetId?: string | null) {
  if (!assetId) return null;
  if (assetId.startsWith('/uploads/')) return assetId;
  const match = assetId.match(/^local-dev:(image|video|resource):([a-f0-9]+\.[A-Za-z0-9]+)$/);
  if (match) return '/uploads/' + match[1] + '/' + match[2];
  return null;
}

export function resolveVideoAsset(assetId?: string | null): VideoSource | null {
  const playbackId = muxPlaybackId(assetId);
  if (playbackId) {
    return {
      type: 'mux',
      playbackId,
      playbackToken: signMuxPlayback(playbackId),
    };
  }

  const src = resolvePrivateAsset(assetId);
  return src ? { type: 'url', src } : null;
}
