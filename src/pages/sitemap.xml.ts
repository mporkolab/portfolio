import type { APIRoute } from 'astro';
import { getProjects } from '../lib/projects';
import { languages, path } from '../i18n/ui';
import { absolute } from '../lib/seo';

/**
 * Rendered on request, like the wall: a project published in the CMS is in the
 * sitemap at once. Every page is listed with its pair in the other language,
 * which is how a search engine learns the two belong together.
 */
export const GET: APIRoute = async () => {
  const pages = ['/', '/about', '/projects', '/contact'];

  // The fixed pages are worth listing even while the CMS is down.
  try {
    for (const p of await getProjects()) pages.push(`/projects/${p.slug}`);
  } catch (err) {
    console.warn(String(err));
  }

  const entry = (page: string) => {
    const alts = languages
      .map((l) => `<xhtml:link rel="alternate" hreflang="${l}" href="${absolute(path(l, page))}"/>`)
      .concat(`<xhtml:link rel="alternate" hreflang="x-default" href="${absolute(path('en', page))}"/>`)
      .join('');
    return languages.map((l) => `<url><loc>${absolute(path(l, page))}</loc>${alts}</url>`).join('\n');
  };

  const xml =
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n' +
    pages.map(entry).join('\n') +
    '\n</urlset>\n';

  return new Response(xml, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=300' },
  });
};
