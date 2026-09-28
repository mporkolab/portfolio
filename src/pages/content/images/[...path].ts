import type { APIRoute } from 'astro';
import { API_URL } from '../../../lib/cms';

/**
 * The project images, passed through from Ghost, so a visitor's browser never
 * talks to the CMS and the CMS can stay reachable over the VPN only.
 *
 * Ghost never overwrites an upload (a replaced image gets a new name), so what
 * is served here can be cached for good.
 */
export const GET: APIRoute = async ({ params }) => {
  const { path } = params;
  // Only plain image paths: nothing that could walk out of /content/images.
  if (!path || path.includes('..') || !/^[\w./-]+$/.test(path)) {
    return new Response('Not found', { status: 404 });
  }

  let res: Response;
  try {
    res = await fetch(`${API_URL}/content/images/${path}`, { signal: AbortSignal.timeout(15_000) });
  } catch (err) {
    console.error(`[cms] could not fetch image ${path}:`, err);
    return new Response('Image unavailable', { status: 502 });
  }
  if (!res.ok) return new Response('Not found', { status: res.status === 404 ? 404 : 502 });

  // Streamed through rather than buffered, so concurrent requests do not each
  // hold a whole image in memory.
  return new Response(res.body, {
    headers: {
      'Content-Type': res.headers.get('Content-Type') ?? 'application/octet-stream',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
};
