import type { APIRoute } from 'astro';
import { absolute } from '../lib/seo';

export const prerender = true;

/**
 * Every crawler is welcome, the answer engines' too (GPTBot, ClaudeBot,
 * PerplexityBot, Google-Extended…): the site exists to be found. Only the
 * development aid is kept out.
 */
export const GET: APIRoute = () => {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  return new Response(
    [
      'User-agent: *',
      'Allow: /',
      `Disallow: ${base}/dev/`,
      '',
      `Sitemap: ${absolute(`${base}/sitemap.xml`)}`,
      '',
    ].join('\n'),
    { headers: { 'Content-Type': 'text/plain; charset=utf-8' } },
  );
};
