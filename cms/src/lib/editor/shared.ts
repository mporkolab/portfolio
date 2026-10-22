/**
 * A szerkesztő és a szerver közös, függőség nélküli segédei és feliratai.
 * (A böngészőbe is bekerül, ezért nem importálhat szerveroldali modult.)
 */

export type Lang = 'en' | 'hu';
export const LANGS: readonly Lang[] = ['en', 'hu'];
export const LANG_LABEL: Record<Lang, string> = { en: 'Angol', hu: 'Magyar' };

/** A projekt publikus útvonala a portfólión, a slug nélkül. */
export const publicPathPrefix = (lang: Lang) => (lang === 'hu' ? '/hu/projects/' : '/projects/');

export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const SLUG_MAX = 120;

/**
 * URL-barát azonosító a címből: ékezetek nélkül, kisbetűvel, kötőjelekkel.
 * „Futball-előrejelző” → „futball-elorejelzo”.
 */
export function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, SLUG_MAX)
    .replace(/-+$/g, '');
}

export type Status = 'draft' | 'published';

export const STATUS_LABEL: Record<Status, string> = {
  draft: 'Piszkozat',
  published: 'Publikált',
};

/** Feltöltött kép, ahogy a szerkesztő megkapja (lásd src/lib/images.ts). */
export interface EditorImage {
  id: string;
  src: string;
  srcset: string;
  width: number;
  height: number;
}

/** Egy nyelv szövege. Üres címmel az a nyelv nincs megírva. */
export interface EditorCopy {
  title: string;
  role: string;
  blurb: string;
  contentJson: unknown;
  note: string;
}

export const emptyCopy = (): EditorCopy => ({ title: '', role: '', blurb: '', contentJson: null, note: '' });

/** A szerkesztőnek átadott projekt (szerializálható, dátumok ezredmásodpercben). */
export interface EditorProject {
  id: number | null;
  slug: string;
  status: Status;
  publishedAt: number | null;
  featured: boolean;
  liveUrl: string;
  stack: string;
  coverImage: EditorImage | null;
  coverIsLogo: boolean;
  copies: Record<Lang, EditorCopy>;
  updatedAt: number | null;
}

/** A mentés kérés törzse (POST új projektnél, PUT meglévőnél). */
export interface SavePayload {
  slug: string;
  /** Igaz, ha a slugot a cím generálta: ütközésnél a szerver számot fűz hozzá. */
  slugAuto: boolean;
  publishedAt: number | null;
  featured: boolean;
  liveUrl: string;
  stack: string;
  coverImageId: string | null;
  coverIsLogo: boolean;
  copies: Record<Lang, EditorCopy>;
  /** Ütközésfigyelés: a szerkesztő által utoljára látott `updatedAt`. */
  expectedUpdatedAt: number | null;
}

/** A slug forrása: az angol cím, ha van, különben a magyar. */
export const slugSource = (copies: Record<Lang, { title: string }>) => copies.en.title.trim() || copies.hu.title.trim();
