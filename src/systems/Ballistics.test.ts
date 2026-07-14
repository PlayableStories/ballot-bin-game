import { describe, it, expect } from 'vitest';
import { launch, step, resolve, idealAngle, type Ballot, type Landing } from './Ballistics';
import { WIND, THROW, BIN } from '../config';

const DT = 1 / 60;

/** Fly a throw to its conclusion under a constant wind. */
function fly(power: number, theta: number, wind: number): { landing: Landing; flightTime: number } {
  let b: Ballot = launch(power, theta);
  b = { ...b, spin: 0 }; // determinism; spin is cosmetic

  for (let t = 0; t < 10; t += DT) {
    const next = step(b, wind, DT);
    const landing = resolve(b, next);
    if (landing.kind !== 'flying') return { landing, flightTime: t };
    b = next;
  }
  throw new Error('ballot never landed');
}

describe('the perfect throw, simulated', () => {
  it('goes in, dead centre, at power 1.0 with no wind', () => {
    expect(fly(1.0, 0, 0).landing.kind).toBe('in');
  });

  it('takes about 1.1 seconds — long enough to watch, short enough to feel snappy', () => {
    const { flightTime } = fly(1.0, 0, 0);
    expect(flightTime).toBeGreaterThan(0.9);
    expect(flightTime).toBeLessThan(1.3);
  });
});

describe('power is a light touch, not a skill', () => {
  /**
   * The bin is 6m away, so depth error scales hard with power: the window that
   * actually goes in is roughly −4% to +5.5%. That is far tighter than a human
   * thumb can hit, which is WHY THROW.POWER_EASE compresses the swipe down into
   * it. See the comment on that constant — this measurement changed the design.
   *
   * These tests pin the physics. `Throw.test.ts` pins what a real swipe does
   * with it, and that is the one that matters.
   */
  it('goes in across a narrow band around the perfect throw', () => {
    expect(fly(0.97, 0, 0).landing.kind).toBe('in');
    expect(fly(1.04, 0, 0).landing.kind).toBe('in');
  });

  it('punishes a badly under- or over-powered launch', () => {
    expect(fly(0.85, 0, 0).landing.kind).not.toBe('in'); // drops short
    expect(fly(1.2, 0, 0).landing.kind).not.toBe('in'); // sails long
  });
});

describe('THE INVARIANT, simulated: the strongest wind is always beatable', () => {
  /**
   * config.test.ts proves this in closed form. This proves it through the actual
   * integrator the game runs — including the discrete timestep and the real
   * catch test. If the two ever disagree, trust this one.
   *
   * If this goes red, the game has started arguing that voting is futile. That
   * is a lazier claim than the one we are making, and it is not one we make by
   * accident. See CONCEPT.md §6.
   */
  const winds: number[] = [];
  for (let w = -WIND.MAX; w <= WIND.MAX + 1e-9; w += WIND.MAX / 12) {
    winds.push(Math.round(w * 1000) / 1000);
  }

  it.each(winds)('wind %f m/s²: a legal swipe exists that lands it', (wind) => {
    const theta = idealAngle(wind);

    // The compensating angle must be inside what a thumb can actually express.
    expect(Math.abs(theta)).toBeLessThanOrEqual(THROW.MAX_ANGLE);

    expect(fly(1.0, theta, wind).landing.kind).toBe('in');
  });

  it('leaves headroom at the cap, so noise cannot make the worst case unwinnable', () => {
    const needed = Math.abs(idealAngle(WIND.MAX));
    expect(needed).toBeLessThan(THROW.MAX_ANGLE * 0.95);
  });

  it('still demands most of the available angle at the cap — the wind is not decorative', () => {
    const needed = Math.abs(idealAngle(WIND.MAX));
    expect(needed).toBeGreaterThan(THROW.MAX_ANGLE * 0.6);
  });
});

describe('wind actually matters', () => {
  it('blows an uncorrected throw out of the bin', () => {
    expect(fly(1.0, 0, WIND.MAX).landing.kind).not.toBe('in');
    expect(fly(1.0, 0, -WIND.MAX).landing.kind).not.toBe('in');
  });

  it('pushes the ballot downwind, not upwind', () => {
    const right = fly(1.0, 0, WIND.MAX).landing;
    expect(right.kind === 'floor' || right.kind === 'rim').toBe(true);
    if ('at' in right) expect(right.at.x).toBeGreaterThan(BIN.CATCH.lateral);
  });

  it('is gentle enough at a nudge that a straight throw survives', () => {
    // Otherwise every speech would be a wall, and the player would stop reading
    // the room and start guessing.
    expect(fly(1.0, 0, 0.4).landing.kind).toBe('in');
  });
});

describe('the catch test does not leak', () => {
  it('never tunnels the rim plane, even at max power', () => {
    // A fast ball must not skip past the rim between frames and land "on the
    // floor" behind the bin.
    const { landing } = fly(THROW.POWER_MAX, 0, 0);
    expect(landing.kind).not.toBe('in'); // it overshoots, correctly
    if (landing.kind === 'floor') expect(landing.at.z).toBeGreaterThan(BIN.z);
  });

  it('reports a rim clip rather than a clean miss when it is close', () => {
    // A wind just strong enough to push an uncorrected throw off the catch
    // window, but not clear of the bin. The near-miss must FEEL near.
    const landing = fly(1.0, 0, 0.65).landing;
    expect(landing.kind).toBe('rim');
  });
});
