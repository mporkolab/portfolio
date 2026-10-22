// @ts-check
import { defineConfig } from 'astro/config';
import node from '@astrojs/node';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';

// A portfólió CMS-e: csak a szerkesztőfelület, publikus oldal nincs. VPN-ről
// (Tailscale) érhető el, belépés nélkül – lásd src/middleware.ts és README.md.
export default defineConfig({
  output: 'server',
  adapter: node({ mode: 'standalone' }),
  integrations: [react()],
  server: { port: 2368 },
  vite: {
    plugins: [tailwindcss()],
    ssr: {
      // Natív modul: nem bundle-ölhető, futásidőben a node_modules-ból töltődik be.
      external: ['better-sqlite3'],
    },
  },
});
