/**
 * Előnézet a valódi portfólión. A piszkozat ott sem látszik senkinek: a link
 * egy aláírt, egy óráig érvényes tokent visz (`?preview=<lejárat>.<aláírás>`),
 * amit a portfólió szervere ugyanazzal a `PREVIEW_SECRET`-tel ellenőriz
 * (src/lib/cms.ts). A két oldalon a formátumnak egyeznie kell.
 *
 * `PORTFOLIO_URL` vagy `PREVIEW_SECRET` nélkül nincs előnézet.
 */
import { createHmac } from 'node:crypto';
import { env } from './env';
import { publicPathPrefix, type Lang } from './editor/shared';

const TTL_MS = 60 * 60 * 1000;

export const previewEnabled = () => !!(env('PORTFOLIO_URL') && env('PREVIEW_SECRET'));

export function previewUrl(slug: string, lang: Lang): string | null {
  const base = env('PORTFOLIO_URL')?.replace(/\/$/, '');
  const secret = env('PREVIEW_SECRET');
  if (!base || !secret) return null;
  const exp = Date.now() + TTL_MS;
  const sig = createHmac('sha256', secret).update(`${slug}.${exp}`).digest('base64url');
  return `${base}${publicPathPrefix(lang)}${slug}?preview=${exp}.${sig}`;
}
