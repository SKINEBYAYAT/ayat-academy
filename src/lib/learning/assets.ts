import 'server-only';

export function resolvePrivateAsset(assetId?: string | null) {
  if (!assetId) return null;
  if (assetId.startsWith('/uploads/')) return assetId;
  const match = assetId.match(/^local-dev:(image|video|resource):([a-f0-9]+\.[A-Za-z0-9]+)$/);
  if (match) return '/uploads/' + match[1] + '/' + match[2];
  return null;
}
