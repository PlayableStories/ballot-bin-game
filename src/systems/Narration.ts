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

/**
 * The count screen's closing line — the last word, and the only place the game
 * speaks to the player directly rather than about the room.
 *
 * It reads the result and answers with a short, pointed line that pushes turnout.
 * Deliberately NOT a grade: no "you win/lose", no stars — the sting is civic,
 * carried through the same wind metaphor as everything else (CONCEPT.md §11).
 *
 * A priority cascade: whether anyone voted, then whether enough did, and only
 * then how the count split. A thin turnout gets the turnout line even if the
 * bin happened to win — low participation is the point being made, not the ratio.
 */
export function closingLine(inBin: number, onFloor: number): string {
  const thrown = inBin + onFloor;
  if (thrown === 0) return "Nothing cast. Don't leave it to the wind.";
  if (thrown < 10) return 'Low turnout feeds the wind. Cast more.';
  if (inBin > onFloor) return 'More landed than blew away. Keep voting.';
  if (onFloor > inBin) return 'The wind took most. Out-vote it.';
  return 'A draw. One more vote wins it.';
}
