import 'server-only';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import { HttpError } from '@/lib/http';

const allowed = {
  image: ['image/jpeg','image/png','image/webp','image/avif'],
  video: ['video/mp4','video/webm','video/quicktime'],
  resource: ['application/pdf','image/jpeg','image/png','image/webp','application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
} as const;

export async function saveMedia(file: File, kind: keyof typeof allowed) {
  if (!(allowed[kind] as readonly string[]).includes(file.type)) throw new HttpError(415, 'This file type is not supported.');
  const max = kind === 'video' ? 250 * 1024 * 1024 : 12 * 1024 * 1024;
  if (file.size <= 0 || file.size > max) throw new HttpError(413, kind === 'video' ? 'Video is too large for the development uploader.' : 'File is too large.');

  const provider = process.env.MEDIA_PROVIDER?.trim();
  if (provider && provider !== 'local-dev') throw new HttpError(503, 'Configured media provider adapter is not implemented yet.');

  if (process.env.NODE_ENV === 'production') {
    throw new HttpError(503, 'Production media storage is not configured. Connect a private cloud storage/video provider before launch.');
  }

  const ext = path.extname(file.name).replace(/[^.a-zA-Z0-9]/g, '').slice(0, 8) || (kind === 'image' ? '.jpg' : kind === 'video' ? '.mp4' : '.bin');
  const name = randomBytes(18).toString('hex') + ext.toLowerCase();
  const dir = path.join(process.cwd(), 'public', 'uploads', kind);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, name), Buffer.from(await file.arrayBuffer()));
  return { url: '/uploads/' + kind + '/' + name, assetId: 'local-dev:' + kind + ':' + name, provider: 'local-dev' };
}
