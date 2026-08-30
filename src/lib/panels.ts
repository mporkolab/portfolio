import type { Quad } from './homography';

/**
 * Panel geometry, measured in each plate's natural pixel space (2754x1536).
 *
 * The yellow sign panels were segmented from the photograph by colour; the dark
 * panels were measured against a coordinate grid and refined in the browser
 * against the calibration view (`/dev/calibrate`).
 */

/** The photograph, and the part of it the panels sit on. */
export const HOME_PLATE = { w: 2784, h: 1536 } as const;

/**
 * bigger-bg.jpeg is shot with room around its subject: the sign and the light
 * boxes occupy the middle 56% x 54% of the frame, leaving roughly a fifth of the
 * picture as bare concrete on every side. That margin is what lets the scene go
 * full-bleed on any screen — it is the part that gets cropped, so no panel ever
 * has to be. Everything outside this box is atmosphere.
 */
export const HOME_CONTENT = { x: 600, y: 374, w: 1555, h: 832 } as const;

/**
 * The panels are measured in a space of the content box's shape, scaled so the
 * typography keeps the proportions it was drawn at. Corners came from masking
 * the photograph by colour — the sign faces are the only saturated yellow in the
 * frame, the light boxes the only near-white — and were then mapped into this
 * space; re-run that measurement if the photograph is ever replaced.
 */
export const HOME_SPACE = { w: 2500, h: 1338 } as const;

export const homePanels = {
  /** Overhead sign bar, left to right. */
  profile: { tl: [37, 0], tr: [768, 79], br: [767, 505], bl: [35, 455] },
  projects: { tl: [778, 79], tr: [1463, 151], br: [1461, 550], bl: [778, 505] },
  contact: { tl: [1469, 153], tr: [1947, 203], br: [1945, 582], bl: [1469, 551] },
  identity: { tl: [1957, 204], tr: [2497, 262], br: [2498, 465], bl: [1957, 420] },
  /** The two small cells tucked under the right end of the bar. */
  language: { tl: [1957, 429], tr: [2121, 442], br: [2122, 595], bl: [1957, 584] },
  clock: { tl: [2130, 445], tr: [2498, 473], br: [2497, 616], bl: [2130, 593] },

  /**
   * The reflective glass panel on the left. Traced by eye rather than by mask —
   * it is neither yellow nor white — and it holds no panel while "current work"
   * is parked, so it wants checking before that panel comes back.
   */
  current: { tl: [0, 527], tr: [1220, 543], br: [1220, 1328], bl: [0, 1338] },

  /** The two lit boxes and the strip below them, all white in this plate. */
  featuredArt: { tl: [1305, 630], tr: [1715, 653], br: [1715, 1068], bl: [1305, 1074] },
  featuredText: { tl: [1752, 656], tr: [2108, 677], br: [2109, 1063], bl: [1751, 1068] },
  outbound: { tl: [1305, 1156], tr: [2109, 1135], br: [2109, 1283], bl: [1305, 1326] },
} satisfies Record<string, Quad>;

export const PROJECTS_PLATE = { w: 2754, h: 1536 } as const;

/**
 * The frontal frame wall. Five lit boxes hang in a row: the leftmost is the way
 * back to the terminal, the other four hold one project each. Shot head on, so
 * every quad is very nearly a rectangle.
 */

/** The leftmost lightbox, repurposed as the sign pointing back. */
export const projectsSign = { tl: [83, 469], tr: [497, 469], br: [497, 1207], bl: [83, 1207] } satisfies Quad;

/** Small signs on the concrete band above the wall, hidden until there is paging. */
export const projectsPaging = {
  prev: { tl: [596, 250], tr: [800, 250], br: [800, 410], bl: [596, 410] },
  next: { tl: [2501, 250], tr: [2705, 250], br: [2705, 410], bl: [2501, 410] },
} satisfies Record<string, Quad>;

/** The four project frames, left to right. The last one runs off the frame edge. */
export const projectFrames = [
  { tl: [596, 469], tr: [1076, 469], br: [1076, 1203], bl: [596, 1203] },
  { tl: [1166, 465], tr: [1649, 465], br: [1649, 1203], bl: [1166, 1203] },
  { tl: [1736, 465], tr: [2222, 465], br: [2222, 1201], bl: [1736, 1201] },
  { tl: [2307, 465], tr: [2705, 465], br: [2705, 1201], bl: [2307, 1201] },
] satisfies Quad[];

export const ABOUT_PLATE = { w: 2784, h: 1536 } as const;

/**
 * The gate wall, shot head on: three big lit panels, a lit strip, and the
 * portrait lightbox on the column. Nothing stands in front of them, so each
 * block of the profile gets a panel of its own instead of running across the
 * mullions.
 */
export const aboutPanels = {
  intro: { tl: [744, 272], tr: [1120, 268], br: [1120, 1172], bl: [744, 1168] },
  story: { tl: [1168, 268], tr: [1548, 264], br: [1548, 1172], bl: [1172, 1172] },
  facts: { tl: [1596, 264], tr: [1976, 260], br: [1976, 1172], bl: [1596, 1172] },
  /** The lit strip above the column lightbox. */
  clock: { tl: [2032, 248], tr: [2384, 244], br: [2384, 444], bl: [2036, 448] },
  /** The portrait lightbox: the gate sign. */
  marker: { tl: [2056, 496], tr: [2352, 500], br: [2364, 1172], bl: [2056, 1180] },
} satisfies Record<string, Quad>;
