import type { APIRoute } from 'astro';
import fs from 'node:fs';
import path from 'node:path';
import { Readable } from 'node:stream';
import { CMS_UPLOADS } from 'astro:env/server';

/**
 * The images uploaded in the CMS, served from the folder it writes them to
 * (the shared `cms-data` volume), so a visitor's browser never talks to the
 * CMS and the CMS can stay reachable over the VPN only.
 *
 * The CMS never overwrites an upload (a replaced image gets a new name), so
 * what is served here can be cached for good.
 */

// Exactly the names the CMS writes (cms/src/lib/images.ts): nothing that could
// walk out of the folder.
const UPLOAD = /^\d{4}\/\d{2}\/[0-9a-f-]{36}-(?:\d{2,4}\.webp|share\.(?:jpg|png))$/;
const TYPES: Record<string, string> = { webp: 'image/webp', jpg: 'image/jpeg', png: 'image/png' };

export const GET: APIRoute = async ({ params }) => {
  const relative = params.path ?? '';
  if (!UPLOAD.test(relative)) return new Response('Not found', { status: 404 });

  const file = path.join(path.resolve(CMS_UPLOADS), relative);
  let stat: fs.Stats;
  try {
    stat = await fs.promises.stat(file);
  } catch {
    return new Response('Not found', { status: 404 });
  }

  // Streamed rather than buffered, so concurrent requests do not each hold a
  // whole image in memory.
  return new Response(Readable.toWeb(fs.createReadStream(file)) as ReadableStream, {
    headers: {
      'Content-Type': TYPES[relative.split('.').pop()!],
      'Content-Length': String(stat.size),
      'Cache-Control': 'public, max-age=31536000, immutable',
      'X-Content-Type-Options': 'nosniff',
    },
  });
};
