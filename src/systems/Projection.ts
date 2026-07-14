import { CAMERA, SCREEN } from '../config';

/** A point in the room. Metres. +x right, +y up, +z away from the player. */
export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

/** Where that point lands on the screen, and how big it should be drawn. */
export interface Projected {
  x: number;
  y: number;
  /** Multiply any world size by this to get pixels. Falls off with distance. */
  scale: number;
}

const HORIZON = SCREEN.H * CAMERA.HORIZON_FRAC;

/**
 * The entire depth illusion, in four lines.
 *
 * Things further away are smaller and closer to the horizon. That is all
 * perspective is, and it is all this game needs — there is one camera, it never
 * moves during play, and it looks straight down the room.
 */
export function project(p: Vec3): Projected {
  const depth = p.z + CAMERA.BACK;
  const scale = CAMERA.FOCAL / Math.max(depth, 0.05);

  return {
    x: SCREEN.W / 2 + p.x * scale * CAMERA.PPM,
    y: HORIZON + (CAMERA.EYE_Y - p.y) * scale * CAMERA.PPM,
    scale,
  };
}

/**
 * The shadow is the ball's ground position — same x and z, but on the floor.
 *
 * This is the primary depth cue in the whole game. Without it the ball is a
 * circle drifting on a flat picture; with it, the eye reads height and distance
 * instantly. It is not decoration and it is not optional.
 */
export function projectShadow(p: Vec3): Projected {
  return project({ x: p.x, y: 0, z: p.z });
}

/** How high the ball floats above its shadow, in metres. Fades and shrinks the shadow. */
export function shadowFalloff(height: number): { alpha: number; spread: number } {
  const h = Math.max(height, 0);
  return {
    alpha: Math.max(0.08, 0.45 - h * 0.12),
    spread: 1 + h * 0.35,
  };
}
