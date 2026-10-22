import type { APIRoute } from 'astro';
import { apiError, idParam, json } from '../../../../lib/api';
import { setPublished } from '../../../../lib/projects';

/** Közzététel: ellenőrzés után kikerül a portfólióra. */
export const POST: APIRoute = ({ params }) => {
  const id = idParam(params.id);
  if (!id) return apiError('A projekt nem található.', 404);
  const result = setPublished(id, true);
  if (!result.ok) return apiError(result.error, result.status);
  return json({ project: result.project });
};
