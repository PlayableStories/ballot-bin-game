# Ballot / Waste — Implementation Plan

**Written 14 July 2026.** Target: a public, playable build well before the Clacton by-election on **13 August 2026** — roughly four weeks, of which about three are build.

---

## The question this plan answers first

Before any schedule: **can this be built entirely in code, or does it have to move to a game engine?**

**Code, all the way. No engine migration, ever.** Phaser does not run out. There is no wall.

Game engines earn their place when there are things to *author* that aren't code — levels to lay out, scenes to compose, animation graphs, lighting rigs, a physics world with many interacting bodies, a camera moving through geometry.

This game has **one room, one fixed camera, one moving object, one scalar force.** The physics is ~20 lines of Euler integration. The "level" is a file of constants. There is nothing to lay out in an editor, so an editor would charge us an asset pipeline, a build step and megabytes of download in exchange for nothing. Unity's web build in particular is the wrong shape for a link you text to someone with a month to go before an election.

**Code is the right tool for this game, not a compromise.** The game's simplicity is an asset; an engine would tax it.

### The real boundary is code versus art

| Can be done entirely in code | Requires a human |
| --- | --- |
| Physics, wind, gesture, collision | Deciding whether it **feels** good in the hand |
| Speech system, scheduler, captions | Raster images (PNGs, renders, photography) |
| All UI, HUD, screens, transitions | Original audio |
| Wind indicators, particles, debris, typography | Playtest judgement |
| The ballot, the shadow, the bin, the room | |
| Deployment, hosting, share cards, perf | |

**Low-poly is, by happy accident, the one art style that is itself code.** Flat-shaded triangles are data. A candidate can be a JSON array of polygons; the crumpled ballot is literally a low-poly sphere with jittered vertices, generated procedurally. Most of the 22-item asset list in `GDD-PROTOTYPE.md` §8 turns out to be code once you look at it.

What code-drawn art *will not* be is the concept boards. Those are painterly illustrations with baked lighting and texture. Hand-authored polygons give something flatter and more graphic — closer to a stylish infographic. **The two candidate faces are where this most visibly falls short**, and they are the one place a human hand is worth buying.

---

## Art path — decide before Stage 4, not before Stage 0

| | Approach | Ceiling | Your effort |
| --- | --- | --- | --- |
| **A** | Code-drawn. Everything procedural. | Stylish but plain. Faces are the weak point. | None |
| **B** ⭐ | **Hybrid.** You supply ~4 generated images (2 candidates × poses, 1 room backdrop). Everything else procedural. | Close to board fidelity. | ~4 images |
| **C** | Production art. Blender or an illustrator, rendered to sprites. | Highest. | High — and the schedule has no room before 13 Aug |

**Recommended: B.** It buys most of the fidelity for a fraction of the asset work, and generated-image inconsistency doesn't bite because the candidates barely animate — three poses each.

**This decision does not block Stages 0–3.** It can be deferred, provided the renderer seam below exists.

---

## The one architectural decision that matters

**Game logic never touches a sprite.**

Physics emits *"draw the ballot at world (x, y, z), rotation r"*. A renderer layer decides whether that resolves to a polygon or a PNG.

```
systems/          pure, no Phaser, no assets, unit-testable
  Wind.ts         W: number. decay, impulses, gusts.
  Ballistics.ts   integrate(state, W, dt) → state
  Gesture.ts      pointer samples → { power, theta }
  Projection.ts   world (x,y,z) → screen (x,y,scale)
  Speeches.ts     scheduler
       ↓ emits draw intents, never sprites
render/
  Renderer.ts     interface — the seam
  PolyRenderer.ts flat-shaded polygons from JSON   ← Stage 4
  SpriteRenderer.ts PNGs                            ← Stage 5, if art path B/C
```

Build this seam in Stage 1 and the art decision stays reversible — start code-drawn, swap to generated images later, or mix them, without touching a line of game code. **Skip it and the art decision calcifies early and gets expensive.**

The pure systems have a second payoff: the *"the strongest wind is always beatable"* invariant from `CONCEPT.md` §6 becomes a **test**, not a hope.

---

## Stages

### Stage 0 — Scaffold · ½ day

Vite + TypeScript + Phaser 4.1. Deploy pipeline to a live URL **from the first commit**, so every stage after this is on your phone the moment it lands. Vitest for the pure systems.

**Done when:** a URL shows a coloured rectangle on your phone.

---

### Stage 1 — Grey-box · 2–3 days · ⛔ GO / NO-GO

Coloured shapes only. No art, no wind, no speeches.

* Projection and the **shadow** — the shadow is the primary depth cue, not decoration
* Swipe capture → power + angle
* Ballistics, the bin catch test, the rim near-miss
* Timer, both counters, ballot respawn, ballots persisting on the floor
* The renderer seam

**The only question: does the arc read as travelling into the room, on a real phone, in your hand?**

**If it doesn't, stop.** Fix the projection, the shadow, the flight time, the field of view. Nothing downstream rescues an arc that reads flat. Do not proceed to Stage 2 to cheer yourself up.

---

### Stage 2 — Wind and speech · 4–5 days · ⛔ THE STAGE THAT DECIDES IF THE GAME EXISTS

Still grey-box. Bunting is a line. Leaflets are rectangles. That is the point.

* Wind scalar: decay, cap, the four effects (PUSH / AMPLIFY / DAMPEN / REVERSE)
* Speech scheduler, captions, the ten statements
* The single telegraphed gust
* **Environmental wind indicators** — bunting lean, leaflet drift, slogan-word particles, the hanging sign
* Delete the debug wind number the moment the indicators land

**Playtest the thesis, with five people who are not you:**

> Can a player read the wind from the room alone — no meter — and beat it?

If they can't, **the fix is the indicators, not a number in the corner, and not better art.** A player who stops looking at the room and throws semi-randomly has collapsed the game into luck, and the political metaphor evaporates. This is the single most likely way the project fails, which is why it is tested before a single asset exists.

---

### Stage 3 — Tuning · 2 days · overlaps Stage 2

* Live debug panel exposing every constant in `config.ts`
* **Headless solver test** sweeping wind × angle × power to prove the cap stays beatable — so a later tuning tweak cannot silently break the design without the suite going red
* Wind replay from a seed, so playtests are reproducible
* Lock the numbers

---

### Stage 4 — Real rendering · 4–5 days

Grey boxes out, flat-shaded polygons in. **Still zero image files.**

* `PolyRenderer` + polygon data for room, podiums, bin, hand, ballot
* Real typography, slogan particles, floor debris
* Title screen, count screen, the camera pull-back over the scattered ballots
* Landed ballots as a physical record of the election

**This is where it stops looking like a debug build and starts looking like a game.** If the art path is A, this is the last art stage.

**Guard the satire here.** Low-poly polish is the visual language of the free-to-play casual game this project is satirising. That can be the joke or it can be the failure. No coins, no combo meters, no multipliers, no stars, no "GREAT!" popups. (`CONCEPT.md` §11.)

---

### Stage 5 — Art and audio · parallel with Stage 4 · depends on you

Only if art path B or C.

* You generate the candidates and backdrop against the brief in `concept-art/README.md` — **amber and teal, no red/blue, break the mirror symmetry, correct the tilt copy**
* I integrate behind the seam — no game code changes
* Audio: sourced and mixed, not authored. Mic pop, podium knock, paper crumple, soft landing, bin thunk, counter click, rim clang
* **The wind bed is a whispered slogan loop, not white noise.** The wind is made of speech; it should sound like it

---

### Stage 6 — Ship · 2–3 days

Touch handling on real devices, mobile perf, the share card, hosting, `localStorage` best score.

---

## Schedule

```
Week 1   Stage 0 ── Stage 1 ──────── ⛔ arc reads?
Week 2   Stage 2 ─────────────────── ⛔ wind readable?   (Stage 3 overlaps)
Week 3   Stage 4 ─────────────────── (Stage 5 in parallel, if B)
Week 4   Stage 6 ── ship ─────────── slack
```

**~3 weeks of build against a 13 August election.** The slack in week 4 is not padding — Stage 2 is allowed to send us back to the drawing board, and it must be able to without killing the date.

---

## Risks, most dangerous first

**1. The wind isn't readable from the room.** Players stop looking, throw randomly, the metaphor evaporates into a luck game. *Mitigation: tested at Stage 2, before any art exists. The indicators are the fairness contract.*

**2. The arc doesn't read as depth.** *Mitigation: Stage 1 go/no-go, on a real phone, before anything else is built.*

**3. It just looks like the casual game it's satirising.** *Mitigation: no F2P scoring furniture, ever; keep the print-and-paper language prominent.*

**4. Faces look like programmer art.** *Mitigation: art path B — this is the one place a human hand is worth buying.*

**5. The election passes.** *Mitigation: front-load the risky stages; the game is designed to outlive the news cycle anyway — candidates and speeches are data, so a new election is a content pack, not a rewrite.*

---

## Definition of done

A public URL. On a phone. Where a stranger throws a crumpled ballot, watches a politician change the wind, adjusts, and misses anyway — and understands why.
