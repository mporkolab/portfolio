/**
 * Maps a flat, axis-aligned rectangle onto a photographed panel.
 *
 * The plates are photographs, so their panels are perspective quads, not
 * rectangles. An exact fit needs a homography — a `matrix3d` with live
 * perspective terms — and that is what this used to hand the browser. WebKit
 * gets those wrong: it lays out and hit-tests the element from the full matrix
 * but *paints* it flat, so on Safari the sign labels landed nowhere near the
 * signs they belong to and, at a wide window, off the plate entirely.
 *
 * So we fit the closest affine transform instead — the least-squares 2D matrix
 * through the four measured corners. The plates are shot close to head on, so
 * what that gives up is tiny: at most about 7px of corner drift in a 2500px
 * space, well inside the 10px bleed a panel is drawn with. Every engine paints
 * a 2D matrix the way it measures it, which is the property that matters more
 * than the last few pixels of convergence.
 *
 * All destination coordinates live in the plate's natural pixel space
 * (e.g. 2754x1536); PlateScene scales that space to the viewport with a single
 * container-query transform, so these matrices stay constant.
 */

export type Point = readonly [x: number, y: number];

/** Panel corners, clockwise from the top left, in the plate's natural pixels. */
export interface Quad {
  tl: Point;
  tr: Point;
  br: Point;
  bl: Point;
}

/** Solves A·x = b in place. Gauss–Jordan with partial pivoting. */
function solve(A: number[][], b: number[]): number[] {
  const n = b.length;
  for (let col = 0; col < n; col++) {
    let pivot = col;
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(A[row][col]) > Math.abs(A[pivot][col])) pivot = row;
    }
    if (Math.abs(A[pivot][col]) < 1e-12) {
      throw new Error('Degenerate quad: corners are collinear or coincident.');
    }
    [A[col], A[pivot]] = [A[pivot], A[col]];
    [b[col], b[pivot]] = [b[pivot], b[col]];

    const d = A[col][col];
    for (let k = col; k < n; k++) A[col][k] /= d;
    b[col] /= d;

    for (let row = 0; row < n; row++) {
      if (row === col) continue;
      const f = A[row][col];
      if (f === 0) continue;
      for (let k = col; k < n; k++) A[row][k] -= f * A[col][k];
      b[row] -= f * b[col];
    }
  }
  return b;
}

/**
 * The least-squares affine taking the rectangle (0,0)-(w,h) to `quad`, as
 * [a, b, c, d, e, f] — the six numbers CSS `matrix()` takes.
 *
 * Six unknowns against eight equations, so the corners are approached rather
 * than hit; the normal equations below are the standard way to split that error
 * evenly between them.
 */
function affine(w: number, h: number, quad: Quad): number[] {
  const src: Point[] = [
    [0, 0],
    [w, 0],
    [w, h],
    [0, h],
  ];
  const dst: Point[] = [quad.tl, quad.tr, quad.br, quad.bl];

  // x and y are independent: the same 3x3 system, solved once per axis.
  const fit = (axis: 0 | 1) => {
    const A: number[][] = [
      [0, 0, 0],
      [0, 0, 0],
      [0, 0, 0],
    ];
    const b = [0, 0, 0];
    for (let i = 0; i < 4; i++) {
      const row = [src[i][0], src[i][1], 1];
      for (let m = 0; m < 3; m++) {
        for (let n = 0; n < 3; n++) A[m][n] += row[m] * row[n];
        b[m] += row[m] * dst[i][axis];
      }
    }
    return solve(A, b);
  };

  const [a, c, e] = fit(0);
  const [b, d, f] = fit(1);
  return [a, b, c, d, e, f];
}

/**
 * A CSS `matrix(...)` laying a `design`-sized element onto `quad`.
 * The element needs `transform-origin: 0 0` and no other transform.
 */
export function quadTransform(design: { w: number; h: number }, quad: Quad): string {
  const m = affine(design.w, design.h, quad);
  return `matrix(${m.map((n) => Number(n.toFixed(9))).join(',')})`;
}

/** The quad as an SVG/`clip-path` polygon in the same natural pixel space. */
export function quadPoints(quad: Quad): string {
  return [quad.tl, quad.tr, quad.br, quad.bl].map(([x, y]) => `${x},${y}`).join(' ');
}

/** Axis-aligned bounds of a quad — handy for hit areas and debugging. */
export function quadBounds(quad: Quad) {
  const xs = [quad.tl[0], quad.tr[0], quad.br[0], quad.bl[0]];
  const ys = [quad.tl[1], quad.tr[1], quad.br[1], quad.bl[1]];
  return {
    x: Math.min(...xs),
    y: Math.min(...ys),
    w: Math.max(...xs) - Math.min(...xs),
    h: Math.max(...ys) - Math.min(...ys),
  };
}

/** Pushes a quad's corners outward from its centre — used to cover a panel's edge. */
export function expandQuad(quad: Quad, by: number): Quad {
  const pts = [quad.tl, quad.tr, quad.br, quad.bl];
  const cx = pts.reduce((n, p) => n + p[0], 0) / 4;
  const cy = pts.reduce((n, p) => n + p[1], 0) / 4;
  const push = ([x, y]: Point): Point => {
    const dx = x - cx;
    const dy = y - cy;
    const len = Math.hypot(dx, dy) || 1;
    return [x + (dx / len) * by, y + (dy / len) * by];
  };
  return { tl: push(quad.tl), tr: push(quad.tr), br: push(quad.br), bl: push(quad.bl) };
}
