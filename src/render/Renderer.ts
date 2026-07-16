import type Phaser from 'phaser';
import type { Ballot } from '../systems/Ballistics';
import type { Vec3 } from '../systems/Projection';
import type { Candidate } from '../systems/Speeches';
import type { GustPhase } from '../systems/Wind';

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
  /** Build the static world: room, floor, lane, bin, podiums, indicators. Called once. */
  create(scene: Phaser.Scene): void;

  /** The ballot in flight, or in the hand, or nothing at all between throws. */
  drawBallot(ballot: Ballot | null): void;

  /** A ballot has come to rest. It stays for the session — the room accumulates a record. */
  addLanded(at: Vec3): void;

  /**
   * Per-frame: the room reacts to the wind. Bunting leans, leaflets drift, the
   * hanging sign swings, the gust telegraphs. `windNorm` is W / WIND.MAX in
   * [-1, 1]; this IS the wind meter — there is no numeric one, ever.
   */
  updateRoom(dt: number, windNorm: number, gust: GustPhase): void;

  /**
   * Event: a candidate is speaking. Light their podium and blow their slogan
   * words out into the room. The words come from the speech data, not an asset.
   */
  speak(candidate: Candidate, words: string[]): void;

  reset(): void;
}
