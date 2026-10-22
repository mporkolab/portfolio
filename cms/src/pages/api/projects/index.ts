import type { APIRoute } from 'astro';
import { apiError, json, readJson } from '../../../lib/api';
import { savePayloadSchema, saveProject } from '../../../lib/projects';

/** Új projekt – a szerkesztő első mentése. Piszkozatként jön létre. */
export const POST: APIRoute = async ({ request }) => {
  const parsed = savePayloadSchema.safeParse(await readJson(request));
  if (!parsed.success) return apiError('Érvénytelen adatok.', 400);

  const result = saveProject(null, parsed.data);
  if (!result.ok) return apiError(result.error, result.status, { field: result.field });
  return json({ project: result.project }, 201);
};
