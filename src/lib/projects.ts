import type { Lang } from '../i18n/ui';
import { t } from '../i18n/ui';

/**
 * Everything shown on the wall. Only projects the user has confirmed appear
 * here; nothing is invented to fill a frame.
 */
export interface Project {
  slug: string;
  status: 'live' | 'dev';
}

export const projects: Project[] = [
  { slug: 'edortech', status: 'live' },
  { slug: 'football-predictor', status: 'dev' },
];

/** Copy for one project, in one language. */
export function projectCopy(lang: Lang, slug: string) {
  const tr = t(lang);
  const key = slug === 'edortech' ? 'edortech' : 'predictor';
  return {
    title: tr(`p.${key}.title` as 'p.edortech.title'),
    role: tr(`p.${key}.role` as 'p.edortech.role'),
    blurb: tr(`p.${key}.blurb` as 'p.edortech.blurb'),
  };
}

/** The wall holds four project frames, so every page is a set of four. */
export const PAGE_FRAMES = 4;

export function paginate<T>(items: T[]): T[][] {
  if (items.length === 0) return [[]];
  const pages: T[][] = [];
  for (let i = 0; i < items.length; i += PAGE_FRAMES) {
    pages.push(items.slice(i, i + PAGE_FRAMES));
  }
  return pages;
}

export const projectPages = () => paginate(projects);
