import { WIND, THROW } from '../config';
import { launch, step, resolve, type Ballot } from './Ballistics';

/**
 * The instrument that turns "it feels a bit hard" into a number.
 *
 * A playtester can only ever tell you that something is wrong. This tells you
 * how wrong, in degrees. Both of Stage 1's bugs were invisible until they were
 * measured, and both were obvious the moment they were.
 *
 * Pure. No Phaser. Runs in a test, in a script, or live behind the tuning panel.
 */

const DT = 1 / 60;

export type Verdict = 'in' | 'rim' | 'floor' | 'never';

/** Fly one throw to its conclusion. */
export function simulate(power: number, theta: number, wind: number): Verdict {
  let b: Ballot = { ...launch(power, theta), spin: 0 };
  for (let i = 0; i < 900; i++) {
    const next = step(b, wind, DT);
    const landing = resolve(b, next);
    if (landing.kind !== 'flying') return landing.kind;
    b = next;
  }
  return 'never';
}

export interface AngleWindow {
  wind: number;
  /** Degrees. NaN if no legal swipe lands it at all. */
  lo: number;
  hi: number;
  /** Degrees of slack the player actually has. THIS is the difficulty number. */
  width: number;
  /** Does the required swipe fit inside the legal range at all? */
  reachable: boolean;
}

/**
 * For a given wind, the band of swipe angles that lands the ballot.
 *
 * `width` is the number that decides whether the game is humane. A thumb does
 * not travel in a straight line — it pivots from a joint, so it arcs. Anything
 * under about 8° is asking for precision the hand does not have on glass, and
 * the player will feel it as unfairness without being able to say why.
 */
export function angleWindow(wind: number, power = 1.0, stepDeg = 0.05): AngleWindow {
  const maxDeg = (THROW.MAX_ANGLE * 180) / Math.PI;
  let lo = NaN;
  let hi = NaN;

  for (let d = -maxDeg; d <= maxDeg; d += stepDeg) {
    if (simulate(power, (d * Math.PI) / 180, wind) === 'in') {
      if (Number.isNaN(lo)) lo = d;
      hi = d;
    }
  }

  const reachable = !Number.isNaN(lo);
  return {
    wind,
    lo,
    hi,
    width: reachable ? hi - lo : 0,
    reachable,
  };
}

/** The band of throw powers that lands it, at a given wind and swipe angle. */
export function powerWindow(wind = 0, theta = 0): { lo: number; hi: number; width: number } {
  let lo = NaN;
  let hi = NaN;
  for (let p = THROW.POWER_MIN; p <= THROW.POWER_MAX; p += 0.002) {
    if (simulate(p, theta, wind) === 'in') {
      if (Number.isNaN(lo)) lo = p;
      hi = p;
    }
  }
  const ok = !Number.isNaN(lo);
  return { lo, hi, width: ok ? hi - lo : 0 };
}

/** Sweep the whole wind range. The difficulty curve of the entire game, in one call. */
export function sweep(steps = 7): AngleWindow[] {
  const out: AngleWindow[] = [];
  for (let i = 0; i < steps; i++) {
    const wind = -WIND.MAX + (2 * WIND.MAX * i) / (steps - 1);
    out.push(angleWindow(Math.round(wind * 100) / 100));
  }
  return out;
}

/** Human-readable report. Printed by `npm run solve`, and shown live in the panel. */
export function report(): string {
  const lines: string[] = [];
  const pw = powerWindow();

  lines.push('BALLOT / WASTE — playability report');
  lines.push('');
  lines.push(
    `power window (no wind):  ${pw.lo.toFixed(3)} .. ${pw.hi.toFixed(3)}` +
      `   (${((pw.lo - 1) * 100).toFixed(1)}% .. +${((pw.hi - 1) * 100).toFixed(1)}%)`,
  );
  lines.push('');
  lines.push('swipe angle that lands the ballot:');
  lines.push('');
  lines.push('   wind   from      to      window    verdict');

  for (const w of sweep(7)) {
    if (!w.reachable) {
      lines.push(`  ${w.wind.toFixed(2).padStart(5)}    —        —        —        UNBEATABLE`);
      continue;
    }
    const verdict = w.width < 6 ? 'BRUTAL' : w.width < 8 ? 'tight' : 'ok';
    lines.push(
      `  ${w.wind.toFixed(2).padStart(5)}  ` +
        `${w.lo.toFixed(1).padStart(6)}°  ${w.hi.toFixed(1).padStart(6)}°  ` +
        `${w.width.toFixed(1).padStart(6)}°   ${verdict}`,
    );
  }

  const calm = angleWindow(0);
  lines.push('');
  lines.push(
    `A thumb pivots from a joint and arcs. It cannot hold ±${(calm.width / 2).toFixed(1)}°.`,
  );
  lines.push(
    calm.width < 8
      ? 'VERDICT: the input resolution is finer than the instrument. Players are being punished for anatomy.'
      : 'VERDICT: the throw is within human motor precision.',
  );

  return lines.join('\n');
}
