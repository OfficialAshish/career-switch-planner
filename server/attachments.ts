import { promises as fs } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { atomicWrite } from './store.js';
import { id } from '../shared/schema.js';
export function imageExtension(buffer: Buffer) {
  if (buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return 'png';
  if (buffer[0] === 255 && buffer[1] === 216 && buffer[2] === 255) return 'jpg';
  if (buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP')
    return 'webp';
  throw new Error('Only PNG, JPEG and WebP raster images are allowed.');
}
export async function saveImage(root: string, buffer: Buffer, requestedId?: string) {
  if (!buffer.length || buffer.length > 5 * 1024 * 1024)
    throw new Error('Image must be between 1 byte and 5 MB.');
  const ext = imageExtension(buffer),
    key = id.parse(requestedId || randomUUID());
  await atomicWrite(path.join(root, 'images', `${key}.${ext}`), buffer);
  return key;
}
export async function findImage(root: string, key: string) {
  id.parse(key);
  for (const ext of ['png', 'jpg', 'webp']) {
    const f = path.join(root, 'images', `${key}.${ext}`);
    try {
      await fs.access(f);
      return f;
    } catch {}
  }
  throw new Error('Image not found.');
}
