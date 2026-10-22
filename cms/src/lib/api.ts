/** Közös JSON-válasz segédek az /api végpontokhoz. */
export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });

export const apiError = (error: string, status: number, extra: Record<string, unknown> = {}) =>
  json({ error, ...extra }, status);

/** JSON törzs beolvasása; hibás vagy túl nagy törzsnél `null`. */
export async function readJson(request: Request, maxBytes = 4 * 1024 * 1024): Promise<unknown | null> {
  const length = Number(request.headers.get('content-length') ?? 0);
  if (length > maxBytes) return null;
  try {
    const text = await request.text();
    if (text.length > maxBytes) return null;
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/** Pozitív egész útvonal-paraméter, vagy `null`. */
export function idParam(value: string | undefined): number | null {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
}
