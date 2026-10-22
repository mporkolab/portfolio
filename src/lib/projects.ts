/**
 * Everything shown on the wall. The projects themselves live in the CMS (see
 * `cms.ts`); this module only shapes them for the wall's geometry.
 */

export { getProjects, getPreview, copyFor, assetUrl, shareImageUrl } from './cms';
export type { Project, ProjectCopy, Thumbnail } from './cms';

import { getProjects } from './cms';
import type { Project } from './cms';

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

export async function projectPages(): Promise<Project[][]> {
  return paginate(await getProjects());
}
