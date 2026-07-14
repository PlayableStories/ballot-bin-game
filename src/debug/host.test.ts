import { describe, it, expect } from 'vitest';
import { isDevHost } from './TuningPanel';

/**
 * The tuning panel is dev-only, and Stage 3's whole point is tuning ON A PHONE.
 * A phone reaches the dev server by LAN IP, not localhost — so the host gate has
 * to recognise private-range addresses as dev, while keeping the panel off the
 * public production site.
 *
 * The first version failed this exact case: the panel was invisible on the one
 * device it existed for. Headless tests missed it because they hit localhost.
 */

describe('the tuning panel shows on dev hosts', () => {
  it.each(['localhost', '127.0.0.1', 'williams-mac.local'])('%s', (h) => {
    expect(isDevHost(h)).toBe(true);
  });

  it.each([
    '172.20.10.5', // a phone on a hotspot — the case that was broken
    '192.168.1.42',
    '10.0.0.7',
    '169.254.13.9',
    '172.16.0.1',
    '172.31.255.254',
  ])('LAN IP %s', (h) => {
    expect(isDevHost(h)).toBe(true);
  });
});

describe('but never in production', () => {
  it.each([
    'playablestories.github.io', // the live site
    'ballot-waste.example.com',
    '172.15.0.1', // just outside the private range
    '172.32.0.1', // just outside the private range
    '8.8.8.8',
  ])('%s', (h) => {
    expect(isDevHost(h)).toBe(false);
  });
});
