import { defineMiddleware } from 'astro:middleware';

/**
 * Astro answers every page that throws with status 500, whatever the error
 * page sets. When `500.astro` has judged the failure a passing CMS outage (it
 * adds Retry-After), the answer becomes 503: "come back later", which a search
 * engine does not hold against the page.
 */
export const onRequest = defineMiddleware(async (_context, next) => {
  const response = await next();
  if (response.status === 500 && response.headers.has('Retry-After')) {
    return new Response(response.body, { status: 503, headers: response.headers });
  }
  return response;
});
