import { WIND } from '../config';

/**
 * The wind, as a state machine — Stage 2's reason for existing.
 *
 * In Stage 1 the wind was a single number a human dialled by hand. Here it is
 * blown by politics: every speech retargets it, it decays back toward calm
 * between speeches, and once a session a gust arrives that cannot be beaten.
 *
 * Pure. No Phaser, no globals, no clock. `stepWind` takes a state and a dt and
 * returns a new state; `windValue` reads the lateral acceleration the ballistics
 * step actually feels. That purity is what lets the solver PROVE the room stays
 * beatable, and what lets the whole model be tested without a browser.
 *
 * The model, in one breath:
 *
 *   A speech sets a TARGET and the wind eases toward it over RAMP_S (0.6s) —
 *   the room must be *seen* to change, never snap. Once settled, the target
 *   decays exponentially toward zero (half-life ≈ 5.8s), so a room left alone
 *   quietly calms. A gust is a separate transient added on top, and is the one
 *   thing in the game a correct read cannot save you from.
 */

export type Effect = 'PUSH' | 'AMPLIFY' | 'DAMPEN' | 'REVERSE';

export type GustPhase = 'none' | 'telegraph' | 'hit';

export interface WindState {
  /**
   * The political wind is modelled as a ramp toward `target`. While
   * `rampElapsed < rampDur` the wind is easing from `rampFrom` to `target`;
   * after that it has settled ON `target`, and `target` is what decays.
   */
  rampFrom: number;
  target: number;
  rampElapsed: number;
  rampDur: number;

  /** The at-most-one gust. `telegraph` counts down before any force arrives. */
  gust: GustState | null;
  gustsUsed: number;
}

interface GustState {
  /** Seconds of warning left before the force lands. The room reacts; the ball doesn't. */
  telegraph: number;
  /** Seconds into the force pulse itself, once telegraph reaches zero. */
  elapsed: number;
  /** Signed peak acceleration. The envelope scales this up and back down. */
  strength: number;
}

export function initWind(): WindState {
  return {
    rampFrom: 0,
    target: 0,
    rampElapsed: WIND.RAMP_S, // start settled at zero
    rampDur: WIND.RAMP_S,
    gust: null,
    gustsUsed: 0,
  };
}

/** Ease-out: fast at first, gentle into the target. The room lurches, then settles. */
function easeOut(t: number): number {
  const c = Math.min(Math.max(t, 0), 1);
  return 1 - (1 - c) * (1 - c);
}

/** The political wind right now, mid-ramp or settled. Excludes the gust. */
export function baseWind(s: WindState): number {
  if (s.rampElapsed >= s.rampDur) return s.target;
  const k = easeOut(s.rampElapsed / s.rampDur);
  return s.rampFrom + (s.target - s.rampFrom) * k;
}

/**
 * The gust's contribution: a raised cosine that rises from 0, peaks at the
 * midpoint, and returns to 0 over GUST.DURATION_S. Zero during the telegraph.
 *
 * This is deliberately NOT clamped into the cap: the base wind is always
 * beatable by design, but the gust is the one moment the game is allowed to be
 * unfair — heavily signposted, at most once, and impossible to counter. That
 * helplessness is the point.
 */
export function gustWind(s: WindState): number {
  const g = s.gust;
  if (!g || g.telegraph > 0) return 0;
  const phase = g.elapsed / WIND.GUST.DURATION_S;
  if (phase <= 0 || phase >= 1) return 0;
  const envelope = 0.5 * (1 - Math.cos(2 * Math.PI * phase));
  return g.strength * envelope;
}

/** What the ballistics step actually feels: political wind plus any gust. */
export function windValue(s: WindState): number {
  return baseWind(s) + gustWind(s);
}

export function gustPhase(s: WindState): GustPhase {
  if (!s.gust) return 'none';
  return s.gust.telegraph > 0 ? 'telegraph' : 'hit';
}

/** Where an effect wants to take the wind. `dir`/`mag` are read only by PUSH. */
function effectTarget(w: number, effect: Effect, dir: number, mag: number): number {
  switch (effect) {
    case 'PUSH':
      return w + dir * mag;
    case 'AMPLIFY':
      return w * WIND.AMPLIFY;
    case 'DAMPEN':
      return w * WIND.DAMPEN;
    case 'REVERSE':
      return w * WIND.REVERSE;
  }
}

function clampCap(w: number): number {
  return Math.min(WIND.MAX, Math.max(-WIND.MAX, w));
}

/**
 * Where an effect WOULD take the wind, without applying it. The speech scheduler
 * uses this to bias away from speeches that would pin the room at the cap — so
 * the wind can't runaway-saturate and sit there, which would make it unreadable.
 */
export function predictWind(current: number, effect: Effect, dir = 0, mag = 0): number {
  return clampCap(effectTarget(current, effect, dir, mag));
}

/**
 * A speech lands. Retarget the wind from wherever it is now toward the effect's
 * result, and ease into it over RAMP_S. Capturing `rampFrom` from the CURRENT
 * value (not the old target) means a speech mid-ramp is handled cleanly — the
 * wind bends from where it actually is, never teleports.
 */
export function applyEffect(s: WindState, effect: Effect, dir = 0, mag = 0): WindState {
  const from = baseWind(s);
  return {
    ...s,
    rampFrom: from,
    target: clampCap(effectTarget(from, effect, dir, mag)),
    rampElapsed: 0,
    rampDur: WIND.RAMP_S,
  };
}

/**
 * Arm the one gust. No-op if one has already been spent, or if `t` is inside
 * the opening EARLIEST_S of the session — an early gust reads as random weather
 * rather than a rare, earned shock. `strength` is signed by the caller.
 */
export function triggerGust(s: WindState, t: number, strength: number): WindState {
  if (s.gustsUsed >= WIND.GUST.PER_SESSION) return s;
  if (t < WIND.GUST.EARLIEST_S) return s;
  return {
    ...s,
    gust: { telegraph: WIND.GUST.TELEGRAPH_S, elapsed: 0, strength },
    gustsUsed: s.gustsUsed + 1,
  };
}

/**
 * Advance the wind by dt. Between speeches the settled target decays toward
 * zero; mid-ramp it eases toward the target (decay waits until it arrives, so
 * the 0.6s change is clean). The gust counts down its telegraph, then plays out
 * its pulse and clears itself.
 */
export function stepWind(s: WindState, dt: number): WindState {
  let { rampFrom, target, rampElapsed } = s;

  if (rampElapsed < s.rampDur) {
    rampElapsed = Math.min(s.rampDur, rampElapsed + dt);
    // If this step completes the ramp, snap the bookkeeping so `target` is the
    // settled value that decays from here.
    if (rampElapsed >= s.rampDur) rampFrom = target;
  } else {
    target *= Math.exp(-WIND.DECAY * dt);
    rampFrom = target;
  }

  let gust = s.gust;
  if (gust) {
    if (gust.telegraph > 0) {
      const telegraph = gust.telegraph - dt;
      gust = telegraph > 0 ? { ...gust, telegraph } : { ...gust, telegraph: 0, elapsed: 0 };
    } else {
      const elapsed = gust.elapsed + dt;
      gust = elapsed >= WIND.GUST.DURATION_S ? null : { ...gust, elapsed };
    }
  }

  return { ...s, rampFrom, target, rampElapsed, gust };
}
