import { SESSION, WIND } from '../config';
import { predictWind, type Effect } from './Wind';
import raw from '../data/speeches.json';

/**
 * The speech scheduler — the thing that makes the wind political rather than
 * meteorological.
 *
 * Pure and deterministic: given a schedule, a time, the current wind, and a
 * source of randomness, it decides whether a candidate speaks and which line
 * they say. No Phaser, no clock, no `Math.random` buried inside — the caller
 * owns the RNG, so a session can be replayed exactly from a seed.
 *
 * The content lives in `../data/speeches.json`, entirely outside this file. A
 * future election is a data swap, not a code change.
 */

export type Candidate = 'STRONG_LEADER' | 'OUTSIDER';

export interface Speech {
  id: string;
  candidate: Candidate;
  text: string;
  effect: Effect;
  /** Read only by PUSH. */
  dir?: number;
  /** Read only by PUSH. */
  mag?: number;
  /** Bitmap words blown from the podium. Not assets — generated from this array. */
  words: string[];
}

/** The ten statements. Cast once, validated at runtime by Speeches.test.ts. */
export const SPEECHES: Speech[] = raw as unknown as Speech[];

export interface Schedule {
  /** Session time of the next speech. */
  nextAt: number;
  /** Ids already spoken — no line repeats within a session. */
  played: string[];
  /** The last (up to two) speakers, for the no-three-in-a-row rule. */
  recent: Candidate[];
  /** Latches true once the last speech has been scheduled or the pool is dry. */
  done: boolean;
}

export function initSchedule(): Schedule {
  return { nextAt: SESSION.FIRST_SPEECH_S, played: [], recent: [], done: false };
}

/** The lines that are legal to play right now, biased against runaway wind. */
function eligible(sch: Schedule, wind: number): Speech[] {
  const base = SPEECHES.filter(
    (s) =>
      !sch.played.includes(s.id) &&
      // Never the same candidate three times running.
      !(sch.recent.length >= 2 && sch.recent.every((c) => c === s.candidate)),
  );

  // When the room is near-saturated, prefer lines that would calm it. This is
  // what stops two shoves in a row from pinning the wind at the cap, where it
  // would stop being a thing the player reads and start being a wall.
  if (Math.abs(wind) >= WIND.MAX * 0.7) {
    const calming = base.filter(
      (s) => Math.abs(predictWind(wind, s.effect, s.dir ?? 0, s.mag ?? 0)) < Math.abs(wind),
    );
    if (calming.length) return calming;
  }

  return base;
}

/**
 * Does anyone speak at time `t`? Returns the line (or null) and the schedule to
 * carry forward. The caller always adopts the returned schedule — when nothing
 * is due it is the same object, so this is cheap to call every frame.
 *
 * `rand` is a 0..1 source owned by the caller, so a whole session is reproducible.
 */
export function nextSpeech(
  sch: Schedule,
  t: number,
  wind: number,
  rand: () => number,
): { speech: Speech | null; schedule: Schedule } {
  if (sch.done || t < sch.nextAt) return { speech: null, schedule: sch };

  // The room falls quiet for the final stretch; residual wind plays out alone.
  if (t >= SESSION.SPEECHES_STOP_S) return { speech: null, schedule: { ...sch, done: true } };

  const pool = eligible(sch, wind);
  if (pool.length === 0) return { speech: null, schedule: { ...sch, done: true } };

  const speech = pool[Math.min(pool.length - 1, Math.floor(rand() * pool.length))];

  const span = SESSION.SPEECH_GAP_S.max - SESSION.SPEECH_GAP_S.min;
  const nextAt = t + SESSION.SPEECH_GAP_S.min + rand() * span;

  return {
    speech,
    schedule: {
      nextAt,
      played: [...sch.played, speech.id],
      recent: [...sch.recent, speech.candidate].slice(-2),
      done: nextAt >= SESSION.SPEECHES_STOP_S,
    },
  };
}
