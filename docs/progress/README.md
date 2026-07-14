# Build progress — screenshots

One shot per stage, kept because this repo is teaching material as well as version control, and the interesting thing about a game's development is rarely the finished screen.

The story behind each of these — what broke, what the numbers were — is in [`DEVLOG.md`](../../DEVLOG.md). What we learned working this way is in [`PROCESS-LOG.md`](../../PROCESS-LOG.md).

All shots: headless Chromium, iPhone-sized portrait viewport (390×844), driven with real swipe gestures.

---

## Stage 0 — Scaffold

| | |
| --- | --- |
| ![Stage 0 scaffold](stage-0-scaffold.png) | ![Stage 0 swipe readout](stage-0-swipe-readout.png) |

A rectangle and some text, deliberately. Its job was to prove the three things Stage 1 would depend on and could not easily debug later: portrait scaling works on a real device, touch input arrives, and the config is actually wired in rather than merely compiling — hence the design's load-bearing constants printed live from `config.ts`.

The swipe readout on the right (`369px 17° 233ms`) is the entire point of the scene. The whole game is one gesture; discovering at Stage 1 that the browser was eating it as a page scroll would have been a bad afternoon.

This scene was deleted the moment Stage 1 landed. It existed to answer a question, and it answered it.

---

## Stage 1 — Grey-box

![Stage 1 room](stage-1-room.png)

Coloured shapes only, on purpose. Depth is bought with three cheap things: a converging lane, floor bands spaced evenly in *world* units so they bunch with distance, and a horizon.

![Stage 1 ballot in flight](stage-1-flight.png)

The ball in flight, with its shadow tracking separately along the floor. **The shadow is the primary depth cue in the whole game** — without it the ball is a circle drifting on a flat picture. Not decoration.

---

## The two screenshots that mattered

| Before | After |
| --- | --- |
| ![1 in the bin, 4 on the floor](stage-1-landed-ballots.png) | ![11 in the bin, 0 on the floor](stage-1-after-retune.png) |
| **1 in the bin, 4 on the floor.** Three of those five were straight throws with no wind — which 72 passing tests insisted should all have landed. | **11 in the bin, 0 on the floor.** After the retune. |

The left-hand image is why the grey-box stage exists. Two perfectly correct systems, wired together, made an unplayable game — and no unit test could see it.

Full diagnosis in [`DEVLOG.md`](../../DEVLOG.md).
