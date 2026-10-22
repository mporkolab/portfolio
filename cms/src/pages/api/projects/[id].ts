import type { APIRoute } from 'astro';
import { apiError, idParam, json, readJson } from '../../../lib/api';
import { deleteProject, getEditorProject, savePayloadSchema, saveProject } from '../../../lib/projects';

export const GET: APIRoute = ({ params }) => {
  const id = idParam(params.id);
  const project = id ? getEditorProject(id) : null;
  return project ? json({ project }) : apiError('A projekt nem található.', 404);
};

/** Mentés (kézi vagy automatikus). Az állapotot (piszkozat / publikált) nem változtatja. */
export const PUT: APIRoute = async ({ params, request }) => {
  const id = idParam(params.id);
  if (!id) return apiError('A projekt nem található.', 404);

  const parsed = savePayloadSchema.safeParse(await readJson(request));
  if (!parsed.success) return apiError('Érvénytelen adatok.', 400);

  const result = saveProject(id, parsed.data);
  if (!result.ok) return apiError(result.error, result.status, { field: result.field });
  return json({ project: result.project });
};

export const DELETE: APIRoute = ({ params }) => {
  const id = idParam(params.id);
  if (!id || !deleteProject(id)) return apiError('A projekt nem található.', 404);
  return json({ ok: true });
};
