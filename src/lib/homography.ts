/**
 * Maps a flat, axis-aligned rectangle onto an arbitrary quadrilateral.
 *
 * The plates are photographs, so their panels are perspective quads, not
 * rectangles: rotate/skew can only approximate them and drifts at the corners.
 * A homography is exact. We author each panel's content as a plain rectangle
 * (`design`) and hand the browser the 4x4 that lays it onto the panel's four
 * measured corners.
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
 * The 3x3 homography taking the rectangle (0,0)-(w,h) to `quad`, flattened as
 * [h0..h7] with h8 fixed at 1.
 */
function homography(w: number, h: number, quad: Quad): number[] {
  const src: Point[] = [
    [0, 0],
    [w, 0],
    [w, h],
    [0, h],
  ];
  const dst: Point[] = [quad.tl, quad.tr, quad.br, quad.bl];

  const A: number[][] = [];
  const b: number[] = [];
  for (let i = 0; i < 4; i++) {
    const [x, y] = src[i];
    const [u, v] = dst[i];
    A.push([x, y, 1, 0, 0, 0, -u * x, -u * y]);
    b.push(u);
    A.push([0, 0, 0, x, y, 1, -v * x, -v * y]);
    b.push(v);
  }
  return solve(A, b);
}

/**
 * A CSS `matrix3d(...)` laying a `design`-sized element onto `quad`.
 * The element needs `transform-origin: 0 0` and no other transform.
 */
export function quadTransform(design: { w: number; h: number }, quad: Quad): string {
  const [a, b, c, d, e, f, g, i] = homography(design.w, design.h, quad);
  // CSS matrix3d is column-major.
  const m = [a, d, 0, g, b, e, 0, i, 0, 0, 1, 0, c, f, 0, 1];
  return `matrix3d(${m.map((n) => Number(n.toFixed(9))).join(',')})`;
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
