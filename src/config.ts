/**
 * Every tunable number in Ballot / Waste, in one place.
 *
 * Derivations and reasoning live in GDD-PROTOTYPE.md. Two constants are NOT
 * free to tune — see WIND.MAX and BIN.CATCH below. Read those comments before
 * touching them.
 */

/** Metres, seconds, radians. Right-handed: +x screen-right, +y up, +z away. */
export const WORLD = {
  /** Where the ballot leaves the hand. */
  ORIGIN: { x: 0, y: 1.2, z: 0 },
  GRAVITY: 9.8,
  /** Floor plane. Ballots that miss come to rest here. */
  FLOOR_Y: 0,
} as const;

export const BIN = {
  x: 0,
  z: 6.0,
  /** Height of the rim opening. The catch test fires as the ball descends through this. */
  RIM_Y: 0.55,

  /**
   * The catch window is deliberately ASYMMETRIC and this is load-bearing.
   *
   * Depth is forgiving (±0.55m); lateral is tight (±0.30m). So a sloppy throw
   * survives but a bad wind read does not — which is what makes reading the
   * wind the skill of this game rather than throw strength.
   *
   * Do not "balance" these to be equal. That is not a fix, it is a different
   * game.
   */
  CATCH: { depth: 0.55, lateral: 0.3 },

  /** Wider window that clips the rim: bounces out, but the near-miss must FEEL near. */
  RIM_HIT: { depth: 0.75, lateral: 0.45 },
} as const;

export const THROW = {
  /** Velocities at power P = 1.0, which is the perfect no-wind throw. */
  V_FWD: 5.45,
  V_UP: 4.8,
  /** vy/vz is fixed at 0.88. Power scales both; it never changes the arc's shape. */
  LATERAL_GAIN: 0.9,

  /** Max deviation of the swipe from vertical. Bounds the counter-steer available. */
  MAX_ANGLE: (35 * Math.PI) / 180,

  POWER_MIN: 0.6,
  POWER_MAX: 1.3,
  /** Pulls mid-range swipes toward the sweet spot so power is a warm-up skill, not the skill. */
  POWER_EASE: 0.75,

  /** Enough that no two throws are identical; small enough that a correct read is never robbed. */
  NOISE_POWER: 0.02,
  NOISE_ANGLE: (1.5 * Math.PI) / 180,
} as const;

export const GESTURE = {
  MIN_UP_PX: 60,
  MAX_DURATION_MS: 500,
  /** Swipe length as a fraction of screen height that reads as full power. */
  LENGTH_REF: 0.32,
  /** px/ms that reads as full power. */
  SPEED_REF: 2.6,
  WEIGHT_LENGTH: 0.6,
  WEIGHT_SPEED: 0.4,
} as const;

export const WIND = {
  /**
   * Lateral acceleration, m/s². Positive pushes right. This single signed
   * scalar IS the wind model.
   *
   * MAX is DERIVED, not chosen. Over the ~1.1s flight a constant wind drags the
   * ball 0.605·W sideways, so at 4.5 that is 2.72m. The strongest available
   * counter-swipe (MAX_ANGLE) moves it 3.09m. The worst wind in the game is
   * therefore *just* beatable, and nothing weaker is ever unbeatable.
   *
   * The moment wind exceeds counter-steer, skill stops mattering and the game
   * quietly starts arguing that voting is futile — a lazier claim than the one
   * we are making. NEVER raise MAX without raising THROW.MAX_ANGLE.
   * `config.test.ts` fails if this invariant breaks.
   */
  MAX: 4.5,

  /** Exponential, per second. Half-life ≈ 5.8s — long enough to persist across throws. */
  DECAY: 0.12,

  /** Speeches ramp in over this, never snap. The room must be SEEN to change. */
  RAMP_S: 0.6,

  MAGNITUDE: { nudge: 1.5, push: 3.0, shove: 4.5 },
  AMPLIFY: 1.6,
  DAMPEN: 0.45,
  REVERSE: -0.85,

  GUST: {
    /** At most one per session. Rare enough to sting; any more and it is just weather. */
    PER_SESSION: 1,
    EARLIEST_S: 20,
    TELEGRAPH_S: 0.8,
    STRENGTH: 3.0,
    DURATION_S: 1.5,
  },
} as const;

export const SESSION = {
  DURATION_S: 75,
  /** Residual decaying wind plays out the last stretch alone. */
  SPEECHES_STOP_S: 68,
  FIRST_SPEECH_S: 1.0,
  SPEECH_GAP_S: { min: 5, max: 8 },
  RESPAWN_S: 0.35,
} as const;

/** Fake-depth projection. Tuned by eye in Stage 1 against a real phone. */
export const CAMERA = {
  FOCAL: 4.5,
  EYE_Y: 1.5,
  /** Pixels per metre at z = 0. */
  PPM: 260,
  HORIZON_FRAC: 0.42,
} as const;

/**
 * Design reference resolution. The game scales to fit; it does not reflow.
 */
export const SCREEN = { W: 720, H: 1280 } as const;

/**
 * Amber and teal. NOT red and blue.
 *
 * Red-vs-blue hard-codes the wind as an ideological seesaw and hands the player
 * "both sides push you around, they're all the same" — a lazier point than the
 * one this game makes, which is that rhetoric ACCUMULATES. Colour identifies a
 * campaign, never a side. See CONCEPT.md §12.
 */
export const PALETTE = {
  STRONG_LEADER: 0xd98b2b,
  OUTSIDER: 0x2b8f8f,

  ROOM_BACK: 0x3a3a42,
  ROOM_FLOOR: 0x54545e,
  ROOM_WALL: 0x46464f,
  LANE: 0x6a6a76,

  BALLOT: 0xf2efe6,
  SHADOW: 0x000000,
  BIN: 0x2e2e36,
  BIN_RIM: 0x8a8a96,

  INK: 0x1a1a1f,
  PAPER: 0xf2efe6,
} as const;
