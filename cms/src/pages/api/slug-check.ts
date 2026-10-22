import type { APIRoute } from 'astro';
import { idParam, json } from '../../lib/api';
import { isSlugAvailable } from '../../lib/projects';

/** Kézzel írt slug foglaltsága, gépelés közben. */
export const GET: APIRoute = ({ url }) => {
  const slug = (url.searchParams.get('slug') ?? '').trim().toLowerCase();
  return json({ available: isSlugAvailable(slug, idParam(url.searchParams.get('id') ?? undefined)) });
};
