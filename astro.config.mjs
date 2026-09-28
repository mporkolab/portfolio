// @ts-check
import { defineConfig, envField } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';
import node from '@astrojs/node';

// A site egy reverse proxy al-útvonalán is állhat (pl. /portfolio), ilyenkor
// minden hivatkozásának a prefixszel kell indulnia. Build-időben dől el.
const basePath = process.env.BASE_PATH?.replace(/^\/|\/$/g, '');

// https://astro.build/config
export default defineConfig({
  base: basePath ? `/${basePath}` : '/',
  // The projects are read from Ghost on each request, so a post published there
  // is on the site at once — no rebuild. Pages that show no project are still
  // prerendered (`export const prerender = true`).
  output: 'server',
  adapter: node({ mode: 'standalone' }),
  env: {
    schema: {
      // Read at runtime, from the container's environment (or .env in dev).
      GHOST_URL: envField.string({ context: 'server', access: 'secret', default: 'http://localhost:2368' }),
      GHOST_CONTENT_KEY: envField.string({ context: 'server', access: 'secret', optional: true }),
    },
  },
  // The plates are heavy; having the next page's HTML in hand before the click
  // is what lets the turn animation start on time.
  prefetch: {
    prefetchAll: true,
    defaultStrategy: 'viewport',
  },
  vite: {
    plugins: [tailwindcss()],
  },
});
