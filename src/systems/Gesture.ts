import { GESTURE, THROW } from '../config';

export interface Sample {
  x: number;
  y: number;
  /** Milliseconds. */
  t: number;
}

export interface Throw {
  /** 1.0 is the perfect no-wind throw. */
  power: number;
  /** Radians from vertical. Positive = right. */
  theta: number;
}

/**
 * A swipe, read as a throw.
 *
 * SWIPE ONLY. No tilt, no gyroscope, no pull-back. One gesture, one input, and
 * it works one-handed on a bus — which is where this game should be playable.
 * See CONCEPT.md §5; the concept boards all got this wrong.
 *
 * Returns null for anything that isn't a throw. A rejected gesture costs the
 * player nothing: no ballot is consumed.
 */
export function readSwipe(samples: Sample[], screenH: number): Throw | null {
  if (samples.length < 2) return null;

  const start = samples[0]!;
  const end = samples[samples.length - 1]!;

  const dx = end.x - start.x;
  const dy = start.y - end.y; // + = upward
  const dur = Math.max(end.t - start.t, 16);

  if (dy < GESTURE.MIN_UP_PX) return null; // not upward, or barely moved
  if (dur > GESTURE.MAX_DURATION_MS) return null; // a drag, not a throw

  const len = Math.hypot(dx, dy);

  const lenNorm = clamp(len / (GESTURE.LENGTH_REF * screenH), 0, 1.4);
  const speedNorm = clamp(len / dur / GESTURE.SPEED_REF, 0, 1.4);

  let power = GESTURE.WEIGHT_LENGTH * lenNorm + GESTURE.WEIGHT_SPEED * speedNorm;

  // Pull mid-range swipes toward the sweet spot. Power is meant to be a warm-up
  // skill; the wind is the real one. A player who can throw straight should not
  // keep losing to their own thumb.
  power = 1.0 + (power - 1.0) * THROW.POWER_EASE;
  power = clamp(power, THROW.POWER_MIN, THROW.POWER_MAX);

  const theta = clamp(Math.atan2(dx, dy), -THROW.MAX_ANGLE, THROW.MAX_ANGLE);

  return { power, theta };
}

/**
 * Enough that no two throws are identical. Small enough that a correct read is
 * never robbed — the player must always be able to trust a good decision.
 */
export function addNoise(t: Throw, rand: () => number = gauss): Throw {
  return {
    power: clamp(
      t.power * (1 + rand() * THROW.NOISE_POWER),
      THROW.POWER_MIN,
      THROW.POWER_MAX,
    ),
    theta: clamp(
      t.theta + rand() * THROW.NOISE_ANGLE,
      -THROW.MAX_ANGLE,
      THROW.MAX_ANGLE,
    ),
  };
}

/** Box–Muller, roughly unit normal. */
function gauss(): number {
  const u = Math.random() || 1e-9;
  const v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}
