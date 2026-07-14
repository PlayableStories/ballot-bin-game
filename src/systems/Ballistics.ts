import { WORLD, BIN, THROW, BALL_R } from '../config';
import type { Vec3 } from './Projection';

export interface Ballot {
  pos: Vec3;
  vel: Vec3;
  /** Cosmetic only. The ball is a sphere; spin has no effect on the flight. */
  spin: number;
  rotation: number;
}

export type Landing =
  | { kind: 'flying' }
  | { kind: 'in' }
  | { kind: 'rim'; at: Vec3 }
  | { kind: 'floor'; at: Vec3 };

/** Build a ballot from a resolved swipe. Noise is applied by the caller, not here. */
export function launch(power: number, theta: number): Ballot {
  const vz = power * THROW.V_FWD;
  const vy = power * THROW.V_UP;
  const vx = Math.sin(theta) * vz * THROW.LATERAL_GAIN;

  return {
    pos: { ...WORLD.ORIGIN },
    vel: { x: vx, y: vy, z: vz },
    spin: (Math.random() - 0.5) * 12,
    rotation: 0,
  };
}

/**
 * One physics step. Wind is a lateral acceleration and the ONLY horizontal force
 * in the game — there is no drag, no Magnus, no spin coupling. The ball is a
 * parabola that politics is pushing sideways, and keeping it that simple is what
 * makes the wind legible to the player.
 *
 * Pure: takes a ballot, returns a new one. No Phaser, no globals, no time.
 */
export function step(b: Ballot, wind: number, dt: number): Ballot {
  const vel = {
    x: b.vel.x + wind * dt,
    y: b.vel.y - WORLD.GRAVITY * dt,
    z: b.vel.z,
  };

  return {
    pos: {
      x: b.pos.x + vel.x * dt,
      y: b.pos.y + vel.y * dt,
      z: b.pos.z + vel.z * dt,
    },
    vel,
    spin: b.spin,
    rotation: b.rotation + b.spin * dt,
  };
}

/**
 * Did this step end the flight?
 *
 * Evaluated between two frames so a fast ball cannot tunnel through the rim
 * plane. The catch window is asymmetric on purpose — forgiving in depth,
 * tight laterally — so a sloppy throw survives but a bad wind read does not.
 * See BIN.CATCH in config.ts.
 */
export function resolve(prev: Ballot, next: Ballot): Landing {
  const descending = next.vel.y < 0;
  const crossedRim = prev.pos.y >= BIN.RIM_Y && next.pos.y < BIN.RIM_Y;

  if (descending && crossedRim) {
    // Interpolate to the exact crossing point rather than using the frame's
    // end position, which would smear the verdict by however long the frame was.
    const span = prev.pos.y - next.pos.y;
    const t = span > 0 ? (prev.pos.y - BIN.RIM_Y) / span : 0;
    const at: Vec3 = {
      x: prev.pos.x + (next.pos.x - prev.pos.x) * t,
      y: BIN.RIM_Y,
      z: prev.pos.z + (next.pos.z - prev.pos.z) * t,
    };

    const dDepth = Math.abs(at.z - BIN.z);
    const dLateral = Math.abs(at.x - BIN.x);

    if (dDepth <= BIN.CATCH.depth && dLateral <= BIN.CATCH.lateral) {
      return { kind: 'in' };
    }
    if (dDepth <= BIN.RIM_HIT.depth && dLateral <= BIN.RIM_HIT.lateral) {
      // Clipped the rim. Bounces out — but the near-miss has to FEEL near.
      return { kind: 'rim', at };
    }
  }

  if (next.pos.y <= WORLD.FLOOR_Y + BALL_R) {
    return {
      kind: 'floor',
      at: { x: next.pos.x, y: WORLD.FLOOR_Y + BALL_R, z: next.pos.z },
    };
  }

  return { kind: 'flying' };
}

/**
 * The swipe angle that would land a ballot dead centre, given a wind.
 *
 * Nothing in the game uses this — the player is never told it. It exists so the
 * test suite can PROVE that a correct answer is always available inside the
 * legal swipe range, at every wind the game can produce.
 */
export function idealAngle(wind: number, power = 1.0): number {
  const vz = power * THROW.V_FWD;
  const vy = power * THROW.V_UP;

  // Time to fall from the hand to the rim.
  const a = 0.5 * WORLD.GRAVITY;
  const dy = WORLD.ORIGIN.y - BIN.RIM_Y;
  const t = (vy + Math.sqrt(vy * vy + 4 * a * dy)) / (2 * a);

  // x(t) = vx·t + ½·wind·t² = 0  ⟹  vx = −½·wind·t
  const vx = -0.5 * wind * t;
  return Math.asin(clamp(vx / (vz * THROW.LATERAL_GAIN), -1, 1));
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}
