import { describe, it, expect } from 'vitest';
import { describeEffect } from './Narration';
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
