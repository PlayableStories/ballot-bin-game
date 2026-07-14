# Build progress

A screenshot per stage, kept because this repo is teaching material as well as version control. The interesting thing about a game's development is rarely the finished screen — it is what the ugly intermediate stages were *for*, and what they caught.

All shots: headless Chromium, iPhone-sized portrait viewport (390×844), driven with real swipe gestures.

---

## Stage 0 — Scaffold

![Stage 0 scaffold](stage-0-scaffold.png)

A rectangle and some text. Deliberately almost nothing.

Its job was to prove the three things Stage 1 would depend on and could not easily debug later: **portrait scaling works on a real device, touch input arrives, and the config is actually wired in** rather than merely compiling. Hence the constants printed on screen — they are the design's load-bearing numbers, read live from `config.ts`.

![Stage 0 swipe readout](stage-0-swipe-readout.png)

The swipe readout — `369px 17° 233ms` — is the whole point of the scene. The entire game is one gesture, and finding out at Stage 1 that the browser was eating it as a page scroll would have been a bad afternoon.

This scene was deleted the moment Stage 1 landed. It existed to answer a question, and it answered it.

---

## Stage 1 — Grey-box

![Stage 1 room](stage-1-room.png)

Coloured shapes only. **No art, on purpose.** This stage exists to answer exactly one question, and art would only have made the answer harder to trust:

> Does the arc read as travelling *into* the room, on a real phone?

Depth here is bought with three cheap things: a converging lane, floor bands spaced evenly in *world* units so they bunch with distance, and a horizon.

![Stage 1 ballot in flight](stage-1-flight.png)

The ball in flight, with its shadow tracking separately along the floor. **The shadow is the primary depth cue in the whole game** — without it the ball is a circle drifting on a flat picture. It is not decoration, and it was in the design before it was in the renderer.

![Stage 1 landed ballots](stage-1-landed-ballots.png)

Ballots stay where they fall, for the whole session. By the end the floor is a physical record of the election. Note the counters: **1 in the bin, 4 on the floor.**

That number is the reason this stage matters.

---

## What Stage 1 caught

Three of those five throws were **straight, with no wind**. The test suite — 72 passing tests at the time — insisted they should all have gone in. The browser disagreed, and the browser was right.

Driving the real game found what the tests could not: **the physics and the gesture mapping were each perfectly correct, and together they made the game unplayable.**

- The power window that actually goes in is only **−4% to +5.5%** (the bin is 6m away; depth error scales brutally with power).
- Realistic human swipes span power **0.82 → 1.30**.
- So four of five plausible swipes missed **on power**, before the wind had said a word.

And the throw noise had been sized by feel, against nothing. Measured against the windows it actually lives in:

| Noise | Window it lives in | Damage |
| --- | --- | --- |
| ±2% power | ±5% | ate 40% of it |
| ±1.5° angle | ±0.30m lateral | moved the ball 0.14m — half of it |

Straight, correctly-judged throws were being knocked out of the bin **by dice**. And the player would have blamed **the wind** — because in this game, an unexplained sideways miss *reads as politics*. Random variation that impersonates the antagonist is not texture. It is a lie about what the game is.

![Stage 1 after the retune](stage-1-after-retune.png)

After the retune: **11 in the bin, 0 on the floor**, from twelve straight swipes.

The fix made swipe strength a light touch rather than a skill — which turned out not to be a compromise but the game, stated mechanically:

> **With no political wind, every vote reaches the count. All of the difficulty is political.**

---

## The lesson worth stealing

Had this survived to Stage 2, it would have surfaced as *"playtesters can't read the wind"*. We would have spent a week rebuilding the wind indicators. **The wind would have been innocent.**

Two correct systems, wired together, produced a broken game — and no unit test could see it, because each system was doing exactly what it was asked. `src/systems/Throw.test.ts` exists now to hold that seam: gesture → ballistics, end to end, with noise, two hundred times.

**The seam between two correct systems is where games actually break. Run the thing.**
