/**
 * A feltöltött képek kiszolgálása a szerkesztőnek. (A látogatóknak a portfólió
 * szervere adja ugyanezeket a fájlokat, a saját /uploads útvonalán.) A fájlnév
 * egyedi és sosem változik, ezért egy évig gyorsítótárazható (`immutable`).
 */
import type { APIRoute } from 'astro';
import fs from 'node:fs';
import { Readable } from 'node:stream';
import { resolveUploadPath } from '../../lib/images';

const TYPES: Record<string, string> = { webp: 'image/webp', jpg: 'image/jpeg', png: 'image/png' };

export const GET: APIRoute = async ({ params }) => {
  const relative = params.path ?? '';
  const file = resolveUploadPath(relative);
  if (!file) return new Response('Nem található', { status: 404 });

  let stat: fs.Stats;
  try {
    stat = await fs.promises.stat(file);
  } catch {
    return new Response('Nem található', { status: 404 });
  }

  return new Response(Readable.toWeb(fs.createReadStream(file)) as ReadableStream, {
    headers: {
      'Content-Type': TYPES[relative.split('.').pop()!],
      'Content-Length': String(stat.size),
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
};
