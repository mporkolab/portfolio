/**
 * The projects come from Ghost, not from this repo. Adding a project is
 * publishing a post in the Ghost admin, not a commit.
 *
 * The pages that show projects are rendered on request, so a post published
 * in Ghost is on the site at once — nothing to rebuild. The list is kept for a
 * few seconds, so a burst of visitors is one API call; and if Ghost stops
 * answering, the last list it gave keeps being served rather than an error.
 *
 * How a post maps onto a project (cms/README.md has the same, for the editor):
 *
 *   title           → title
 *   feature image   → thumbnail; the internal tag #logo shows it whole
 *   excerpt         → blurb
 *   content         → the case study; a callout card in it is the note
 *   first tag       → role, e.g. "Client project"
 *   further tags    → stack
 *   canonical URL   → the live site; a project with one is "live"
 *   featured (★)    → first on the wall, and the one the home page shows
 *
 * A post tagged #hu is the Hungarian copy of the post whose slug it carries
 * without the `-hu` suffix. It supplies text only (title, role, excerpt,
 * content); everything else comes from the English post.
 */

import { GHOST_URL, GHOST_CONTENT_KEY as KEY } from 'astro:env/server';
import type { Lang } from '../i18n/ui';

/**
 * Where this server reads the API from. Only the server ever calls it — the
 * images go through /content/images on the site itself — so it may be an
 * address that only makes sense here, like the compose service name.
 */
export const API_URL = GHOST_URL.replace(/\/$/, '');

/** The copy for one project in one language, as the templates want it. */
export interface ProjectCopy {
  title: string;
  role: string;
  blurb: string;
  /** The case study, as the HTML Ghost renders it, without the note. */
  story: string;
  /** A caveat printed under the story, e.g. "no accuracy figures yet". */
  note: string | null;
}

export interface Project {
  slug: string;
  title: string;
  status: 'live' | 'dev';
  /** The feature image's path under /content/images/, or null while none is set. */
  thumbnail: string | null;
  /**
   * The thumbnail is a logo rather than a screenshot: shown whole on the dark
   * housing instead of cropped to fill. A mark drawn to glow loses its shape
   * the other way round.
   */
  thumbnail_is_logo: boolean;
  live_url: string | null;
  stack: string | null;
  copy: { en: ProjectCopy; hu: ProjectCopy | null };
}

export function copyFor(p: Project, lang: Lang): ProjectCopy {
  return (lang === 'hu' && p.copy.hu) || p.copy.en;
}

/**
 * The frame width asked for → the nearest size Ghost makes itself. Ghost only
 * resizes to the sizes its active theme declares (600/1000/2000 for the
 * default theme), and keeps each resized copy on disk.
 */
const GHOST_SIZES: Record<number, number> = { 352: 600, 640: 1000, 720: 1000, 1280: 2000 };

/**
 * A thumbnail, as WebP, at about the width the frame draws it. It is a path on
 * the site itself, proxied to Ghost (src/pages/content/images), so a visitor's
 * browser never talks to the CMS and the CMS need not be public.
 */
export function assetUrl(thumbnail: string, width: 352 | 640 | 720 | 1280): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  return `${base}/content/images/size/w${GHOST_SIZES[width]}/format/webp/${thumbnail}`;
}

/** Ghost writes absolute URLs with its public address; only the path matters. */
const imagePath = (src: string) => new URL(src).pathname.replace(/^.*?\/content\/images\//, '');

/**
 * Images put in the post body carry the same address, which a visitor cannot
 * reach (the CMS is VPN-only) — so they are pointed at the site's own
 * /content/images proxy too, srcset sizes included.
 */
const GHOST_IMAGE = /\bhttps?:\/\/[^\s"',)]+?\/content\/images\//g;
const localImages = (html: string) =>
  html.replace(GHOST_IMAGE, `${import.meta.env.BASE_URL.replace(/\/$/, '')}/content/images/`);

/** What the Content API returns for a post, as far as this site reads it. */
interface GhostPost {
  slug: string;
  title: string;
  html: string | null;
  custom_excerpt: string | null;
  feature_image: string | null;
  canonical_url: string | null;
  tags: { name: string; slug: string; visibility: 'public' | 'internal' }[];
}

const CALLOUT =
  /<div class="kg-card kg-callout-card[^"]*">(?:<div class="kg-callout-emoji">[\s\S]*?<\/div>)?<div class="kg-callout-text">([\s\S]*?)<\/div><\/div>/g;

function copyOf(post: GhostPost): ProjectCopy {
  const html = localImages(post.html ?? '');
  const notes = [...html.matchAll(CALLOUT)].map((m) => m[1]);
  return {
    title: post.title,
    role: post.tags.find((t) => t.visibility === 'public')?.name ?? '',
    blurb: post.custom_excerpt ?? '',
    story: html.replace(CALLOUT, '').trim(),
    note: notes.length ? notes.join(' ') : null,
  };
}

const hasTag = (post: GhostPost, slug: string) => post.tags.some((t) => t.slug === slug);

async function load(): Promise<Project[]> {
  let posts: GhostPost[];
  try {
    if (!KEY) throw new Error('GHOST_CONTENT_KEY is not set');
    const url =
      `${API_URL}/ghost/api/content/posts/?key=${KEY}&limit=all&include=tags` +
      `&fields=slug,title,html,custom_excerpt,feature_image,canonical_url` +
      `&order=${encodeURIComponent('featured desc,published_at desc')}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
    ({ posts } = (await res.json()) as { posts: GhostPost[] });
    if (!Array.isArray(posts)) throw new Error('unexpected payload shape');
  } catch (err) {
    const why = err instanceof Error ? err.message : String(err);
    throw new Error(
      `[cms] could not read the projects from ${API_URL} (${why}).\n` +
        `      Set GHOST_URL and GHOST_CONTENT_KEY (Ghost admin → Settings → ` +
        `Integrations), and check the CMS is up.`,
    );
  }

  const hu = new Map(
    posts.filter((p) => hasTag(p, 'hash-hu')).map((p) => [p.slug.replace(/-hu$/, ''), p]),
  );
  const projects: Project[] = [];
  for (const post of posts.filter((p) => !hasTag(p, 'hash-hu'))) {
    const publicTags = post.tags.filter((t) => t.visibility === 'public').map((t) => t.name);
    projects.push({
      slug: post.slug,
      title: post.title,
      status: post.canonical_url ? 'live' : 'dev',
      thumbnail: post.feature_image ? imagePath(post.feature_image) : null,
      thumbnail_is_logo: hasTag(post, 'hash-logo'),
      live_url: post.canonical_url,
      stack: publicTags.slice(1).join(' · ') || null,
      copy: { en: copyOf(post), hu: hu.has(post.slug) ? copyOf(hu.get(post.slug)!) : null },
    });
    hu.delete(post.slug);
  }
  for (const slug of hu.keys()) {
    console.warn(`[cms] ${slug}-hu is tagged #hu but there is no post "${slug}" for it to translate`);
  }

  // An empty list is a legitimate answer — the CMS answered, nothing is
  // published — so it is not treated as a failure.
  return projects;
}

/** How long a list is reused before Ghost is asked again. */
const FRESH_MS = 5_000;

let last: { at: number; projects: Project[] } | null = null;
let inflight: Promise<Project[]> | null = null;

export async function getProjects(): Promise<Project[]> {
  if (last && Date.now() - last.at < FRESH_MS) return last.projects;
  // Pages rendered at the same moment share one request.
  inflight ??= load().finally(() => (inflight = null));
  try {
    const projects = await inflight;
    last = { at: Date.now(), projects };
    return projects;
  } catch (err) {
    // Better the list from a minute ago than an error page.
    if (last) {
      console.warn(String(err));
      return last.projects;
    }
    throw err;
  }
}
