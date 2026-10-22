/**
 * Képfeltöltés és -kiszolgálás.
 *
 * Minden feltöltött kép újrakódolódik (sharp): ez eltávolítja az EXIF-adatokat
 * (a telefonos fotók GPS-koordinátáit is) és a fájlba rejtett egyéb tartalmat,
 * az EXIF-orientációt pedig előtte alkalmazza. A típust a fájl tartalmából
 * (magic bytes) állapítjuk meg, nem a kiterjesztésből. SVG nem fogadható el
 * (szkriptet tartalmazhat).
 *
 * Tárolás: `<UPLOADS_DIR>/ÉÉÉÉ/HH/<uuid>-<szélesség>.webp`, szélességek 600,
 * 1000, 2000 px – amekkorát a portfólió keretei kérnek (kisebb eredetinél nem
 * nagyít) –, és egy `<uuid>-share.jpg|png` a megosztási előnézethez, mert nem
 * minden link-előnézet olvas WebP-t. A változatok listáját nem tároljuk: a
 * legnagyobb szélességből (`images.width`) mindig kiszámolható. A portfólió
 * ugyanígy számolja (src/lib/cms.ts), a két listának egyeznie kell.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import sharp, { type Metadata, type Sharp } from 'sharp';
import { eq } from 'drizzle-orm';
import { getDb } from './db';
import { images, type ImageRow } from './db/schema';
import { env } from './env';

export const uploadsDir = () => path.resolve(env('UPLOADS_DIR') || 'data/uploads');

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
export const WIDTHS = [600, 1000, 2000] as const;
const MAX_WIDTH = WIDTHS[WIDTHS.length - 1];
const SHARE_WIDTH = 1200;
/** Kitömörítési bomba ellen: ennél több pixelt nem dolgozunk fel (~60 MP). */
const MAX_INPUT_PIXELS = 60_000_000;

export class ImageError extends Error {}

type Detected = 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp' | 'image/avif';

/** Képtípus a fájl első bájtjaiból; nem támogatott típusnál `null`. */
export function detectImageType(buf: Uint8Array): Detected | null {
  const ascii = (start: number, end: number) => String.fromCharCode(...buf.subarray(start, end));
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
  if (buf[0] === 0x89 && ascii(1, 4) === 'PNG') return 'image/png';
  if (ascii(0, 4) === 'GIF8') return 'image/gif';
  if (ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP') return 'image/webp';
  if (ascii(4, 8) === 'ftyp' && ['avif', 'avis'].includes(ascii(8, 12))) return 'image/avif';
  return null;
}

/** A tárolt változatok szélességei a legnagyobbikból. */
export function variantWidths(largest: number): number[] {
  return [...WIDTHS.filter((w) => w < largest), largest];
}

/** Feltöltött kép, ahogy a szerkesztő megkapja. */
export interface ImageInfo {
  id: string;
  src: string;
  srcset: string;
  width: number;
  height: number;
}

export const imageUrl = (basePath: string, width: number) => `/uploads/${basePath}-${width}.webp`;

export function imageInfo(row: ImageRow): ImageInfo {
  const widths = variantWidths(row.width);
  return {
    id: row.id,
    src: imageUrl(row.path, row.width),
    srcset: widths.map((w) => `${imageUrl(row.path, w)} ${w}w`).join(', '),
    width: row.width,
    height: row.height,
  };
}

export function getImage(id: string): ImageInfo | null {
  const row = getDb().select().from(images).where(eq(images.id, id)).get();
  return row ? imageInfo(row) : null;
}

/** Feltöltés feldolgozása és tárolása. Hibás bemenetnél `ImageError` magyar üzenettel. */
export async function storeImage(buf: Uint8Array, opts: { originalName?: string }): Promise<ImageInfo> {
  if (buf.byteLength > MAX_UPLOAD_BYTES) throw new ImageError('A kép legfeljebb 10 MB lehet.');
  const type = detectImageType(buf);
  if (!type) throw new ImageError('Nem támogatott formátum. JPEG, PNG, WebP, GIF vagy AVIF képet tölts fel.');

  const animated = type === 'image/gif' || type === 'image/webp';
  let base: Sharp;
  let meta: Metadata;
  try {
    base = sharp(buf, { animated, limitInputPixels: MAX_INPUT_PIXELS }).rotate();
    meta = await base.metadata();
  } catch {
    throw new ImageError('A képet nem sikerült beolvasni – lehet, hogy sérült, vagy túl nagy a felbontása.');
  }

  // Elforgatott (EXIF 5–8) képnél a megjelenő szélesség az eredeti magasság.
  const rotated = (meta.orientation ?? 1) >= 5;
  const srcWidth = (rotated ? meta.height : meta.width) ?? 0;
  const srcHeight = (rotated ? meta.width : (meta.pageHeight ?? meta.height)) ?? 0;
  if (!srcWidth || !srcHeight) throw new ImageError('A kép méretét nem sikerült megállapítani.');

  const largest = Math.min(srcWidth, MAX_WIDTH);
  const widths = variantWidths(largest);
  // Átlátszó képnél (pl. logó) a JPEG fekete hátteret adna.
  const shareExt = meta.hasAlpha ? 'png' : 'jpg';

  const id = randomUUID();
  const now = new Date();
  const dir = `${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
  const basePath = `${dir}/${id}`;
  await fs.mkdir(path.join(uploadsDir(), dir), { recursive: true });

  let largestSize = 0;
  const written: string[] = [];
  try {
    for (const w of widths) {
      const file = path.join(uploadsDir(), `${basePath}-${w}.webp`);
      const info = await base
        .clone()
        .resize({ width: w, withoutEnlargement: true })
        .webp({ quality: 80, effort: 4 })
        .toFile(file);
      written.push(file);
      if (w === largest) largestSize = info.size;
    }
    // A megosztási kép mindig állókép: animált GIF-nél az első kocka.
    const share = sharp(buf, { limitInputPixels: MAX_INPUT_PIXELS })
      .rotate()
      .resize({ width: Math.min(SHARE_WIDTH, srcWidth), withoutEnlargement: true });
    const shareFile = path.join(uploadsDir(), `${basePath}-share.${shareExt}`);
    await (shareExt === 'png' ? share.png() : share.flatten({ background: '#ffffff' }).jpeg({ quality: 85 })).toFile(shareFile);
    written.push(shareFile);
  } catch {
    await Promise.all(written.map((f) => fs.rm(f, { force: true })));
    throw new ImageError('A képet nem sikerült feldolgozni.');
  }

  const height = Math.round((srcHeight * largest) / srcWidth);
  const row = getDb()
    .insert(images)
    .values({
      id,
      path: basePath,
      originalName: opts.originalName?.slice(0, 200) ?? null,
      width: largest,
      height,
      size: largestSize,
      shareExt,
    })
    .returning()
    .get();

  return imageInfo(row);
}

/** Feltöltött kép URL-jéből a fájl abszolút útja; érvénytelen útnál `null`. */
export const UPLOAD_PATH = /^(\d{4})\/(\d{2})\/([0-9a-f-]{36})-(\d{2,4}\.webp|share\.(?:jpg|png))$/;

export function resolveUploadPath(relative: string): string | null {
  if (!UPLOAD_PATH.test(relative)) return null;
  return path.join(uploadsDir(), relative);
}

/** Saját feltöltésre mutat-e egy `src` (a tartalomban csak ilyen kép maradhat). */
export const isOwnUpload = (src: unknown): src is string =>
  typeof src === 'string' && src.startsWith('/uploads/') && UPLOAD_PATH.test(src.slice('/uploads/'.length));
