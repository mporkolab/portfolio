/**
 * The projects come from Directus, not from this repo. Adding a project is a
 * save in the CMS admin, not a commit.
 *
 * The fetch happens at build time, so the shipped site is still plain static
 * files with no runtime dependency on the CMS being up. A CMS that is
 * unreachable *during* a build fails the build on purpose: a rebuild that
 * quietly published a site with no projects on it would be worse than one that
 * stops and leaves the previous release standing.
 */

import type { Lang } from '../i18n/ui';

const trim = (u: string) => u.replace(/\/$/, '');

/**
 * Where the build reads the API from. Only this process ever calls it, so it
 * may be an address that only makes sense inside the build — a container name,
 * or the host gateway.
 */
const API_URL = trim(import.meta.env.DIRECTUS_URL ?? 'http://localhost:8055');

/**
 * The base the thumbnail URLs in the shipped HTML are written against. That
 * one is fetched by the visitor's browser, so it has to be the CMS's public
 * address, which is not always the address the build used. Where they are the
 * same — a plain `npm run build` against a local CMS — saying it twice is not
 * required.
 */
const PUBLIC_URL = trim(
  import.meta.env.PUBLIC_DIRECTUS_URL || import.meta.env.DIRECTUS_URL || 'http://localhost:8055',
);

/** How a project is stored in the `projects` collection. */
export interface CmsProject {
  id: string;
  slug: string;
  title: string;
  status: 'live' | 'dev';
  /** Directus file id of the thumbnail, or null while none is uploaded. */
  thumbnail: string | null;
  /**
   * The thumbnail is a logo rather than a screenshot: shown whole on the dark
   * housing instead of cropped to fill. A mark drawn to glow loses its shape
   * the other way round.
   */
  thumbnail_is_logo: boolean;
  live_url: string | null;
  sort: number;
  published: boolean;
  /** Per-language copy. Stack is written once; it is not prose. */
  stack: string | null;
  role_en: string;
  role_hu: string;
  blurb_en: string;
  blurb_hu: string;
  /** Paragraphs, split on newlines where it is rendered. */
  story_en: string;
  story_hu: string;
  /** A caveat printed under the story, e.g. "no accuracy figures yet". */
  note_en: string | null;
  note_hu: string | null;
}

/** The copy for one project in one language, as the templates want it. */
export interface ProjectCopy {
  title: string;
  role: string;
  blurb: string;
  story: string[];
  note: string | null;
}

export function copyFor(p: CmsProject, lang: Lang): ProjectCopy {
  const pick = (en: string, hu: string) => (lang === 'hu' ? hu || en : en);
  const story = pick(p.story_en, p.story_hu);
  const note = lang === 'hu' ? p.note_hu || p.note_en : p.note_en;
  return {
    title: p.title,
    role: pick(p.role_en, p.role_hu),
    blurb: pick(p.blurb_en, p.blurb_hu),
    story: story ? story.split('\n').filter(Boolean) : [],
    note: note || null,
  };
}

/** A CMS-hosted image, at the width the frame actually draws it. */
export function assetUrl(fileId: string, width?: number): string {
  const q = width ? `?width=${width}&format=webp&quality=80` : '';
  return `${PUBLIC_URL}/assets/${fileId}${q}`;
}

const FIELDS = [
  'id',
  'slug',
  'title',
  'status',
  'thumbnail',
  'thumbnail_is_logo',
  'live_url',
  'sort',
  'published',
  'stack',
  'role_en',
  'role_hu',
  'blurb_en',
  'blurb_hu',
  'story_en',
  'story_hu',
  'note_en',
  'note_hu',
].join(',');

let cache: Promise<CmsProject[]> | null = null;

async function load(): Promise<CmsProject[]> {
  const url =
    `${API_URL}/items/projects` +
    `?fields=${FIELDS}&filter[published][_eq]=true&sort=sort&limit=-1`;
  let data: CmsProject[];
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
    ({ data } = (await res.json()) as { data: CmsProject[] });
    if (!Array.isArray(data)) throw new Error('unexpected payload shape');
  } catch (err) {
    const why = err instanceof Error ? err.message : String(err);
    throw new Error(
      `[cms] could not read the projects from ${API_URL} (${why}).\n` +
        `      Set DIRECTUS_URL, and check the CMS is up and that the Public ` +
        `role still has read access to the \`projects\` collection.`,
    );
  }
  // An empty list is a legitimate answer — the CMS answered, nothing is
  // published — so it is not treated as a failure.
  console.info(`[cms] ${data.length} project(s) from ${API_URL}; assets served from ${PUBLIC_URL}`);
  return data;
}

export function getProjects(): Promise<CmsProject[]> {
  // One fetch per build, however many pages ask for the list.
  cache ??= load();
  return cache;
}
