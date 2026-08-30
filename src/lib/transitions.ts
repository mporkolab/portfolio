import type { TransitionDirectionalAnimations } from 'astro';

/**
 * Turning your head. Both halves run at once, for the same time, with no delay
 * and no fade: the outgoing scene sweeps out of frame while the incoming one
 * sweeps in over it, both smeared by motion blur that clears as they settle.
 *
 * The earlier attempt delayed the incoming half and animated opacity, which left
 * a gap of bare background in the middle — that read as a blackout, not a turn.
 */
const TURN = {
  duration: '460ms',
  easing: 'cubic-bezier(0.32, 0, 0.2, 1)',
  fillMode: 'both',
} as const;

const turn = (out: string, into: string): TransitionDirectionalAnimations['forwards'] => ({
  old: { name: out, ...TURN },
  new: { name: into, ...TURN },
});

export const cameraTurn: TransitionDirectionalAnimations = {
  forwards: turn('pan-out-left', 'pan-in-right'),
  backwards: turn('pan-out-right', 'pan-in-left'),
};
