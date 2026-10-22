/**
 * Projektek kezelése: lista, mentés, közzététel, törlés.
 *
 * Mentéskor a TipTap JSON-ból a szerver generál HTML-t, és DOMPurify-jal
 * tisztítja: a portfólió így mindig csak kész, biztonságos HTML-t kap, és
 * kérésenként nem kell újra tisztítania.
 */
import { generateHTML } from '@tiptap/html';
import type { JSONContent } from '@tiptap/core';
import DOMPurify from 'isomorphic-dompurify';
import { z } from 'astro/zod';
import { and, desc, eq, ne } from 'drizzle-orm';
import { getDb } from './db';
import { LANGS, projectCopies, projects } from './db/schema';
import { editorExtensions } from './editor/extensions';
import { getImage, isOwnUpload } from './images';
import {
  SLUG_MAX,
  SLUG_PATTERN,
  emptyCopy,
  slugSource,
  slugify,
  type EditorCopy,
  type EditorProject,
  type Lang,
  type Status,
} from './editor/shared';

// ---------------------------------------------------------------------------
// Tartalom
// ---------------------------------------------------------------------------

const MAX_CONTENT_BYTES = 2 * 1024 * 1024;

export class ContentError extends Error {}

/**
 * A dokumentumból kiszűri a nem saját feltöltésre mutató képeket (külső
 * hivatkozás, feltöltés közbeni helykitöltő): a portfólió csak a saját
 * tárhelyről tölthet képet – nincs hotlink, nincs követőpixel.
 */
export function stripForeignImages(node: JSONContent): JSONContent {
  if (!node.content) return node;
  return {
    ...node,
    content: node.content
      .filter((child) => child.type !== 'image' || isOwnUpload(child.attrs?.src))
      .map((child) => {
        if (child.type !== 'image') return stripForeignImages(child);
        const { uploadId: _drop, ...attrs } = child.attrs ?? {};
        return { ...child, attrs };
      }),
  };
}

function assertDoc(json: unknown): asserts json is JSONContent {
  if (!json || typeof json !== 'object' || (json as JSONContent).type !== 'doc') {
    throw new ContentError('Érvénytelen tartalom.');
  }
}

/** TipTap JSON → tisztított HTML. Érvénytelen dokumentumnál `ContentError`. */
export function renderContent(json: unknown): string {
  assertDoc(json);
  let html: string;
  try {
    html = generateHTML(stripForeignImages(json), editorExtensions());
  } catch {
    throw new ContentError('A tartalom nem dolgozható fel.');
  }
  return DOMPurify.sanitize(html, { ADD_ATTR: ['target'] });
}

/** Hány képnek hiányzik az alternatív szövege. */
export function imagesWithoutAlt(json: unknown): number {
  let n = 0;
  const walk = (node: JSONContent | undefined) => {
    if (!node) return;
    if (node.type === 'image' && !String(node.attrs?.alt ?? '').trim()) n++;
    node.content?.forEach(walk);
  };
  walk(json as JSONContent);
  return n;
}

/** Van-e a dokumentumban tényleges szöveg vagy kép (üres bekezdések nem számítanak). */
export function hasContent(json: unknown): boolean {
  const walk = (node: JSONContent | undefined): boolean => {
    if (!node) return false;
    if (node.type === 'text' && node.text?.trim()) return true;
    if (node.type === 'image') return true;
    return (node.content ?? []).some(walk);
  };
  return walk(json as JSONContent);
}

/** Megkezdett-e egy nyelv: bármelyik mezője ki van töltve. */
const isStarted = (c: EditorCopy) =>
  !!(c.title.trim() || c.role.trim() || c.blurb.trim() || c.note.trim() || hasContent(c.contentJson));

// ---------------------------------------------------------------------------
// Validálás
// ---------------------------------------------------------------------------

const copySchema = z.object({
  title: z.string().trim().max(300),
  role: z.string().trim().max(120),
  blurb: z.string().trim().max(500),
  contentJson: z.unknown(),
  note: z.string().trim().max(500),
});

export const savePayloadSchema = z.object({
  slug: z.string().trim().toLowerCase().max(SLUG_MAX),
  slugAuto: z.boolean(),
  publishedAt: z.number().int().positive().nullable(),
  featured: z.boolean(),
  liveUrl: z.string().trim().max(500),
  stack: z.string().trim().max(300),
  coverImageId: z.uuid().nullable(),
  coverIsLogo: z.boolean(),
  copies: z.object({ en: copySchema, hu: copySchema }),
  expectedUpdatedAt: z.number().int().nullable(),
});

export type SaveInput = z.infer<typeof savePayloadSchema>;

export type SaveResult =
  | { ok: true; project: EditorProject }
  | { ok: false; status: number; error: string; field?: string };

// ---------------------------------------------------------------------------
// Lekérdezések
// ---------------------------------------------------------------------------

export function getEditorProject(id: number): EditorProject | null {
  const db = getDb();
  const p = db.select().from(projects).where(eq(projects.id, id)).get();
  if (!p) return null;
  const copies = { en: emptyCopy(), hu: emptyCopy() };
  for (const c of db.select().from(projectCopies).where(eq(projectCopies.projectId, id)).all()) {
    copies[c.lang] = { title: c.title, role: c.role, blurb: c.blurb, contentJson: c.contentJson, note: c.note };
  }
  return {
    id: p.id,
    slug: p.slug,
    status: p.status,
    publishedAt: p.publishedAt?.getTime() ?? null,
    featured: p.featured,
    liveUrl: p.liveUrl ?? '',
    stack: p.stack,
    coverImage: p.coverImageId ? getImage(p.coverImageId) : null,
    coverIsLogo: p.coverIsLogo,
    copies,
    updatedAt: p.updatedAt.getTime(),
  };
}

export interface ProjectListItem {
  id: number;
  slug: string;
  status: Status;
  featured: boolean;
  publishedAt: Date | null;
  updatedAt: Date;
  liveUrl: string | null;
  /** Az angol cím, ha van, különben a magyar. */
  title: string;
  /** A megírt nyelvek. */
  langs: Lang[];
  cover: string | null;
}

/** Minden projekt, abban a sorrendben, ahogy a portfólió falán állnak; a piszkozatok a végén. */
export function listProjects(): ProjectListItem[] {
  const db = getDb();
  const rows = db
    .select()
    .from(projects)
    .orderBy(desc(projects.status), desc(projects.featured), desc(projects.publishedAt), desc(projects.updatedAt))
    .all();
  const copies = db.select({ projectId: projectCopies.projectId, lang: projectCopies.lang, title: projectCopies.title }).from(projectCopies).all();
  return rows.map((p) => {
    const own = copies.filter((c) => c.projectId === p.id && c.title.trim());
    const title = own.find((c) => c.lang === 'en')?.title ?? own[0]?.title ?? '';
    return {
      id: p.id,
      slug: p.slug,
      status: p.status,
      featured: p.featured,
      publishedAt: p.publishedAt,
      updatedAt: p.updatedAt,
      liveUrl: p.liveUrl,
      title,
      langs: LANGS.filter((l) => own.some((c) => c.lang === l)),
      cover: p.coverImageId ? (getImage(p.coverImageId)?.src ?? null) : null,
    };
  });
}

// ---------------------------------------------------------------------------
// Mentés
// ---------------------------------------------------------------------------

function slugTaken(slug: string, exceptId: number | null) {
  return !!getDb()
    .select({ id: projects.id })
    .from(projects)
    .where(and(eq(projects.slug, slug), exceptId ? ne(projects.id, exceptId) : undefined))
    .get();
}

export function isSlugAvailable(slug: string, exceptId: number | null) {
  return SLUG_PATTERN.test(slug) && !slugTaken(slug, exceptId);
}

/** Szabad slug: ha foglalt, `-2`, `-3`, … utótagot kap. */
function uniqueSlug(base: string, exceptId: number | null) {
  let slug = base;
  for (let i = 2; slugTaken(slug, exceptId); i++) {
    const suffix = `-${i}`;
    slug = base.slice(0, SLUG_MAX - suffix.length).replace(/-+$/, '') + suffix;
  }
  return slug;
}

function resolveSlug(input: SaveInput, id: number | null): { slug: string } | { error: string } {
  let base = input.slug || slugify(slugSource(input.copies));
  if (!base) base = `piszkozat-${Date.now().toString(36)}`;
  if (!SLUG_PATTERN.test(base)) {
    return { error: 'Az URL csak kisbetűt, számot és kötőjelet tartalmazhat (pl. football-predictor).' };
  }
  // Kézzel megadott, foglalt slug: nem írjuk át csendben, szólunk.
  if (!input.slugAuto && slugTaken(base, id)) {
    return { error: 'Ez az URL már foglalt egy másik projektnél. Válassz másikat.' };
  }
  return { slug: uniqueSlug(base, id) };
}

/** Csak http(s) link lehet az élő oldal; üresen `null`. */
function cleanLiveUrl(value: string): string | null | { error: string } {
  if (!value) return null;
  const url = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  try {
    const parsed = new URL(url);
    if ((parsed.protocol !== 'https:' && parsed.protocol !== 'http:') || !parsed.hostname.includes('.')) throw new Error();
    // Ahogy beírtad (a `href` záró perjelet tenne a puszta domain után).
    return url;
  } catch {
    return { error: 'Az élő oldal címe nem érvényes link (pl. https://edortech.hu).' };
  }
}

/** Új projekt (`id === null`) vagy meglévő mentése. Az állapotot nem változtatja. */
export function saveProject(id: number | null, input: SaveInput): SaveResult {
  const db = getDb();

  if (JSON.stringify(input.copies).length > MAX_CONTENT_BYTES) {
    return { ok: false, status: 413, error: 'A projekt szövege túl nagy.' };
  }

  const rendered = {} as Record<Lang, { json: JSONContent | null; html: string }>;
  for (const lang of LANGS) {
    const json = input.copies[lang].contentJson;
    if (json === null || json === undefined) {
      rendered[lang] = { json: null, html: '' };
      continue;
    }
    try {
      assertDoc(json);
      const clean = stripForeignImages(json);
      rendered[lang] = { json: clean, html: hasContent(clean) ? renderContent(clean) : '' };
    } catch (e) {
      return { ok: false, status: 400, error: e instanceof ContentError ? e.message : 'Érvénytelen tartalom.' };
    }
  }

  if (input.coverImageId && !getImage(input.coverImageId)) {
    return { ok: false, status: 400, error: 'A borítókép nem található. Töltsd fel újra.' };
  }

  const liveUrl = cleanLiveUrl(input.liveUrl);
  if (liveUrl && typeof liveUrl === 'object') return { ok: false, status: 400, error: liveUrl.error, field: 'liveUrl' };

  let existing: typeof projects.$inferSelect | undefined;
  if (id !== null) {
    existing = db.select().from(projects).where(eq(projects.id, id)).get();
    if (!existing) return { ok: false, status: 404, error: 'A projekt nem található.' };
    if (input.expectedUpdatedAt !== null && existing.updatedAt.getTime() !== input.expectedUpdatedAt) {
      return {
        ok: false,
        status: 409,
        error: 'Ezt a projektet egy másik lapon is módosítottad, amióta itt megnyitottad. Töltsd újra az oldalt (az itteni módosítások elvesznek), vagy másold ki őket előtte.',
      };
    }
  }

  const slug = resolveSlug(input, id);
  if ('error' in slug) return { ok: false, status: 409, error: slug.error, field: 'slug' };

  const stack = input.stack
    .split(',')
    .map((s) => s.trim().replace(/\s+/g, ' '))
    .filter(Boolean)
    .join(', ');

  const values = {
    slug: slug.slug,
    // Publikált projektnél a dátum nem törölhető (a sorrend ebből jön).
    publishedAt: input.publishedAt
      ? new Date(input.publishedAt)
      : existing?.status === 'published'
        ? existing.publishedAt
        : null,
    featured: input.featured,
    liveUrl,
    stack,
    coverImageId: input.coverImageId,
    coverIsLogo: input.coverIsLogo,
    // Ezredmásodperc pontosság + a régi értéknél mindig nagyobb: két gyors
    // egymás utáni mentésnél se legyen azonos, különben az ütközésfigyelés vak.
    updatedAt: new Date(Math.max(Date.now(), (existing?.updatedAt.getTime() ?? 0) + 1)),
  };

  const projectId = db.transaction((tx) => {
    let pid: number;
    if (id === null) {
      pid = tx.insert(projects).values({ ...values, status: 'draft' }).returning({ id: projects.id }).get().id;
    } else {
      tx.update(projects).set(values).where(eq(projects.id, id)).run();
      pid = id;
    }
    tx.delete(projectCopies).where(eq(projectCopies.projectId, pid)).run();
    for (const lang of LANGS) {
      const c = input.copies[lang];
      if (!isStarted(c)) continue;
      tx.insert(projectCopies)
        .values({
          projectId: pid,
          lang,
          title: c.title,
          role: c.role,
          blurb: c.blurb,
          contentJson: rendered[lang].json,
          contentHtml: rendered[lang].html,
          note: c.note,
        })
        .run();
    }
    return pid;
  });

  return { ok: true, project: getEditorProject(projectId)! };
}

/** Közzététel előtti ellenőrzés; üres lista, ha minden rendben. */
export function publishProblems(p: EditorProject): string[] {
  const problems: string[] = [];
  const started = LANGS.filter((l) => isStarted(p.copies[l]));
  if (!started.length) problems.push('Írd meg legalább az egyik nyelvet (cím és rövid leírás).');
  for (const lang of started) {
    const c = p.copies[lang];
    const name = lang === 'en' ? 'Az angol' : 'A magyar';
    if (!c.title.trim()) problems.push(`${name} változatnak nincs címe.`);
    if (!c.blurb.trim()) problems.push(`${name} változatnak nincs rövid leírása (ez áll a kártyán).`);
    const noAlt = imagesWithoutAlt(c.contentJson);
    if (noAlt) {
      problems.push(`${name} szövegben ${noAlt} képnek nincs alternatív szövege (kattints a képre, és írd le röviden, mi látható rajta).`);
    }
  }
  if (p.slug.startsWith('piszkozat-')) problems.push('Adj meg rendes URL-t (vagy adj címet, és abból készül).');
  return problems;
}

export function setPublished(id: number, publish: boolean): SaveResult {
  const project = getEditorProject(id);
  if (!project) return { ok: false, status: 404, error: 'A projekt nem található.' };

  if (publish) {
    const problems = publishProblems(project);
    if (problems.length) return { ok: false, status: 422, error: problems.join(' ') };
  }

  getDb()
    .update(projects)
    .set({
      status: publish ? 'published' : 'draft',
      // Megadott dátum megmarad; ha nincs, „most”.
      publishedAt: publish ? new Date(project.publishedAt ?? Date.now()) : project.publishedAt ? new Date(project.publishedAt) : null,
      updatedAt: new Date(Math.max(Date.now(), (project.updatedAt ?? 0) + 1)),
    })
    .where(eq(projects.id, id))
    .run();
  return { ok: true, project: getEditorProject(id)! };
}

export function deleteProject(id: number): boolean {
  return getDb().delete(projects).where(eq(projects.id, id)).run().changes > 0;
}
