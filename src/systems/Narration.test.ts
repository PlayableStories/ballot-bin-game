import { describe, it, expect } from 'vitest';
import { describeEffect, closingLine } from './Narration';
import type { Effect } from './Wind';

describe('the effect commentary', () => {
  const EFFECTS: Effect[] = ['PUSH', 'AMPLIFY', 'DAMPEN', 'REVERSE'];

  it('gives every effect a non-empty line', () => {
    for (const e of EFFECTS) {
      expect(describeEffect(e, 1).length).toBeGreaterThan(0);
    }
  });

  it('distinguishes the two push directions', () => {
    expect(describeEffect('PUSH', 1)).not.toBe(describeEffect('PUSH', -1));
    expect(describeEffect('PUSH', 1)).toMatch(/right/);
    expect(describeEffect('PUSH', -1)).toMatch(/left/);
  });

  it('reads as consequence, not rhetoric — each effect says something different', () => {
    const lines = new Set([
      describeEffect('PUSH', 1),
      describeEffect('AMPLIFY'),
      describeEffect('DAMPEN'),
      describeEffect('REVERSE'),
    ]);
    expect(lines.size).toBe(4);
  });
});

describe('the closing line reads the result', () => {
  it('names the five situations by the cascade', () => {
    expect(closingLine(0, 0)).toBe("Nothing cast. Don't leave it to the wind.");
    expect(closingLine(3, 2)).toBe('Low turnout feeds the wind. Cast more.'); // 5 < 10
    expect(closingLine(8, 4)).toBe('More landed than blew away. Keep voting.'); // 12, bin>floor
    expect(closingLine(4, 8)).toBe('The wind took most. Out-vote it.'); // 12, floor>bin
    expect(closingLine(6, 6)).toBe('A draw. One more vote wins it.'); // 12, tie
  });

  it('gates turnout before the split — a thin session gets the turnout line even when the bin wins', () => {
    // 6 in bin, 1 on floor: bin "wins", but only 7 votes cast → turnout, not the split.
    expect(closingLine(6, 1)).toBe('Low turnout feeds the wind. Cast more.');
  });

  it('draws the line at exactly ten votes', () => {
    expect(closingLine(5, 4)).toBe('Low turnout feeds the wind. Cast more.'); // 9 < 10
    expect(closingLine(5, 5)).toBe('A draw. One more vote wins it.'); // 10, tie
  });

  it('every situation yields a distinct, non-empty line', () => {
    const lines = [
      closingLine(0, 0),
      closingLine(3, 2),
      closingLine(8, 4),
      closingLine(4, 8),
      closingLine(6, 6),
    ];
    for (const l of lines) expect(l.length).toBeGreaterThan(0);
    expect(new Set(lines).size).toBe(5);
  });
});
