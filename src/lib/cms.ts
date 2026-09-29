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
 * Every project is written twice: a post tagged #en and one tagged #hu, both
 * internal tags. The two are paired by slug with any `-en`/`-hu` suffix taken
 * off (edortech-en + edortech-hu, or edortech + edortech-hu), and that is the
 * project's address. Each supplies its own text (title, role, excerpt,
 * content); the rest — image, stack, link, #logo, ★ — comes from the #en post,
 * or from the #hu one where the #en post leaves it out. A project with only
 * one of the two shows that one in both languages. A post with neither tag is
 * not a project, and is left off the site.
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
  /** At least one of the two is there; the other language falls back to it. */
  copy: { en: ProjectCopy | null; hu: ProjectCopy | null };
}

export function copyFor(p: Project, lang: Lang): ProjectCopy {
  return (lang === 'hu' ? p.copy.hu ?? p.copy.en : p.copy.en ?? p.copy.hu)!;
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
    role: shownTags(post)[0] ?? '',
    blurb: post.custom_excerpt ?? '',
    story: html.replace(CALLOUT, '').trim(),
    note: notes.length ? notes.join(' ') : null,
  };
}

const hasTag = (post: GhostPost, slug: string) => post.tags.some((t) => t.slug === slug);

/**
 * The language tag, taken as `#en`/`#hu` or as plain `en`/`hu` — the `#` is
 * easy to leave off in the editor, and either way it is never role or stack.
 */
const LANG_TAG_SLUGS = new Set(['en', 'hu', 'hash-en', 'hash-hu']);
const langOf = (post: GhostPost): Lang | null =>
  hasTag(post, 'hash-en') || hasTag(post, 'en') ? 'en' : hasTag(post, 'hash-hu') || hasTag(post, 'hu') ? 'hu' : null;

/** The public tags that mean something on the site: role first, then stack. */
const shownTags = (post: GhostPost) =>
  post.tags.filter((t) => t.visibility === 'public' && !LANG_TAG_SLUGS.has(t.slug)).map((t) => t.name);

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

  // Paired in the order the API gives, so the ★ and the publish date still
  // decide where a project stands.
  const pairs = new Map<string, { en?: GhostPost; hu?: GhostPost }>();
  const tagged: [GhostPost, Lang][] = [];
  for (const post of posts) {
    const lang = langOf(post);
    if (lang) tagged.push([post, lang]);
    else console.warn(`[cms] "${post.slug}" has neither #en nor #hu, so it is not on the site`);
  }
  const base = (post: GhostPost) => post.slug.replace(/-(en|hu)$/, '');
  const slugs = new Set(tagged.map(([post]) => base(post)));
  for (const [post, lang] of tagged) {
    let slug = base(post);
    // Two posts with one title get `edortech` and `edortech-2` from Ghost; the
    // second still belongs with the first when its language is the missing one.
    const numbered = slug.replace(/-\d+$/, '');
    if (numbered !== slug && slugs.has(numbered) && !pairs.get(numbered)?.[lang]) slug = numbered;
    const pair = pairs.get(slug) ?? {};
    if (pair[lang]) console.warn(`[cms] two #${lang} posts for "${slug}"; "${post.slug}" is ignored`);
    else pair[lang] = post;
    pairs.set(slug, pair);
  }

  const projects: Project[] = [];
  for (const [slug, { en, hu }] of pairs) {
    const main = (en ?? hu)!;
    const image = en?.feature_image ?? hu?.feature_image ?? null;
    const url = en?.canonical_url ?? hu?.canonical_url ?? null;
    projects.push({
      slug,
      title: main.title,
      status: url ? 'live' : 'dev',
      thumbnail: image ? imagePath(image) : null,
      thumbnail_is_logo: [en, hu].some((p) => p && hasTag(p, 'hash-logo')),
      live_url: url,
      stack: shownTags(main).slice(1).join(' · ') || null,
      copy: { en: en ? copyOf(en) : null, hu: hu ? copyOf(hu) : null },
    });
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
