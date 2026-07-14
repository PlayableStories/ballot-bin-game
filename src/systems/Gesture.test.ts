import { describe, it, expect } from 'vitest';
import { readSwipe, addNoise, type Sample } from './Gesture';
import { THROW } from '../config';

const H = 1280;

/** A swipe of the given pixel displacement over the given duration. */
function swipe(dx: number, dy: number, ms: number): Sample[] {
  return [
    { x: 360, y: 1100, t: 0 },
    { x: 360 + dx, y: 1100 - dy, t: ms },
  ];
}

describe('what counts as a throw', () => {
  it('rejects a tap', () => {
    expect(readSwipe(swipe(0, 0, 50), H)).toBeNull();
  });

  it('rejects a downward swipe', () => {
    expect(readSwipe(swipe(0, -300, 200), H)).toBeNull();
  });

  it('rejects a barely-there flick', () => {
    expect(readSwipe(swipe(0, 30, 100), H)).toBeNull();
  });

  it('rejects a slow drag — that is aiming, and this game has no aiming', () => {
    expect(readSwipe(swipe(0, 400, 900), H)).toBeNull();
  });

  it('accepts a decisive upward swipe', () => {
    expect(readSwipe(swipe(0, 400, 200), H)).not.toBeNull();
  });
});

describe('angle', () => {
  it('reads a straight swipe as straight', () => {
    expect(readSwipe(swipe(0, 400, 200), H)!.theta).toBeCloseTo(0, 5);
  });

  it('reads rightward lean as positive', () => {
    expect(readSwipe(swipe(120, 400, 200), H)!.theta).toBeGreaterThan(0);
  });

  it('reads leftward lean as negative', () => {
    expect(readSwipe(swipe(-120, 400, 200), H)!.theta).toBeLessThan(0);
  });

  it('clamps a wild sideways swipe to the legal maximum', () => {
    const t = readSwipe(swipe(900, 200, 200), H)!;
    expect(Math.abs(t.theta)).toBeLessThanOrEqual(THROW.MAX_ANGLE + 1e-9);
  });
});

describe('power', () => {
  it('stays inside the legal range however hard you flick', () => {
    const wild = readSwipe(swipe(0, 2000, 20), H)!;
    expect(wild.power).toBeLessThanOrEqual(THROW.POWER_MAX);

    const feeble = readSwipe(swipe(0, 70, 480), H)!;
    expect(feeble.power).toBeGreaterThanOrEqual(THROW.POWER_MIN);
  });

  it('rewards a longer swipe with more power', () => {
    const short = readSwipe(swipe(0, 200, 200), H)!;
    const long = readSwipe(swipe(0, 500, 200), H)!;
    expect(long.power).toBeGreaterThan(short.power);
  });

  it('rewards a faster swipe with more power', () => {
    const slow = readSwipe(swipe(0, 400, 400), H)!;
    const fast = readSwipe(swipe(0, 400, 100), H)!;
    expect(fast.power).toBeGreaterThan(slow.power);
  });

  it('clusters ordinary swipes near the sweet spot, so the thumb is not the enemy', () => {
    // A normal, unremarkable flick should be close to a perfect throw. The wind
    // is meant to be the difficulty; power is not.
    const ordinary = readSwipe(swipe(0, 400, 180), H)!;
    expect(ordinary.power).toBeGreaterThan(0.85);
    expect(ordinary.power).toBeLessThan(1.15);
  });
});

describe('noise', () => {
  it('perturbs a throw without ever exceeding the legal angle', () => {
    const base = { power: 1.0, theta: THROW.MAX_ANGLE };
    for (let i = 0; i < 200; i++) {
      const n = addNoise(base);
      expect(Math.abs(n.theta)).toBeLessThanOrEqual(THROW.MAX_ANGLE + 1e-9);
    }
  });

  it('stays small enough that a correct read is never robbed', () => {
    const base = { power: 1.0, theta: 0 };
    const worst = addNoise(base, () => 3); // a 3-sigma outlier
    expect(Math.abs(worst.power - 1)).toBeLessThan(0.1);
  });
});
