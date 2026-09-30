import 'server-only';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import { del, put } from '@vercel/blob';
import { HttpError } from '@/lib/http';

const allowed = {
  image: ['image/jpeg','image/png','image/webp','image/avif','image/gif','image/bmp','image/heic','image/heif'],
  video: ['video/mp4','video/webm','video/quicktime'],
  resource: ['application/pdf','image/jpeg','image/png','image/webp','application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
} as const;

function safeExtension(file: File, kind: keyof typeof allowed) {
  return path.extname(file.name).replace(/[^.a-zA-Z0-9]/g, '').slice(0, 10)
    || (kind === 'image' ? '.jpg' : kind === 'video' ? '.mp4' : '.bin');
}

async function saveToBlob(file: File, kind: 'image' | 'resource') {
  const token = process.env.BLOB_READ_WRITE_TOKEN?.trim();
  if (!token) throw new HttpError(503, 'Vercel Blob storage is not configured.');

  const ext = safeExtension(file, kind).toLowerCase();
  const pathname = 'ayat-academy/' + kind + '/' + randomBytes(18).toString('hex') + ext;

  try {
    const blob = await put(pathname, file, {
      access: 'public',
      token,
      contentType: file.type,
      addRandomSuffix: false,
    });

    return {
      url: blob.url,
      assetId: 'blob:' + blob.url,
      provider: 'vercel-blob',
    };
  } catch {
    throw new HttpError(502, 'Unable to upload file to Vercel Blob.');
  }
}

export async function saveMedia(file: File, kind: keyof typeof allowed) {
  if (!(allowed[kind] as readonly string[]).includes(file.type)) {
    throw new HttpError(415, 'This file type is not supported.');
  }

  const max = kind === 'video' ? 250 * 1024 * 1024 : 12 * 1024 * 1024;
  if (file.size <= 0 || file.size > max) {
    throw new HttpError(
      413,
      kind === 'video'
        ? 'Video is too large.'
        : kind === 'image'
          ? 'Image is too large. Please use an image under 12 MB.'
          : 'File is too large.',
    );
  }

  // Production videos use the dedicated Mux direct-upload flow.
  if (kind === 'video') {
    throw new HttpError(400, 'Lesson videos must be uploaded through the secure Mux uploader.');
  }

  // Production images/resources belong in Vercel Blob, regardless of MEDIA_PROVIDER=mux.
  if (process.env.NODE_ENV === 'production' || process.env.BLOB_READ_WRITE_TOKEN) {
    return saveToBlob(file, kind);
  }

  // Local fallback keeps development convenient when Blob credentials are absent.
  const ext = safeExtension(file, kind);
  const name = randomBytes(18).toString('hex') + ext.toLowerCase();
  const dir = path.join(process.cwd(), 'public', 'uploads', kind);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, name), Buffer.from(await file.arrayBuffer()));
  return {
    url: '/uploads/' + kind + '/' + name,
    assetId: 'local-dev:' + kind + ':' + name,
    provider: 'local-dev',
  };
}


function blobUrlFromRef(value?: string | null) {
  if (!value) return null;
  const candidate = value.startsWith('blob:') ? value.slice(5) : value;
  try {
    const url = new URL(candidate);
    return url.protocol === 'https:' && url.hostname.endsWith('.blob.vercel-storage.com')
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

export async function deleteBlobAsset(value?: string | null) {
  const url = blobUrlFromRef(value);
  if (!url) return false;

  const token = process.env.BLOB_READ_WRITE_TOKEN?.trim();
  if (!token) throw new HttpError(503, 'Vercel Blob storage is not configured.');

  try {
    await del(url, { token });
    return true;
  } catch {
    throw new HttpError(502, 'Unable to delete file from Vercel Blob.');
  }
}
