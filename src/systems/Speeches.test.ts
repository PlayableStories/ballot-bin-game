import { describe, it, expect } from 'vitest';
import {
  SPEECHES,
  initSchedule,
  nextSpeech,
  type Candidate,
  type Speech,
} from './Speeches';
import { SESSION, WIND } from '../config';

/** Deterministic RNG so a "session" is exactly reproducible. */
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const DT = 1 / 60;

/** Play a whole session with a fixed wind, collecting every line that fires. */
function playSession(seed: number, wind = 0): { t: number; speech: Speech }[] {
  const rand = mulberry32(seed);
  let sch = initSchedule();
  const fired: { t: number; speech: Speech }[] = [];
  for (let t = 0; t <= SESSION.DURATION_S; t += DT) {
    const r = nextSpeech(sch, t, wind, rand);
    sch = r.schedule;
    if (r.speech) fired.push({ t, speech: r.speech });
  }
  return fired;
}

describe('the speech data is well-formed', () => {
  it('is ten lines, five per candidate', () => {
    expect(SPEECHES).toHaveLength(10);
    const byCand = (c: Candidate) => SPEECHES.filter((s) => s.candidate === c);
    expect(byCand('STRONG_LEADER')).toHaveLength(5);
    expect(byCand('OUTSIDER')).toHaveLength(5);
  });

  it('has unique ids and non-empty words', () => {
    expect(new Set(SPEECHES.map((s) => s.id)).size).toBe(SPEECHES.length);
    for (const s of SPEECHES) expect(s.words.length).toBeGreaterThan(0);
  });

  it('covers all four effects, with a REVERSE in each candidate', () => {
    const effects = new Set(SPEECHES.map((s) => s.effect));
    for (const e of ['PUSH', 'AMPLIFY', 'DAMPEN', 'REVERSE']) expect(effects).toContain(e);

    for (const c of ['STRONG_LEADER', 'OUTSIDER'] as Candidate[]) {
      const reverses = SPEECHES.filter((s) => s.candidate === c && s.effect === 'REVERSE');
      expect(reverses.length).toBeGreaterThanOrEqual(1);
    }
  });

  it('gives every PUSH a direction and magnitude, and no other effect one', () => {
    for (const s of SPEECHES) {
      if (s.effect === 'PUSH') {
        expect(typeof s.dir).toBe('number');
        expect(typeof s.mag).toBe('number');
        expect(Math.abs(s.dir!)).toBe(1);
      } else {
        expect(s.dir).toBeUndefined();
        expect(s.mag).toBeUndefined();
      }
    }
  });
});

describe('the scheduler obeys the design rules', () => {
  it('says the first line at exactly FIRST_SPEECH_S, not before', () => {
    const rand = () => 0.5;
    let sch = initSchedule();
    expect(nextSpeech(sch, SESSION.FIRST_SPEECH_S - DT, 0, rand).speech).toBeNull();
    const due = nextSpeech(sch, SESSION.FIRST_SPEECH_S, 0, rand);
    expect(due.speech).not.toBeNull();
  });

  it('spaces speeches 5–8s apart, across many seeds', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const fired = playSession(seed);
      expect(fired[0].t).toBeCloseTo(SESSION.FIRST_SPEECH_S, 1);
      for (let i = 1; i < fired.length; i++) {
        const gap = fired[i].t - fired[i - 1].t;
        expect(gap).toBeGreaterThanOrEqual(SESSION.SPEECH_GAP_S.min - DT);
        expect(gap).toBeLessThanOrEqual(SESSION.SPEECH_GAP_S.max + DT);
      }
    }
  });

  it('never repeats a line and never lets a candidate speak three times running', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const fired = playSession(seed);
      const ids = fired.map((f) => f.speech.id);
      expect(new Set(ids).size).toBe(ids.length);

      for (let i = 2; i < fired.length; i++) {
        const three = [fired[i - 2], fired[i - 1], fired[i]].map((f) => f.speech.candidate);
        expect(new Set(three).size).toBeGreaterThan(1);
      }
    }
  });

  it('falls silent before SPEECHES_STOP_S, leaving residual wind to play out', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const fired = playSession(seed);
      for (const f of fired) expect(f.t).toBeLessThan(SESSION.SPEECHES_STOP_S);
    }
  });

  it('enforces the three-in-a-row rule directly', () => {
    // With the last two speakers both the Strong Leader, only the Outsider may speak.
    const sch = {
      nextAt: 10,
      played: [],
      recent: ['STRONG_LEADER', 'STRONG_LEADER'] as Candidate[],
      done: false,
    };
    for (let seed = 1; seed <= 20; seed++) {
      const out = nextSpeech(sch, 10, 0, mulberry32(seed));
      expect(out.speech?.candidate).toBe('OUTSIDER');
    }
  });
});

describe('the scheduler leans against a runaway wind', () => {
  it('picks a calming line when the room is pinned at the cap', () => {
    // Fresh schedule, wind at maximum: the only legal picks should be ones that
    // REDUCE the magnitude — never another shove in the same direction.
    for (let seed = 1; seed <= 30; seed++) {
      const out = nextSpeech(initSchedule(), 10, WIND.MAX, mulberry32(seed));
      const s = out.speech!;
      // A same-direction PUSH or an AMPLIFY at the cap would keep it pinned; those
      // must not be chosen while calmer options exist.
      const escalates =
        s.effect === 'AMPLIFY' || (s.effect === 'PUSH' && (s.dir ?? 0) > 0);
      expect(escalates).toBe(false);
    }
  });
});
