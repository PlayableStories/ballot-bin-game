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
};

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
};

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

  /**
   * How much a swipe's strength is allowed to matter. Measured in Stage 1, and
   * the measurement changed the design.
   *
   * The bin is 6m away, so depth error scales brutally with power: the window
   * that actually goes in is only −4% to +5.5%. But realistic human swipes span
   * power 0.82 → 1.30. At the original 0.75, four of five plausible swipes
   * missed — and missed on POWER, not on wind. Power was the whole game, which
   * is the exact opposite of the thesis.
   *
   * At 0.12, every realistic swipe lands in a windless room, and only a
   * genuinely feeble one fails. Which is the game, stated mechanically:
   *
   *   With no political wind, every vote reaches the count.
   *   All of the difficulty is political.
   *
   * Swipe strength is now a light touch, not a skill. That is deliberate. If a
   * playtester says the throw feels unresponsive, the fix is feedback (arc,
   * sound, the hand), NOT raising this number — raising it hands the game back
   * to the thumb and takes it away from the room.
   */
  POWER_EASE: 0.12,

  /**
   * "How much random variation is added to each throw" was an open question in
   * the design doc. Stage 1 answered it: ALMOST NONE, and the reason is not a
   * matter of taste.
   *
   * Both windows are tight. Power that goes in spans only ±5%. Lateral spans
   * ±0.30m at the bin. The original noise — ±2% power, ±1.5° angle — was sized
   * by feel, against nothing. Measured against the windows it actually lives in:
   *
   *   ±2% power   → ate 40% of the power window
   *   ±1.5° angle → moved the ball 0.14m, ~47% of the lateral window
   *
   * So a straight, well-judged, correctly-compensated throw was being thrown out
   * of the bin by dice, several times a session. And the player would have
   * blamed THE WIND — because in this game, an unexplained sideways miss reads
   * as politics. Random variation that impersonates the antagonist is not
   * texture. It is a lie about what the game is.
   *
   * These values keep throws from being pixel-identical and do nothing else.
   */
  NOISE_POWER: 0.006,
  NOISE_ANGLE: (0.4 * Math.PI) / 180,
};

export const GESTURE = {
  MIN_UP_PX: 60,
  MAX_DURATION_MS: 500,

  /**
   * Calibrated so an ORDINARY swipe lands power ≈ 1.0 — dead centre of the
   * window that goes in.
   *
   * These were 0.32 / 2.6, which put a typical swipe at 0.98: inside the window,
   * but hard against its lower edge, so any noise tipped it out. The sweet spot
   * has to sit where the thumb naturally lands, not next to it.
   */
  /** Swipe length as a fraction of screen height that reads as full power. */
  LENGTH_REF: 0.28,
  /** px/ms that reads as full power. */
  SPEED_REF: 2.2,

  WEIGHT_LENGTH: 0.6,
  WEIGHT_SPEED: 0.4,
};

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
};

export const SESSION = {
  DURATION_S: 75,
  /** Residual decaying wind plays out the last stretch alone. */
  SPEECHES_STOP_S: 68,
  FIRST_SPEECH_S: 1.0,
  SPEECH_GAP_S: { min: 5, max: 8 },
  RESPAWN_S: 0.35,
};

/**
 * Fake-depth projection. Tuned by eye in Stage 1 against a real phone.
 *
 * scale = FOCAL / (z + BACK). The camera sits BACK metres behind the throwing
 * hand, so the hand is never at the camera plane (where scale would blow up).
 *
 * BACK is a cheat, and deliberately so. True perspective makes the ball in your
 * hand enormous — physically correct, visually absurd. Pushing the camera back
 * to 1m tames the near-field without touching the physics, which still measures
 * everything from the hand at z = 0.
 */
export const CAMERA = {
  FOCAL: 4.5,
  BACK: 1.0,
  EYE_Y: 1.5,
  /** Pixels per metre at unit scale. */
  PPM: 260,
  HORIZON_FRAC: 0.42,
};

/** Radius of the crumpled ballot, metres. Drives both the sprite and the shadow. */
export const BALL_R = 0.06;

/**
 * The groups above are deliberately MUTABLE, not `as const`.
 *
 * The Stage 3 tuning panel rewrites them live, on the device, while the game is
 * running — so a number that felt wrong in the hand can be fixed in the hand,
 * rather than guessed at from a spreadsheet. Because every system reads through
 * these object references, a change lands instantly with no plumbing.
 *
 * This snapshot is taken at module load, before anything can touch them: it is
 * what RESET restores, and what the panel diffs against so you can see at a
 * glance what you have actually changed.
 */
export const DEFAULTS = structuredClone({ WORLD, BIN, THROW, GESTURE, WIND, SESSION, CAMERA });

/** Debug-only. A constant wind, dialled by hand, until Stage 2 makes politics blow it. */
export const DEBUG = {
  wind: 0,
  /** Draw the ideal-angle guide and the catch window. Cheating, on purpose. */
  showSolver: false,
};

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
