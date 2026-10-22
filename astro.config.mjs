// @ts-check
import { defineConfig, envField, fontProviders } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';
import node from '@astrojs/node';

// A site egy reverse proxy al-útvonalán is állhat (pl. /portfolio), ilyenkor
// minden hivatkozásának a prefixszel kell indulnia. Build-időben dől el.
const basePath = process.env.BASE_PATH?.replace(/^\/|\/$/g, '');

// https://astro.build/config
export default defineConfig({
  // The public address, for what has to be absolute: canonical and hreflang
  // links, Open Graph, the sitemap. Behind the proxy the request's own host is
  // the container's, so it cannot be read off the request.
  site: process.env.SITE_URL || 'https://martinporkolab.hu',
  base: basePath ? `/${basePath}` : '/',
  // The projects are read from the CMS's database on each request, so a project
  // published there is on the site at once — no rebuild. Pages that show no
  // project are still prerendered (`export const prerender = true`).
  output: 'server',
  adapter: node({ mode: 'standalone' }),
  env: {
    schema: {
      // Read at runtime, from the container's environment (or .env in dev). The
      // defaults are where the CMS writes when it runs from cms/ in dev.
      CMS_DATABASE: envField.string({ context: 'server', access: 'secret', default: 'cms/data/cms.db' }),
      CMS_UPLOADS: envField.string({ context: 'server', access: 'secret', default: 'cms/data/uploads' }),
      // Shared with the CMS, which signs its preview links with it. Unset: no previews.
      PREVIEW_SECRET: envField.string({ context: 'server', access: 'secret', optional: true }),
    },
  },
  // The plates are heavy; having the next page's HTML in hand before the click
  // is what lets the turn animation start on time.
  prefetch: {
    prefetchAll: true,
    defaultStrategy: 'viewport',
  },
  // Inter is downloaded at build time and served from the site itself: no
  // request to Google from the visitor's browser (nothing for GDPR to object
  // to), and no render-blocking stylesheet from another origin. latin-ext
  // carries ő and ű.
  fonts: [
    {
      provider: fontProviders.fontsource(),
      name: 'Inter',
      cssVariable: '--font-inter',
      weights: [400, 600, 700, 900],
      styles: ['normal'],
      subsets: ['latin', 'latin-ext'],
      fallbacks: ['system-ui', 'sans-serif'],
    },
  ],
  vite: {
    plugins: [tailwindcss()],
  },
});
