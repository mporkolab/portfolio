// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';
import cmsAssets from './src/lib/cms-assets.ts';

// A site egy reverse proxy al-útvonalán is állhat (pl. /portfolio), ilyenkor
// minden hivatkozásának a prefixszel kell indulnia. Build-időben dől el.
const basePath = process.env.BASE_PATH?.replace(/^\/|\/$/g, '');

// https://astro.build/config
export default defineConfig({
  base: basePath ? `/${basePath}` : '/',
  // The plates are heavy; having the next page's HTML in hand before the click
  // is what lets the turn animation start on time.
  // A CMS képei a buildbe másolódnak, így a kész oldal nem kér semmit a CMS-től.
  integrations: [cmsAssets()],
  prefetch: {
    prefetchAll: true,
    defaultStrategy: 'viewport',
  },
  vite: {
    plugins: [tailwindcss()],
  },
});
