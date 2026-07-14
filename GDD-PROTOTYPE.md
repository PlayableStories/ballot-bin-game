# Ballot / Waste — Prototype GDD v0.1

Scope: the smallest build that answers one question —

> **Does hearing a statement, seeing it move the wind, and compensating for it in a throw communicate that political speech shapes the environment of voting?**

Everything not serving that question is out of scope.

---

## 0. Locked decisions

| Decision | Value |
| --- | --- |
| Input | Upward swipe only. No tilt, no gyroscope, no drag-back. |
| Candidates | Fictional archetypes. No real likenesses, names, or quotations. |
| Visual direction | Stylised low-poly (Direction C), rendered as 2D sprites over a 2.5D fake-depth room. |
| Score | Ballots in the bin. Nothing else is scored. |
| "Independent vote" | Cut from the prototype. |
| Stack | Phaser 4.1 + TypeScript + Vite, static deploy. |
| Orientation | Portrait, mobile-first. Desktop = mouse swipe, same code path. |
| Session length | 75s (tunable constant). |

---

## 1. Screen states

```
Boot → Preload → Title → [Tutorial overlay, first run only] → Play ⇄ Pause → Count → Title
```

**Boot / Preload.** Load atlas, audio, speech JSON. Progress bar. No branding.

**Title.** Wordmark `BALLOT / WASTE`. Single button: `CAST YOUR VOTE`. Best bin-count from `localStorage` shown small. The bin label on the title art slowly cross-fades between `BALLOT` and `WASTE`.

**Tutorial overlay.** First run only (`localStorage` flag). Non-blocking: the game is already live behind it. Shows `SWIPE UP TO THROW` and an animated finger arc, plus `ANGLE YOUR SWIPE TO BEAT THE WIND`. Dismisses on first throw, never returns.

**Play.** The core loop (§2). Pausable.

**Pause.** Freezes clock, physics, speech scheduler, audio ducked. Resume / Quit.

**Count.** Camera pushes up and back to reveal the whole room with every landed ballot still where it fell. Sequential reveal, ~400ms apart:

```
17 votes cast.
6 reached the count.
11 were swept aside.
The wind continues.
```

Then the bin label rotates between `BALLOT` and `WASTE` and settles on neither. Buttons: `VOTE AGAIN`, `SHARE`.

No win/lose text. No stars. No grade.

---

## 2. Core loop (Play)

```
t=0    Timer starts. Wind = 0. First ballot in hand.
       ↓
       SPEECH BEAT (every 5–8s, first at t=1.0s)
         · candidate lights up, steps forward, caption types on
         · wind impulse applies over 0.6s ease-out
         · room reacts: bunting leans, leaflets skid, slogan-words fly
       ↓
       THROW (player, any time — speeches do not gate throws)
         · swipe captured → velocity resolved → ball leaves hand
         · flight ≈ 1.1s, wind accelerates it laterally the whole way
       ↓
       RESOLVE
         · IN  → counter tick, mechanical counter SFX, ball vanishes into bin
         · OUT → soft paper landing, ball persists on the floor for the session
       ↓
       0.35s later, new ballot in hand. Repeat until t = 75s.
```

Throws are not gated by speeches and speeches are not gated by throws. The player may throw during a speech — that's the point. Ballots in flight when the timer hits zero are allowed to land and count.

---

## 3. World model (2.5D)

Right-handed, metres. Camera fixed at the player's eye.

| Axis | Meaning |
| --- | --- |
| `x` | Lateral. `+x` = screen right. Origin = throwing lane centre. |
| `y` | Height. `0` = floor. |
| `z` | Depth away from the player. |

Fixed constants:

```ts
ORIGIN      = { x: 0, y: 1.20, z: 0 }   // ball leaves the hand here
BIN         = { x: 0, z: 6.00 }          // 6m down the room
BIN_RIM_Y   = 0.55                       // rim opening height
GRAVITY     = 9.80                       // m/s², applied to -y
```

**Catch test.** Evaluated the frame the ball's `y` descends through `BIN_RIM_Y` with `vy < 0`:

```ts
const depthErr   = Math.abs(z - BIN.z);
const lateralErr = Math.abs(x - BIN.x);
const IN = depthErr <= 0.55 && lateralErr <= 0.30;
```

**This asymmetry is the whole design.** Depth tolerance (±0.55m) is roughly twice lateral tolerance (±0.30m), so sloppy power is survivable and sloppy wind-reading is not. Power is a warm-up skill; wind is *the* skill. Do not "balance" these to be equal.

If `IN` fails but `depthErr <= 0.75 && lateralErr <= 0.45`, play a rim-clang and let the ball bounce out to the floor — near-misses must *feel* near.

**Screen projection.** Simple perspective divide against a vanishing point at the bin:

```ts
const s      = FOCAL / (FOCAL + z);        // FOCAL ≈ 4.5
const screenX = CX + x * s * PPM;
const screenY = HORIZON + (EYE_Y - y) * s * PPM;
const scale   = s;                          // ball sprite scale
```

Ball shadow drawn at `y = 0` with the same projection, alpha and size falling off with the ball's height. The shadow is the primary depth cue — do not skip it.

---

## 4. Gesture → throw

### Capture

Sample pointer positions with timestamps from `pointerdown` to `pointerup` (or a 500ms cap). Reject the gesture entirely if:

- total vertical travel `< 60px` upward, or
- the gesture is net-downward, or
- duration `> 500ms` (a drag, not a throw).

Rejected gestures do nothing and consume no ballot.

### Resolve

```ts
const dx = end.x - start.x;              // px, + = right
const dy = start.y - end.y;              // px, + = upward
const len   = Math.hypot(dx, dy);
const dur   = Math.max(end.t - start.t, 16);  // ms

// Angle from vertical, + = right
const theta = clamp(Math.atan2(dx, dy), -MAX_ANGLE, MAX_ANGLE);   // MAX_ANGLE = 35°

// Power: 60% distance, 40% speed
const lenNorm   = clamp(len / (0.32 * screenH), 0, 1.4);
const speedNorm = clamp((len / dur) / 2.6, 0, 1.4);              // px/ms → normalised
let   P         = 0.6 * lenNorm + 0.4 * speedNorm;

// Ease toward 1.0 so mid-range swipes cluster near the sweet spot
P = 1.0 + (P - 1.0) * 0.75;
P = clamp(P, 0.60, 1.30);
```

### Launch velocity

`P = 1.0` is the perfect no-wind throw: it lands dead centre in the bin.

```ts
const V_FWD = 5.45;    // m/s at P = 1.0
const V_UP  = 4.80;    // m/s at P = 1.0  (ratio 0.88 — fixed, never varies)

const vz =  P * V_FWD;
const vy =  P * V_UP;
const vx =  Math.sin(theta) * vz * 0.90;
```

Sanity check at `P = 1.0`, no wind: flight time to `y = 0.55` is **1.10s**, `z = 6.00m`, apex **2.38m** (clears heads, under the ceiling). Straight in.

### Throw noise

Applied after resolve, before launch:

```ts
P     *= 1 + gauss(0, 0.02);    // ±2% power
theta += gauss(0, 0.026);       // ±1.5° angle
```

Enough that no two throws are identical. Small enough that a correct read is never robbed. Tune this last.

### Integration

Fixed 60Hz step. Per frame:

```ts
vx += windAccel(t) * dt;        // §5 — the only lateral force
vy -= GRAVITY * dt;
x += vx * dt;  y += vy * dt;  z += vz * dt;
```

No drag. No Magnus. No spin physics. The ball is a sprite that rotates for looks.

---

## 5. Wind

A single signed scalar: **lateral acceleration, m/s². Positive = pushes right.** That is the entire wind model. No vertical wind, no turbulence, no z-wind in the prototype.

```ts
WIND_MAX   = 4.50;   // hard cap, both directions
WIND_DECAY = 0.12;   // per second, exponential → half-life ≈ 5.8s
```

Per frame:

```ts
W *= Math.exp(-WIND_DECAY * dt);
W  = clamp(W + pendingImpulse(dt) + gust(t), -WIND_MAX, WIND_MAX);
```

### Why 4.50 is the cap

Over the 1.10s flight, a constant `W` drags the ball laterally by `0.5·W·T² = 0.605·W`. At the cap that's **2.72m** of drift. Maximum available counter-steer at `θ = 35°` is `vx = 2.81 m/s → 3.09m` of lateral travel. So the strongest possible wind is *just* beatable with a near-maximal angled swipe — and nothing weaker than the cap is ever uncounterable.

**Do not raise `WIND_MAX` above 4.5 without also raising `MAX_ANGLE`.** The moment wind exceeds counter-steer, the game stops being about skill and starts being about luck, and the satire collapses into nihilism — which is explicitly not the argument we're making.

The exact compensating angle, for tuning and telemetry:

```ts
requiredVx    = -0.55 * W;                        // to land x = 0
requiredTheta = Math.asin(requiredVx / (0.9 * vz));
```

### Speech impulses

Each speech carries an `effect` applied as an ease-out ramp over **0.6s** (never instantly — the room must be seen to change):

| Effect | Operation | Feel |
| --- | --- | --- |
| `PUSH` | `W += dir * mag` | Reinforces or opposes, depending on current sign. |
| `AMPLIFY` | `W *= 1.6` | Escalation. Does nothing if the room is calm. |
| `DAMPEN` | `W *= 0.45` | The moderate. Calms the room. |
| `REVERSE` | `W *= -0.85` | The room turns. The single most disorienting effect. |

`mag` ∈ `{1.5 (nudge), 3.0 (push), 4.5 (shove)}`. `dir` ∈ `{-1, +1}`.

### Gusts

At most **one** gust per session, never in the first 20s. A gust telegraphs for **0.8s** (a rising whistle, paper lifting off the floor, the hanging sign spinning) and then adds a transient `±3.0` for 1.5s on a raised-cosine envelope, on top of `W`.

A gust *may* land mid-flight. This is the only mid-flight reversal in the prototype, and it must be so heavily signposted that the player sees it coming and can do nothing about it. That helplessness is intentional and rare — once per session, not once per throw.

### Reading the wind (no numeric meter — ever)

Every indicator is driven off the same normalised `w = W / WIND_MAX`:

| Indicator | Mapping |
| --- | --- |
| Bunting lean | `angle = w * 30°`, smoothed. The primary read. |
| Leaflet particles on the floor | Drift velocity `∝ w`, spawn rate `∝ |w|`. |
| Slogan-word particles | Emitted from the speaking podium, blown along `w`. |
| Hanging `PUBLIC OPINION` sign | Rotates to `w * 45°`, with lag and overshoot. |
| Ceiling light | Sways on `w`, moving the room's shadows. |
| Wind hiss (audio) | Volume `∝ \|w\|`, pan `∝ w`. |

If the player cannot read the wind from these alone, the fix is the indicators, not a meter.

---

## 6. Candidates and speech

Two archetypes for the prototype. **Neither is red or blue** — that palette is reserved so the game never hard-codes an ideological axis onto a physical one (per the brief). Colours identify a *campaign*, not a side.

| | THE STRONG LEADER | THE OUTSIDER |
| --- | --- | --- |
| Podium | Screen left | Screen right |
| Palette | Amber / bone | Teal / slate |
| Register | Command, certainty, repetition | Grievance, mockery, "them" |
| Slogan | `STRONG HANDS. STEADY COURSE.` | `THEY'VE HAD THEIR TURN.` |
| Placard | `NO EXCUSES.` | `CUT THE ROPE.` |

Both may push the wind the *same* direction on consecutive speeches. They are not a seesaw and must not be readable as one — that's the trap the concept boards fell into, and it's the difference between "both sides are noisy" (a lazy point) and "rhetoric accumulates" (the actual point).

### Speech data

Content lives in `src/data/speeches.json`, entirely separate from game code, so a future election pack is a data swap:

```jsonc
{
  "id": "sl_04",
  "candidate": "STRONG_LEADER",
  "text": "I will not be blown off course.",
  "effect": "AMPLIFY",           // PUSH | AMPLIFY | DAMPEN | REVERSE
  "dir": -1,                     // only read by PUSH
  "mag": 3.0,                    // only read by PUSH
  "words": ["COURSE", "STEADY", "NO"],  // particles emitted
  "audio": "mic_pop_a"
}
```

Ten lines minimum for the prototype — five per candidate, covering all four effects, with at least one `REVERSE` each. All lines are written for the archetype. None is attributed to, adapted from, or placed in the mouth of a real person.

### Scheduler

- First speech at `t = 1.0s`.
- Then every `5–8s`, uniform random.
- Never the same `id` twice in a session.
- Never the same candidate three times consecutively.
- Weight selection *against* the current wind occasionally, so the room doesn't runaway-saturate at the cap and sit there.
- Speeches stop at `t = 68s`; the last 7 seconds run on residual, decaying wind.

Captions type on over ~0.5s, hold 2.5s, fade. Audio in the prototype = a mic pop, a processed murmur, and a podium knock. **No voice acting, no TTS.** The caption is the performance.

---

## 7. HUD

Deliberately thin — three numbers and a pause.

| Position | Element |
| --- | --- |
| Top left | Pause |
| Top centre | `TIME LEFT` + `MM:SS`. Turns amber under 15s, ticks audibly under 10s. |
| Top right | `IN THE BIN` count, and below it `ON THE FLOOR` count. |
| Bottom | The hand, the ballot, and (first run only) `SWIPE UP TO THROW`. |

No wind meter. No combo counter. No score multiplier. No coins.

---

## 8. Minimum asset list

Everything is a 2D sprite. Low-poly renders baked to PNG; nothing is 3D at runtime.

### Art — 22 files

| # | Asset | Notes |
| --- | --- | --- |
| 1 | `room_bg.png` | 1080×1920. The whole low-poly room baked in one image: walls, ceiling, floor lane, doorway, podiums, ceiling light. Vanishing point aligned to the bin. |
| 2 | `bin_back.png` | Bin body, drawn behind the ball. |
| 3 | `bin_front.png` | Front rim lip only, drawn *over* the ball, so a ball entering the bin visibly sinks behind it. Non-negotiable for the "it went IN" read. |
| 4–6 | `ballot_01–03.png` | Crumpled ball, 3 crumple variants. Rotated in-engine. |
| 7 | `ballot_shadow.png` | Soft ellipse. Scaled and faded by height. |
| 8 | `hand_ballot.png` | Foreground hand holding the ballot. |
| 9 | `hand_empty.png` | Post-throw frame, retracts and returns. |
| 10–12 | `cand_leader_idle/speak/point.png` | Strong Leader, three poses. |
| 13–15 | `cand_outsider_idle/speak/point.png` | Outsider, three poses. |
| 16 | `bunting.png` | Single strip, skewed procedurally by wind. |
| 17–19 | `leaflet_01–03.png` | Floor debris / wind particles. |
| 20 | `sign_opinion.png` | Hanging `PUBLIC OPINION` sign. Rotates with wind. |
| 21 | `ballot_landed_01–03.png` | Flattened ballot decals for the floor. |
| 22 | `ui_atlas.png` | Timer plate, two counter plates, pause, swipe arrow. |

Fonts: one heavy condensed sans (headline + numerals), one plain sans (captions). Two files.

Slogan-word particles are **bitmap text, not assets** — they're generated from the `words` array in the speech data, so a new election pack needs zero new art.

### Audio — 8 files

`mic_pop` · `podium_knock` · `crowd_murmur_loop` · `wind_hiss_loop` (pitch/pan driven by `W`) · `paper_crumple` (throw) · `paper_land_soft` (floor) · `bin_thunk` + `counter_click` (in) · `rim_clang` (near miss)

The wind hiss should be built from a whispered, unintelligible slogan loop rather than white noise — the wind is made of speech.

---

## 9. File layout

```
src/
  main.ts
  scenes/     Boot  Preload  Title  Play  Pause  Count
  systems/
    Wind.ts       // W, decay, impulses, gusts. Pure, testable, no Phaser.
    Ballistics.ts // integrate(state, W, dt) → state. Pure, testable, no Phaser.
    Gesture.ts    // pointer samples → { P, theta }. Pure, testable, no Phaser.
    Projection.ts // world (x,y,z) → screen (x,y,scale)
    Speeches.ts   // scheduler
  data/speeches.json
  config.ts       // every constant in this document, in one place
```

`Wind`, `Ballistics` and `Gesture` are pure functions with no Phaser dependency, so tuning is unit-testable and I can prove the "wind is always counterable" invariant with a solver test rather than by feel.

---

## 10. Build order

1. Grey-box: coloured rectangles, projection + shadow, a bin, a swipe. Prove the arc reads as depth on a phone. **Stop and check this before anything else.**
2. Catch test, counters, timer, ballot respawn.
3. Wind as a scalar with a debug on-screen number. Prove it's counterable at the cap.
4. Speeches + captions + scheduler. Kill the debug number.
5. Environmental wind indicators. This is the moment the game either works or doesn't.
6. Count screen and the camera pull-back.
7. Real art swap.
8. Audio.

Playtest the question at step 5, not step 8. If a player can't read the wind from the room at step 5, no amount of art fixes it.

---

## 11. Out of scope

Candidate selection · marking the ballot before crumpling · multiple rooms · combos/multipliers/points beyond bin count · voice acting · online anything · ballots trapped in scenery · paper deformation · gyroscope · real politicians.

---

## 12. Open questions for playtest

- Is 75s right, or does the wind's 5.8s half-life want a longer session to be legible?
- Should `DAMPEN` speeches exist at all, or does a moderate calming the room make the game *easier* in a way that flatters centrism unintentionally?
- Is one gust per session too rare to register, or exactly rare enough to sting?
- Does `ON THE FLOOR` need to be on the HUD at all, or is it better as a reveal on the count screen?
