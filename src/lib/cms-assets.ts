/**
 * Copies the CMS images the site uses into the build, so the shipped site asks
 * the CMS for nothing and the CMS can stay reachable over the VPN only.
 *
 * `assetUrl` (cms.ts) writes each image as a path under the site's own
 * `cms-assets/`, with the file id and width in the name. Once the pages are
 * written, this finds those paths in the output and fetches each one from the
 * CMS with the same transform. Reading them back out of the output rather than
 * keeping a list during rendering means every image a page actually ships is
 * fetched, and nothing else.
 *
 * A file that cannot be fetched fails the build, for the same reason an
 * unreachable CMS does: a release with holes where the images were would be
 * worse than keeping the previous one.
 */

import type { AstroIntegration } from 'astro';
import { loadEnv } from 'vite';
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

/** The folder under the site root the images are copied into. */
export const ASSET_DIR = 'cms-assets';

/** The transform both the file name and the fetch describe. */
const transform = (width?: number) =>
  `format=webp&quality=80${width ? `&width=${width}` : ''}`;

export function assetFileName(fileId: string, width?: number): string {
  return `${fileId}${width ? `-w${width}` : ''}.webp`;
}

/** The CMS URL of the same image, for the dev server and for the copy. */
export function remoteAssetUrl(apiUrl: string, fileId: string, width?: number): string {
  return `${apiUrl.replace(/\/$/, '')}/assets/${fileId}?${transform(width)}`;
}

const REFERENCE = new RegExp(
  `${ASSET_DIR}/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})(?:-w(\\d+))?\\.webp`,
  'g',
);

async function* textFiles(dir: string): AsyncGenerator<string> {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) yield* textFiles(p);
    else if (/\.(html|js|css|json)$/.test(entry.name)) yield p;
  }
}

export default function cmsAssets(): AstroIntegration {
  return {
    name: 'cms-assets',
    hooks: {
      'astro:build:done': async ({ dir, logger }) => {
        const env = loadEnv('production', process.cwd(), '');
        const apiUrl = env.DIRECTUS_URL || 'http://localhost:8055';
        const out = fileURLToPath(dir);

        const wanted = new Map<string, { id: string; width?: number }>();
        for await (const file of textFiles(out)) {
          for (const [, id, w] of (await readFile(file, 'utf8')).matchAll(REFERENCE)) {
            const width = w ? Number(w) : undefined;
            wanted.set(assetFileName(id, width), { id, width });
          }
        }
        if (wanted.size === 0) return;

        const target = join(out, ASSET_DIR);
        await mkdir(target, { recursive: true });
        await Promise.all(
          [...wanted].map(async ([name, { id, width }]) => {
            const url = remoteAssetUrl(apiUrl, id, width);
            const res = await fetch(url, { signal: AbortSignal.timeout(30_000) }).catch((err) => {
              throw new Error(`[cms-assets] could not fetch ${url} (${err.message})`);
            });
            if (!res.ok) throw new Error(`[cms-assets] ${url} answered ${res.status}`);
            await writeFile(join(target, name), Buffer.from(await res.arrayBuffer()));
          }),
        );
        logger.info(`${wanted.size} image(s) copied from ${apiUrl} into /${ASSET_DIR}`);
      },
    },
  };
}
