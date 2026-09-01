// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';

// A site egy reverse proxy al-útvonalán is állhat (pl. /portfolio), ilyenkor
// minden hivatkozásának a prefixszel kell indulnia. Build-időben dől el.
const basePath = process.env.BASE_PATH?.replace(/^\/|\/$/g, '');

// https://astro.build/config
export default defineConfig({
  base: basePath ? `/${basePath}` : '/',
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
