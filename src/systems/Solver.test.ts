import { describe, it, expect } from 'vitest';
import { angleWindow, powerWindow, sweep, report } from './Solver';
import { WIND, THROW } from '../config';

/**
 * The tuning panel lets a human rewrite the game's constants live, on a phone.
 * That is the point of Stage 3 — and it is also a loaded gun.
 *
 * These tests are the safety catch. They do not check that the numbers are the
 * numbers we happen to have today; they check that whatever numbers come back
 * from a tuning session still describe a game that is possible to play and fair
 * to ask a human to play.
 */

describe('the game remains possible', () => {
  it('every wind the game can produce is beatable by some legal swipe', () => {
    for (const w of sweep(13)) {
      expect(w.reachable).toBe(true);
    }
  });

  it('the compensating swipe never exceeds what a thumb is allowed to express', () => {
    for (const w of sweep(13)) {
      const maxDeg = (THROW.MAX_ANGLE * 180) / Math.PI;
      expect(Math.abs(w.lo)).toBeLessThanOrEqual(maxDeg + 1e-6);
      expect(Math.abs(w.hi)).toBeLessThanOrEqual(maxDeg + 1e-6);
    }
  });
});

describe('the game remains humane', () => {
  /**
   * ⚠️ THIS TEST CURRENTLY FAILS BY DESIGN — see it.fails below.
   *
   * Measured at Stage 1, confirmed by a phone in a hand: with no wind at all, a
   * straight throw survives only ±3.2° of swipe error. A thumb pivots from a
   * joint and arcs by far more than that. The player is being punished for
   * anatomy, and cannot tell you why — they just say "it feels hard".
   *
   * The fix (halve THROW.LATERAL_GAIN, drop WIND.MAX to match) doubles the
   * window while preserving every design ratio. When it lands, flip `it.fails`
   * back to `it` and this becomes a permanent guard.
   *
   * It is written down as a FAILING TEST rather than a TODO because a TODO is a
   * note and a failing test is a debt.
   */
  const HUMANE_DEG = 8;

  it.fails(`gives the player at least ${HUMANE_DEG}° of angular slack, in calm air`, () => {
    expect(angleWindow(0).width).toBeGreaterThanOrEqual(HUMANE_DEG);
  });

  it('does not get MORE precise as the wind rises — difficulty comes from the read, not the thumb', () => {
    // The window may widen slightly with wind (the geometry is not symmetric),
    // but it must never narrow: a strong wind should demand a bigger correction,
    // not a finer one.
    const calm = angleWindow(0).width;
    for (const w of sweep(9)) {
      expect(w.width).toBeGreaterThanOrEqual(calm * 0.9);
    }
  });
});

describe('the wind is neither decorative nor tyrannical', () => {
  it('shifts the required swipe well away from straight, at full strength', () => {
    const w = angleWindow(WIND.MAX);
    // The whole band must sit off-centre: you cannot beat a gale by throwing straight.
    expect(w.hi).toBeLessThan(-5);
  });

  it('leaves a straight throw viable in calm air', () => {
    const w = angleWindow(0);
    expect(w.lo).toBeLessThanOrEqual(0);
    expect(w.hi).toBeGreaterThanOrEqual(0);
  });
});

describe('power stays a light touch', () => {
  it('is wide enough that the thumb is not the enemy, but not so wide it is free', () => {
    const p = powerWindow();
    expect(p.width).toBeGreaterThan(0.05);
    expect(p.width).toBeLessThan(0.4);
  });
});

describe('the report', () => {
  it('renders, and tells the truth about the current build', () => {
    const r = report();
    expect(r).toContain('swipe angle that lands the ballot');
    expect(r).toContain('VERDICT');
  });
});
