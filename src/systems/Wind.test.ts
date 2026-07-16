import { describe, it, expect } from 'vitest';
import {
  initWind,
  applyEffect,
  stepWind,
  triggerGust,
  windValue,
  baseWind,
  gustWind,
  gustPhase,
  type WindState,
} from './Wind';
import { WIND } from '../config';

const DT = 1 / 60;

/** Advance the wind by `seconds`, at the game's fixed step. */
function run(s: WindState, seconds: number): WindState {
  const steps = Math.round(seconds / DT);
  let cur = s;
  for (let i = 0; i < steps; i++) cur = stepWind(cur, DT);
  return cur;
}

/** Settle a speech: apply it, then let its 0.6s ramp finish (and nothing more). */
function settle(s: WindState): WindState {
  return run(s, WIND.RAMP_S);
}

describe('the wind starts calm', () => {
  it('is zero, with no gust, before anything speaks', () => {
    const s = initWind();
    expect(windValue(s)).toBe(0);
    expect(baseWind(s)).toBe(0);
    expect(gustPhase(s)).toBe('none');
  });
});

describe('a speech eases the wind to a new target, never snaps to it', () => {
  it('reaches the PUSH target only after the full ramp', () => {
    const pushed = applyEffect(initWind(), 'PUSH', 1, 3.0);

    // Immediately after the speech, the room has barely begun to move.
    expect(baseWind(pushed)).toBeCloseTo(0, 5);

    // Half-way through the ramp it is well on its way but not there yet.
    const mid = run(pushed, WIND.RAMP_S / 2);
    expect(baseWind(mid)).toBeGreaterThan(0);
    expect(baseWind(mid)).toBeLessThan(3.0);

    // After the ramp it has arrived.
    expect(baseWind(settle(pushed))).toBeCloseTo(3.0, 1);
  });

  it('bends from where it currently is when a speech interrupts a ramp', () => {
    // Start a push, then reverse it before the first ramp has finished.
    const a = applyEffect(initWind(), 'PUSH', 1, 3.0);
    const mid = run(a, WIND.RAMP_S / 2);
    const from = baseWind(mid);
    const b = applyEffect(mid, 'PUSH', -1, 3.0);
    // The new ramp starts from the interrupted value, not from 0 and not from 3.
    expect(baseWind(b)).toBeCloseTo(from, 5);
  });
});

describe('the four effects do what the design says', () => {
  it('PUSH adds a signed magnitude', () => {
    const s = settle(applyEffect(initWind(), 'PUSH', -1, 3.0));
    expect(baseWind(s)).toBeCloseTo(-3.0, 1);
  });

  it('AMPLIFY escalates an existing wind, and does nothing to a calm room', () => {
    const calm = settle(applyEffect(initWind(), 'AMPLIFY'));
    expect(baseWind(calm)).toBeCloseTo(0, 5);

    const windy = settle(applyEffect(initWind(), 'PUSH', 1, 2.0));
    const louder = settle(applyEffect(windy, 'AMPLIFY'));
    expect(baseWind(louder)).toBeCloseTo(2.0 * WIND.AMPLIFY, 1);
  });

  it('DAMPEN calms the room toward the centre', () => {
    const windy = settle(applyEffect(initWind(), 'PUSH', 1, 4.0));
    const calmer = settle(applyEffect(windy, 'DAMPEN'));
    expect(baseWind(calmer)).toBeCloseTo(4.0 * WIND.DAMPEN, 1);
    expect(Math.abs(baseWind(calmer))).toBeLessThan(4.0);
  });

  it('REVERSE turns the room — the sign flips', () => {
    const windy = settle(applyEffect(initWind(), 'PUSH', 1, 3.0));
    const turned = settle(applyEffect(windy, 'REVERSE'));
    expect(baseWind(turned)).toBeCloseTo(3.0 * WIND.REVERSE, 1);
    expect(baseWind(turned)).toBeLessThan(0);
  });
});

describe('the wind cannot exceed the beatable cap', () => {
  it('clamps a PUSH beyond the cap down to it', () => {
    const s = settle(applyEffect(initWind(), 'PUSH', 1, 100));
    expect(baseWind(s)).toBeCloseTo(WIND.MAX, 5);
  });

  it('clamps an AMPLIFY that would overshoot the cap', () => {
    const windy = settle(applyEffect(initWind(), 'PUSH', 1, 3.0));
    const louder = settle(applyEffect(windy, 'AMPLIFY')); // 3.0 * 1.6 = 4.8 > 4.5
    expect(baseWind(louder)).toBeCloseTo(WIND.MAX, 5);
  });
});

describe('a room left alone decays back toward calm', () => {
  it('halves over the documented half-life (~5.8s)', () => {
    const halfLife = Math.LN2 / WIND.DECAY;
    const windy = settle(applyEffect(initWind(), 'PUSH', 1, 4.0));
    const later = run(windy, halfLife);
    expect(baseWind(later)).toBeCloseTo(2.0, 1);
  });

  it('does not decay while a speech is still ramping in', () => {
    // Sampled at exactly the end of the ramp, the value is the target with no
    // decay eaten out of it — decay only begins once the room has settled.
    const pushed = applyEffect(initWind(), 'PUSH', 1, 3.0);
    expect(baseWind(settle(pushed))).toBeCloseTo(3.0, 2);
  });
});

describe('the one gust', () => {
  it('is refused inside the opening of the session', () => {
    const early = triggerGust(initWind(), WIND.GUST.EARLIEST_S - 1, WIND.GUST.STRENGTH);
    expect(early.gust).toBeNull();
    expect(gustPhase(early)).toBe('none');
  });

  it('telegraphs before it applies any force to the ball', () => {
    const armed = triggerGust(initWind(), WIND.GUST.EARLIEST_S + 5, WIND.GUST.STRENGTH);
    expect(gustPhase(armed)).toBe('telegraph');
    // During the warning the room reacts but the ball feels nothing extra.
    expect(gustWind(armed)).toBe(0);
    expect(windValue(armed)).toBeCloseTo(baseWind(armed), 5);
  });

  it('peaks near its signed strength, then clears itself', () => {
    let s = triggerGust(initWind(), WIND.GUST.EARLIEST_S + 5, WIND.GUST.STRENGTH);

    // Walk through telegraph + pulse, recording the strongest force seen.
    let peak = 0;
    const total = WIND.GUST.TELEGRAPH_S + WIND.GUST.DURATION_S + 0.2;
    const steps = Math.round(total / DT);
    for (let i = 0; i < steps; i++) {
      s = stepWind(s, DT);
      peak = Math.max(peak, gustWind(s));
    }

    expect(peak).toBeCloseTo(WIND.GUST.STRENGTH, 1);
    // Once the pulse is spent, the gust is gone for good.
    expect(s.gust).toBeNull();
    expect(gustPhase(s)).toBe('none');
  });

  it('happens at most once per session', () => {
    const first = triggerGust(initWind(), WIND.GUST.EARLIEST_S + 5, WIND.GUST.STRENGTH);
    const second = triggerGust(first, WIND.GUST.EARLIEST_S + 30, WIND.GUST.STRENGTH);
    expect(second.gustsUsed).toBe(1);
    expect(second.gust).toBe(first.gust);
  });

  it('stacks on top of the political wind while it blows', () => {
    const windy = settle(applyEffect(initWind(), 'PUSH', 1, 2.0));
    let s = triggerGust(windy, WIND.GUST.EARLIEST_S + 5, WIND.GUST.STRENGTH);
    s = run(s, WIND.GUST.TELEGRAPH_S + WIND.GUST.DURATION_S / 2); // into the pulse
    expect(windValue(s)).toBeCloseTo(baseWind(s) + gustWind(s), 5);
    expect(gustWind(s)).toBeGreaterThan(0);
  });
});
