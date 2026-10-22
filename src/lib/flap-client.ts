/**
 * The split-flap animation, in the browser. The server has already rendered
 * every flap with its final text (so it reads without JavaScript and nothing
 * flashes); this only spins the cells through random characters and lets them
 * settle left to right. One timer runs for the whole page, however many flaps
 * are on it.
 */

const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
/** Between one cell settling and the next. */
const STAGGER = 65;
/** Everything has settled by then, however long the text or late the row. */
const LIMIT = 1900;
const FRAME = 45;

interface Spin {
  cell: HTMLElement;
  final: string;
  at: number;
}

let spinning: Spin[] = [];
let timer: number | undefined;

const still = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const random = () => GLYPHS[Math.floor(Math.random() * GLYPHS.length)];

function frame() {
  const now = performance.now();
  spinning = spinning.filter((s) => {
    if (now >= s.at) {
      s.cell.textContent = s.final;
      s.cell.classList.remove('is-spinning');
      return false;
    }
    s.cell.textContent = random();
    return true;
  });
  if (!spinning.length) {
    window.clearInterval(timer);
    timer = undefined;
  }
}

/** Spins the given cells into their final characters, the i-th settling i staggers after `delay`. */
function run(cells: HTMLElement[], delay: number) {
  if (still()) return;
  const start = performance.now();
  cells.forEach((cell, i) => {
    const final = cell.dataset.c ?? '';
    if (final.trim() === '') return;
    cell.classList.add('is-spinning');
    spinning.push({ cell, final, at: start + Math.min(delay + i * STAGGER, LIMIT) });
  });
  if (spinning.length && timer === undefined) timer = window.setInterval(frame, FRAME);
}

const cellsOf = (flap: Element) => [...flap.querySelectorAll<HTMLElement>('.flap__cell')];

/** Plays a flap's arrival once. */
export function spin(flap: HTMLElement) {
  flap.dataset.flapped = '';
  run(cellsOf(flap), Number(flap.dataset.delay ?? 0));
}

/**
 * Puts new text on a flap of fixed length (the clock): only the characters
 * that changed turn over. The screen-reader copy follows.
 */
export function setFlapText(flap: HTMLElement, text: string) {
  const cells = cellsOf(flap);
  const changed: HTMLElement[] = [];
  cells.forEach((cell, i) => {
    const c = text[i] ?? ' ';
    if (cell.dataset.c === c) return;
    cell.dataset.c = c;
    cell.textContent = c;
    changed.push(cell);
  });
  const label = flap.querySelector('.flap__text');
  if (label) label.textContent = text;
  run(changed, 0);
}

/** Every flap on a freshly loaded page that has not played yet. */
export function spinPage() {
  document
    .querySelectorAll<HTMLElement>('[data-flap]:not([data-flapped]):not([data-flap-manual])')
    .forEach(spin);
}

/** A page swapped out mid-spin leaves nothing running behind it. */
export function stopAll() {
  spinning = [];
  window.clearInterval(timer);
  timer = undefined;
}
