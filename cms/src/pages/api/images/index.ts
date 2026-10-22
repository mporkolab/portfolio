import type { APIRoute } from 'astro';
import { apiError, json } from '../../../lib/api';
import { ImageError, MAX_UPLOAD_BYTES, storeImage } from '../../../lib/images';

/** Képfeltöltés (multipart: `file`). */
export const POST: APIRoute = async ({ request }) => {
  // A multipart keret miatt kicsit több lehet a fájlméretnél.
  const length = Number(request.headers.get('content-length') ?? 0);
  if (length > MAX_UPLOAD_BYTES + 64 * 1024) return apiError('A kép legfeljebb 10 MB lehet.', 413);

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return apiError('Érvénytelen feltöltés.', 400);
  }
  const file = form.get('file');
  if (!(file instanceof File) || file.size === 0) return apiError('Nincs kiválasztott kép.', 400);
  if (file.size > MAX_UPLOAD_BYTES) return apiError('A kép legfeljebb 10 MB lehet.', 413);

  try {
    const image = await storeImage(new Uint8Array(await file.arrayBuffer()), { originalName: file.name });
    return json({ image }, 201);
  } catch (e) {
    if (e instanceof ImageError) return apiError(e.message, 400);
    console.error('[cms] Képfeltöltés sikertelen:', e);
    return apiError('A képet nem sikerült feltölteni.', 500);
  }
};
