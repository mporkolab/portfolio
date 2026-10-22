import type { APIRoute } from 'astro';
import { apiError, idParam, json } from '../../../../lib/api';
import { previewUrl } from '../../../../lib/preview';
import { getEditorProject } from '../../../../lib/projects';
import type { Lang } from '../../../../lib/editor/shared';

/** Friss, aláírt előnézeti link a portfólióra (lásd src/lib/preview.ts). */
export const GET: APIRoute = ({ params, url }) => {
  const id = idParam(params.id);
  const project = id ? getEditorProject(id) : null;
  if (!project) return apiError('A projekt nem található.', 404);
  const lang: Lang = url.searchParams.get('lang') === 'hu' ? 'hu' : 'en';
  const link = previewUrl(project.slug, lang);
  if (!link) return apiError('Az előnézet nincs beállítva: add meg a PORTFOLIO_URL-t és a PREVIEW_SECRET-et (cms/.env).', 501);
  return json({ url: link });
};
