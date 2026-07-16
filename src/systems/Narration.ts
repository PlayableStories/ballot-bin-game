import type { Effect } from './Wind';

/**
 * The commentary track.
 *
 * The politician says a line; this says what the line just did to the room, in
 * plain words — the "comment appears to explain what is happening" half of the
 * beat. It is deliberately NOT the speech: the speech is rhetoric, this is the
 * consequence, and keeping them as two separate voices is the whole point.
 *
 * Pure. No Phaser — so the copy is unit-testable and lives beside the wind model
 * it describes, not inside the scene that renders it.
 */
export function describeEffect(effect: Effect, dir = 0): string {
  switch (effect) {
    case 'PUSH':
      return dir >= 0
        ? 'The wind picks up, pushing right.'
        : 'The wind picks up, pushing left.';
    case 'AMPLIFY':
      return 'The room escalates — the wind grows.';
    case 'DAMPEN':
      return 'The shouting settles — the wind eases.';
    case 'REVERSE':
      return 'The room turns — the wind flips.';
  }
}
