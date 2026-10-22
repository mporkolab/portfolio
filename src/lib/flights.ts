/**
 * The projects as departures: a flight code and a destination code for each,
 * worked out from what the CMS already has, so no project needs a new field.
 * The order is the CMS's own (featured first, then the newest), which is also
 * what numbers the flights.
 */

import { copyFor, type Project } from './cms';
import type { Lang } from '../i18n/ui';

export interface Flight {
  project: Project;
  /** e.g. EDO-01: the slug's first three letters, then the place in the list. */
  code: string;
  /** The three-letter destination, BUD → EDO. */
  iata: string;
}

/** The first three letters or digits of the slug, upper-cased; padded with X. */
export function iataFor(slug: string): string {
  const letters = slug.replace(/[^a-z0-9]/gi, '').toUpperCase();
  return letters.slice(0, 3).padEnd(3, 'X');
}

export function flights(projects: Project[]): Flight[] {
  return projects.map((project, i) => {
    const iata = iataFor(project.slug);
    return { project, iata, code: `${iata}-${String(i + 1).padStart(2, '0')}` };
  });
}

/** The project the home page boards: the CMS's first featured one, else its first. */
export function featuredFlight(list: Flight[]): Flight | undefined {
  return list.find((f) => f.project.featured) ?? list[0];
}

/** A board cell holds `length` characters; anything longer is cut, not wrapped. */
export function clip(text: string, length: number): string {
  return text.length > length ? text.slice(0, length) : text;
}

/** Upper case the Hungarian way, so the flaps spell Á, Ő and Ű right. */
export function caps(text: string): string {
  return text.toLocaleUpperCase('hu-HU');
}

/** `{n}` and friends in a dictionary string. */
export function fill(text: string, vars: Record<string, string | number>): string {
  return text.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m));
}

/** What kind of work it is, as the CMS's "role" line says it; nothing invented. */
export function typeOf(project: Project, lang: Lang): string {
  return copyFor(project, lang).role;
}
