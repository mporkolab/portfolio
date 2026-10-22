/**
 * A case study as a flight log: the CMS's HTML cut into legs at its <h2>s.
 * The cut is on the editor's own markup (cms/src/lib/editor writes a plain
 * `<h2>` or `<h2 style=…>`), never a guess at where a story turns: a story
 * with no <h2> is one leg.
 */

export interface Leg {
  /** The heading's inner HTML, or null for the opening leg before any <h2>. */
  heading: string | null;
  /** The leg's HTML. */
  body: string;
}

const H2 = /<h2\b[^>]*>([\s\S]*?)<\/h2>/gi;

export function legs(html: string): Leg[] {
  const out: Leg[] = [];
  let last = 0;
  let heading: string | null = null;
  for (const m of html.matchAll(H2)) {
    const body = html.slice(last, m.index).trim();
    if (heading !== null || body) out.push({ heading, body });
    heading = m[1].trim();
    last = m.index! + m[0].length;
  }
  const rest = html.slice(last).trim();
  if (heading !== null || rest) out.push({ heading, body: rest });
  return out;
}

/** Whether the story has headings to cut at. */
export function hasLegs(html: string): boolean {
  return /<h2\b/i.test(html);
}
