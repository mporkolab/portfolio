/**
 * The projects come from the CMS (cms/), not from this repo. Adding a project
 * is publishing it in the CMS, not a commit.
 *
 * The CMS writes an SQLite database and a folder of images; this server reads
 * the same two, read-only — the database file on each request, so a project
 * published there is on the site at once, with nothing to rebuild. In Docker
 * both containers mount the `cms-data` volume; in dev both default to
 * cms/data. The CMS itself is VPN-only and never talked to over the network:
 * a visitor's browser only ever sees this server.
 *
 * What the CMS calls what (cms/src/lib/db/schema.ts has the columns, and
 * cms/README.md the same for the editor):
 *
 *   title, role, blurb   → per language, as typed
 *   case study           → per language, HTML rendered and sanitised by the
 *                          CMS when it saved
 *   note                 → per language, plain text under the story
 *   cover image          → thumbnail; "the image is a logo" shows it whole
 *   live site            → a project with one is "live"
 *   stack                → comma-separated, shown as "A · B"
 *   featured (★), date   → the order: featured first, then the newest; the
 *                          first featured one is the home page's project
 *
 * A language whose title is empty is not written yet; the project then shows
 * the other one in both languages.
 */

import { DatabaseSync } from 'node:sqlite';
import { createHmac, timingSafeEqual } from 'node:crypto';
import path from 'node:path';
import { CMS_DATABASE, PREVIEW_SECRET } from 'astro:env/server';
import type { Lang } from '../i18n/ui';

/** The copy for one project in one language, as the templates want it. */
export interface ProjectCopy {
  title: string;
  role: string;
  blurb: string;
  /** The case study, as HTML. */
  story: string;
  /** A caveat printed under the story, e.g. "no accuracy figures yet" (HTML-escaped). */
  note: string | null;
}

/** A cover image as stored by the CMS: WebP widths up to `width`, plus one share image. */
export interface Thumbnail {
  /** Under /uploads/, without width and extension, e.g. `2026/10/<uuid>`. */
  path: string;
  /** The largest stored width. */
  width: number;
  /** The format of the link-preview copy. */
  share: 'jpg' | 'png';
}

export interface Project {
  slug: string;
  title: string;
  status: 'live' | 'dev';
  /** The cover image, or null while none is set. */
  thumbnail: Thumbnail | null;
  /**
   * The thumbnail is a logo rather than a screenshot: shown whole on the dark
   * housing instead of cropped to fill. A mark drawn to glow loses its shape
   * the other way round.
   */
  thumbnail_is_logo: boolean;
  live_url: string | null;
  stack: string | null;
  /** Starred in the CMS: the first such project is the one the home page boards. */
  featured: boolean;
  /** At least one of the two is there; the other language falls back to it. */
  copy: { en: ProjectCopy | null; hu: ProjectCopy | null };
}

export function copyFor(p: Project, lang: Lang): ProjectCopy {
  return (lang === 'hu' ? p.copy.hu ?? p.copy.en : p.copy.en ?? p.copy.hu)!;
}

const base = () => import.meta.env.BASE_URL.replace(/\/$/, '');

/**
 * The widths the CMS stores, each image up to its own size (it never
 * enlarges). The same list as WIDTHS in cms/src/lib/images.ts.
 */
const CMS_WIDTHS = [600, 1000, 2000];

/** The frame width asked for → the stored width that covers it. */
const FRAME_SIZES: Record<number, number> = { 352: 600, 640: 1000, 720: 1000, 1280: 2000 };

/**
 * A thumbnail, as WebP, at about the width the frame draws it. A path on the
 * site itself (src/pages/uploads), so the CMS need not be public.
 */
export function assetUrl(thumb: Thumbnail, width: 352 | 640 | 720 | 1280): string {
  const stored = [...CMS_WIDTHS.filter((w) => w < thumb.width), thumb.width];
  const w = stored.find((s) => s >= FRAME_SIZES[width]) ?? thumb.width;
  return `${base()}/uploads/${thumb.path}-${w}.webp`;
}

/** The thumbnail for a link preview: JPEG or PNG, since not every scraper reads WebP. */
export function shareImageUrl(thumb: Thumbnail): string {
  return `${base()}/uploads/${thumb.path}-share.${thumb.share}`;
}

/**
 * Images in the story carry the CMS's root-relative /uploads/ address, which
 * is right here too — unless the site sits under a sub-path, which they are
 * moved under, srcset entries included.
 */
const localImages = (html: string) => (base() ? html.replace(/(?<=["\s,])\/uploads\//g, `${base()}/uploads/`) : html);

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

/** The rows this site reads, as far as it reads them. */
interface ProjectRow {
  id: number;
  slug: string;
  live_url: string | null;
  stack: string;
  featured: number;
  cover_is_logo: number;
  image_path: string | null;
  image_width: number | null;
  image_share: 'jpg' | 'png' | null;
}

interface CopyRow {
  project_id: number;
  lang: Lang;
  title: string;
  role: string;
  blurb: string;
  content_html: string;
  note: string;
}

const PROJECT_COLUMNS = `
  p.id, p.slug, p.live_url, p.stack, p.featured, p.cover_is_logo,
  i.path AS image_path, i.width AS image_width, i.share_ext AS image_share
  FROM projects p LEFT JOIN images i ON i.id = p.cover_image_id`;

let db: DatabaseSync | null = null;

/**
 * The CMS's database, opened once and read-only. Every query is its own read
 * transaction, so what the CMS commits is seen by the next request.
 */
function query<T>(sql: string, ...params: (string | number)[]): T[] {
  const file = path.resolve(CMS_DATABASE);
  try {
    db ??= new DatabaseSync(file, { readOnly: true });
    return db.prepare(sql).all(...params) as T[];
  } catch (err) {
    // Opened again on the next request: the CMS may only now have created it.
    db?.close();
    db = null;
    const why = err instanceof Error ? err.message : String(err);
    throw new Error(
      `[cms] could not read the projects from ${file} (${why}).\n` +
        `      Set CMS_DATABASE, and check the CMS has started once (it creates the database).`,
    );
  }
}

function toProjects(rows: ProjectRow[]): Project[] {
  if (!rows.length) return [];
  const copies = query<CopyRow>(
    `SELECT project_id, lang, title, role, blurb, content_html, note FROM project_copies
     WHERE title <> '' AND project_id IN (${rows.map(() => '?').join(',')})`,
    ...rows.map((r) => r.id),
  );
  const copyOf = (c: CopyRow | undefined): ProjectCopy | null =>
    c
      ? {
          title: c.title,
          role: c.role,
          blurb: c.blurb,
          story: localImages(c.content_html),
          note: c.note ? escapeHtml(c.note) : null,
        }
      : null;

  const projects: Project[] = [];
  for (const r of rows) {
    const en = copyOf(copies.find((c) => c.project_id === r.id && c.lang === 'en'));
    const hu = copyOf(copies.find((c) => c.project_id === r.id && c.lang === 'hu'));
    // Nothing written in either language: nothing to show.
    if (!en && !hu) continue;
    projects.push({
      slug: r.slug,
      title: (en ?? hu)!.title,
      status: r.live_url ? 'live' : 'dev',
      thumbnail: r.image_path ? { path: r.image_path, width: r.image_width!, share: r.image_share! } : null,
      thumbnail_is_logo: !!r.cover_is_logo,
      live_url: r.live_url,
      stack:
        r.stack
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
          .join(' · ') || null,
      featured: !!r.featured,
      copy: { en, hu },
    });
  }
  return projects;
}

/**
 * The published projects, in the order the wall shows them. An empty list is
 * a legitimate answer — the CMS has nothing published — not a failure.
 */
export async function getProjects(): Promise<Project[]> {
  return toProjects(
    query<ProjectRow>(
      `SELECT ${PROJECT_COLUMNS} WHERE p.status = 'published'
       ORDER BY p.featured DESC, p.published_at DESC, p.id DESC`,
    ),
  );
}

/**
 * A project as the CMS has it now, published or not, for the editor's preview
 * link. The token is `<expiry ms>.<HMAC-SHA256(slug.expiry)>` with the secret
 * the CMS shares (cms/src/lib/preview.ts). Null for a bad or expired token,
 * and always when no secret is set.
 */
export async function getPreview(slug: string, token: string): Promise<Project | null> {
  if (!PREVIEW_SECRET) return null;
  const [exp, sig] = token.split('.');
  if (!exp || !sig || !/^\d+$/.test(exp) || Number(exp) < Date.now()) return null;
  const expected = createHmac('sha256', PREVIEW_SECRET).update(`${slug}.${exp}`).digest();
  const given = Buffer.from(sig, 'base64url');
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  return toProjects(query<ProjectRow>(`SELECT ${PROJECT_COLUMNS} WHERE p.slug = ?`, slug))[0] ?? null;
}
