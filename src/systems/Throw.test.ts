import { describe, it, expect } from 'vitest';
import { readSwipe, addNoise, type Sample } from './Gesture';
import { launch, step, resolve, idealAngle, type Ballot } from './Ballistics';
import { WIND } from '../config';

/**
 * Gesture → Ballistics, end to end. A real thumb, a real flight, a real verdict.
 *
 * This file exists because Stage 1 measured something the unit tests could not
 * see: the physics and the gesture mapping were each perfectly correct, and
 * together they made the game unplayable. Four of five plausible swipes missed
 * on POWER, before the wind had said a word.
 *
 * Neither Gesture.test.ts nor Ballistics.test.ts could catch that on its own.
 * The seam between two correct systems is where games actually break.
 */

const DT = 1 / 60;
const H = 1280;

/** A swipe of the given pixel displacement, angle and duration. */
function swipe(upPx: number, sidePx: number, ms: number): Sample[] {
  return [
    { x: 360, y: 1100, t: 0 },
    { x: 360 + sidePx, y: 1100 - upPx, t: ms },
  ];
}

/** Read a swipe and fly it. No noise — we are testing the mapping, not the dice. */
function throwIt(samples: Sample[], wind: number): string {
  const t = readSwipe(samples, H);
  if (!t) return 'rejected';

  let b: Ballot = { ...launch(t.power, t.theta), spin: 0 };
  for (let i = 0; i < 600; i++) {
    const next = step(b, wind, DT);
    const landing = resolve(b, next);
    if (landing.kind !== 'flying') return landing.kind;
    b = next;
  }
  return 'never landed';
}

/** How a real hand actually swipes: a spread of strengths, none of them precise. */
const HUMAN_SWIPES: [string, Sample[]][] = [
  ['gentle', swipe(350, 0, 220)],
  ['normal', swipe(420, 0, 180)],
  ['brisk', swipe(500, 0, 150)],
  ['hard', swipe(600, 0, 120)],
  ['sharp flick', swipe(300, 0, 90)],
  ['long and slow', swipe(550, 0, 300)],
  ['short and fast', swipe(260, 0, 80)],
];

describe('THE THESIS, mechanised: with no wind, every vote reaches the count', () => {
  /**
   * This is the game's argument expressed as a test. In a windless room, casting
   * a vote is easy — any honest swipe lands it. ALL of the difficulty in this
   * game is political.
   *
   * If these start failing, the thumb has taken the game back from the room, and
   * the fix is THROW.POWER_EASE, not the test.
   */
  it.each(HUMAN_SWIPES)('a %s swipe goes in', (_name, samples) => {
    expect(throwIt(samples, 0)).toBe('in');
  });
});

describe('noise never robs a throw the player earned', () => {
  /**
   * The bug this test exists to prevent, caught in a browser at Stage 1 and
   * invisible to every test that came before it:
   *
   * The power window is only ~±5% wide. Throw noise was ±2%. So noise was eating
   * 40% of the window and knocking straight, well-judged throws out of the bin at
   * random — and the player would have blamed the WIND for it. A game about
   * reading the room cannot afford randomness that impersonates the room.
   */
  it('lands 200 identical honest swipes, every time, with no wind', () => {
    const samples = swipe(420, 0, 180);
    for (let i = 0; i < 200; i++) {
      const t = readSwipe(samples, H)!;
      const n = addNoise(t);

      let b: Ballot = { ...launch(n.power, n.theta), spin: 0 };
      let verdict = 'never landed';
      for (let k = 0; k < 600; k++) {
        const next = step(b, 0, DT);
        const landing = resolve(b, next);
        if (landing.kind !== 'flying') {
          verdict = landing.kind;
          break;
        }
        b = next;
      }
      expect(verdict).toBe('in');
    }
  });
});

describe('effort still matters at the edges', () => {
  it('a feeble prod drops the ballot short', () => {
    expect(throwIt(swipe(90, 0, 400), 0)).toBe('floor');
  });

  it('a flick too small to be a throw is rejected, and costs no ballot', () => {
    expect(throwIt(swipe(30, 0, 100), 0)).toBe('rejected');
  });
});

describe('the wind is the whole difficulty', () => {
  it('blows an ordinary, uncorrected swipe out of the bin', () => {
    expect(throwIt(swipe(420, 0, 180), WIND.MAX)).not.toBe('in');
    expect(throwIt(swipe(420, 0, 180), -WIND.MAX)).not.toBe('in');
  });

  it('rewards a player who reads the room and angles into it', () => {
    // The compensating angle, expressed as the sideways component of a real
    // swipe — which is all the player has.
    for (const wind of [-4.5, -3, -1.5, 1.5, 3, 4.5]) {
      const theta = idealAngle(wind);
      const up = 420;
      const side = Math.tan(theta) * up;
      expect(throwIt(swipe(up, side, 180), wind)).toBe('in');
    }
  });

  it('and the angle it demands is one a thumb can actually express', () => {
    // ~30° at the cap. A swipe, not a contortion.
    const deg = (Math.abs(idealAngle(WIND.MAX)) * 180) / Math.PI;
    expect(deg).toBeLessThan(34);
    expect(deg).toBeGreaterThan(15);
  });
});
