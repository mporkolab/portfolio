/**
 * A CMS adatbázis-sémája (SQLite, Drizzle ORM).
 *
 * A portfólió szervere ugyanezt a fájlt olvassa, csak olvasásra, nyers SQL-lel
 * (../../../../src/lib/cms.ts) – oszlop átnevezésekor ott is át kell írni.
 *
 * Minden időbélyeg ezredmásodpercben tárolt egész szám (`timestamp_ms`), a
 * Drizzle `Date`-ként adja vissza.
 *
 * Séma módosítása után: `npm run db:generate`, majd a keletkezett SQL-t
 * commitolni kell – induláskor a `drizzle/` mappa migrációi futnak le.
 */
import { sql } from 'drizzle-orm';
import { index, integer, primaryKey, sqliteTable, text } from 'drizzle-orm/sqlite-core';

const createdAt = () =>
  integer('created_at', { mode: 'timestamp_ms' })
    .notNull()
    .default(sql`(unixepoch('subsec') * 1000)`);

export const LANGS = ['en', 'hu'] as const;
export const STATUSES = ['draft', 'published'] as const;
export const SHARE_EXTS = ['jpg', 'png'] as const;

export const images = sqliteTable('images', {
  id: text('id').primaryKey(), // uuid
  // Az alapútvonal kiterjesztés és szélesség nélkül, pl. `2026/10/<uuid>`.
  path: text('path').notNull(),
  originalName: text('original_name'),
  // A legnagyobb tárolt WebP változat mérete; a kisebbek ebből kiszámolhatók.
  width: integer('width').notNull(),
  height: integer('height').notNull(),
  size: integer('size').notNull(),
  // A megosztási előnézethez (Open Graph) tárolt, nem WebP változat formátuma:
  // átlátszó képnél PNG, egyébként JPEG.
  shareExt: text('share_ext', { enum: SHARE_EXTS }).notNull(),
  createdAt: createdAt(),
});

/** Egy projekt: ami nyelvtől független. A szövege nyelvenként a `project_copies`-ban. */
export const projects = sqliteTable(
  'projects',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    // A cím: /projects/<slug> és /hu/projects/<slug>.
    slug: text('slug').notNull().unique(),
    status: text('status', { enum: STATUSES }).notNull().default('draft'),
    // A sorrendhez: a kiemelt elöl, utána a legfrissebb dátum.
    publishedAt: integer('published_at', { mode: 'timestamp_ms' }),
    featured: integer('featured', { mode: 'boolean' }).notNull().default(false),
    // Az élő oldal; akinek van, az „Élő”, akinek nincs, az „Fejlesztés alatt”.
    liveUrl: text('live_url'),
    // Vesszővel elválasztva, pl. „Astro, Three.js”.
    stack: text('stack').notNull().default(''),
    coverImageId: text('cover_image_id').references(() => images.id, { onDelete: 'set null' }),
    // A borítókép logó: egészben, a sötét kereten jelenik meg, nem kivágva.
    coverIsLogo: integer('cover_is_logo', { mode: 'boolean' }).notNull().default(false),
    createdAt: createdAt(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
      .notNull()
      .default(sql`(unixepoch('subsec') * 1000)`),
  },
  (t) => [index('projects_public_idx').on(t.status, t.featured, t.publishedAt)],
);

/**
 * Egy projekt szövege egy nyelven. Ahol a cím üres, az a nyelv nincs megírva:
 * a portfólió ilyenkor a másik nyelvét mutatja.
 */
export const projectCopies = sqliteTable(
  'project_copies',
  {
    projectId: integer('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    lang: text('lang', { enum: LANGS }).notNull(),
    title: text('title').notNull().default(''),
    // A szerep, pl. „Client project”.
    role: text('role').notNull().default(''),
    // A rövid leírás a kártyán.
    blurb: text('blurb').notNull().default(''),
    // Az esettanulmány: a TipTap dokumentum, ebből szerkesztünk…
    contentJson: text('content_json', { mode: 'json' }),
    // …és mentéskor belőle generált, DOMPurify-jal tisztított HTML, ezt olvassa az oldal.
    contentHtml: text('content_html').notNull().default(''),
    // Megjegyzés a történet alatt, sima szöveg, pl. „még nincsenek pontossági adatok”.
    note: text('note').notNull().default(''),
  },
  (t) => [primaryKey({ columns: [t.projectId, t.lang] })],
);

export type Project = typeof projects.$inferSelect;
export type ProjectCopy = typeof projectCopies.$inferSelect;
export type ImageRow = typeof images.$inferSelect;
