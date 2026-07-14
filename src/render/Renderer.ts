import type Phaser from 'phaser';
import type { Ballot } from '../systems/Ballistics';
import type { Vec3 } from '../systems/Projection';

/**
 * THE SEAM.
 *
 * Game logic never touches a sprite. It hands the renderer world coordinates and
 * says "a ballot is here"; the renderer decides whether that resolves to a grey
 * box (Stage 1), a flat-shaded polygon (Stage 4), or a PNG (Stage 5, if we buy
 * art).
 *
 * This is the one architectural decision in IMPLEMENTATION-PLAN.md that has to
 * be made early, because it is what keeps the art path reversible. Without it,
 * the choice between code-drawn and generated art calcifies in week one and gets
 * expensive to change. With it, swapping the art is swapping one class.
 */
export interface Renderer {
  /** Build the static world: room, floor, lane, bin. Called once. */
  create(scene: Phaser.Scene): void;

  /** The ballot in flight, or in the hand, or nothing at all between throws. */
  drawBallot(ballot: Ballot | null): void;

  /** A ballot has come to rest. It stays for the session — the room accumulates a record. */
  addLanded(at: Vec3): void;

  /** Wind, normalised to [-1, 1]. Stage 1 ignores it; Stage 2 is where the room reacts. */
  setWind(normalised: number): void;

  reset(): void;
}
