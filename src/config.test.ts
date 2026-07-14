import { describe, it, expect } from 'vitest';
import { WORLD, BIN, THROW, WIND } from './config';

/**
 * These are not unit tests. They are the design's load-bearing claims, written
 * as assertions so that a tuning pass three weeks from now cannot quietly break
 * the argument the game is making.
 *
 * If one of these goes red, do not "fix the test". Go and read CONCEPT.md §6.
 */

/** Flight time from the hand to the bin rim, for a given power. Closed form. */
function flightTime(power: number): number {
  const vy = power * THROW.V_UP;
  const dy = WORLD.ORIGIN.y - BIN.RIM_Y; // fall distance to the rim
  // Solve ½·g·t² − vy·t − dy = 0 for the descending root.
  const a = 0.5 * WORLD.GRAVITY;
  return (vy + Math.sqrt(vy * vy + 4 * a * dy)) / (2 * a);
}

describe('the perfect throw', () => {
  it('lands dead centre in the bin at power 1.0, with no wind', () => {
    const t = flightTime(1.0);
    const z = 1.0 * THROW.V_FWD * t;

    expect(z).toBeCloseTo(BIN.z, 1);
    expect(Math.abs(z - BIN.z)).toBeLessThan(BIN.CATCH.depth);
  });

  it('arcs high enough to be read, but not into the ceiling', () => {
    const apex = WORLD.ORIGIN.y + (THROW.V_UP * THROW.V_UP) / (2 * WORLD.GRAVITY);
    expect(apex).toBeGreaterThan(2.0); // visible travel, not a flat line drive
    expect(apex).toBeLessThan(3.0); // under the room ceiling
  });
});

describe('THE INVARIANT: the strongest wind is always beatable', () => {
  /**
   * If this fails, the game has started arguing that voting is futile — which is
   * a lazier and less true claim than the one we are making. See config.ts WIND.MAX.
   */
  it('gives max counter-steer more lateral travel than max wind drift', () => {
    const t = flightTime(1.0);

    // Drift from a constant wind held for the whole flight: ½·W·t²
    const worstDrift = 0.5 * WIND.MAX * t * t;

    // Lateral travel available from the most extreme legal swipe.
    const vx = Math.sin(THROW.MAX_ANGLE) * (1.0 * THROW.V_FWD) * THROW.LATERAL_GAIN;
    const maxCounter = vx * t;

    expect(maxCounter).toBeGreaterThan(worstDrift);
  });

  it('keeps a real margin, not a rounding error', () => {
    const t = flightTime(1.0);
    const worstDrift = 0.5 * WIND.MAX * t * t;
    const maxCounter =
      Math.sin(THROW.MAX_ANGLE) * THROW.V_FWD * THROW.LATERAL_GAIN * t;

    // At least 10% headroom, so throw noise cannot make the worst case unwinnable.
    expect(maxCounter / worstDrift).toBeGreaterThan(1.1);
  });

  it('is not beatable so easily that the wind stops mattering', () => {
    const t = flightTime(1.0);
    const worstDrift = 0.5 * WIND.MAX * t * t;
    const maxCounter =
      Math.sin(THROW.MAX_ANGLE) * THROW.V_FWD * THROW.LATERAL_GAIN * t;

    // A max-wind throw must demand most of the available angle. If this ratio
    // climbed, the wind would be decorative.
    expect(maxCounter / worstDrift).toBeLessThan(1.6);
  });
});

describe('THE ASYMMETRY: wind-reading is the skill, not throw strength', () => {
  it('forgives depth error more than lateral error', () => {
    expect(BIN.CATCH.depth).toBeGreaterThan(BIN.CATCH.lateral);
  });

  it('forgives depth by a wide enough margin to matter', () => {
    // Sloppy power should survive. A bad wind read should not.
    expect(BIN.CATCH.depth / BIN.CATCH.lateral).toBeGreaterThan(1.5);
  });

  it('lets the near-miss window sit outside the catch window, so rim hits feel near', () => {
    expect(BIN.RIM_HIT.depth).toBeGreaterThan(BIN.CATCH.depth);
    expect(BIN.RIM_HIT.lateral).toBeGreaterThan(BIN.CATCH.lateral);
  });
});

describe('wind persistence', () => {
  it('decays slowly enough to survive across several throws', () => {
    const halfLife = Math.log(2) / WIND.DECAY;
    // A throw cycle is ~5s. Wind that halved faster than that would reset every
    // throw, and the game would be Paper Toss with a costume on.
    expect(halfLife).toBeGreaterThan(4);
    expect(halfLife).toBeLessThan(10);
  });
});
