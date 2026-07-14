# Concept art — visual direction boards

Three exploratory boards. Generated 14 July 2026, reviewed the same day, figures re-cast as fictional archetypes after review. Lettering matches `../CONCEPT.md` §11.

| File | Direction | Status |
| --- | --- | --- |
| `direction-a-photocopy-collage.png` | Photocopied political collage | ❌ Rejected |
| `direction-b-cardboard-theatre.png` | Cardboard political theatre | ❌ Rejected — natural upgrade path |
| `direction-c-low-poly-ADOPTED.png` | Stylised low-poly | ✅ **Adopted** |

Reasoning is in `../CONCEPT.md` §11. In short: **A** lost on trajectory legibility — the board itself proves the risk, since you genuinely cannot tell where the bin sits in depth or where the ball is in its arc. **B** lost on production time against the 13 August election window rather than on merit; it is the best thematic fit of the three and the place the art should go if the project continues. **C** won because the arc reads unambiguously on a small screen and it is the fastest to build.

**Resolved 14 July:** the first drafts of A and C depicted recognisable real politicians. All figures have been re-cast as fictional archetypes. No real likenesses remain in any board — see `../CONCEPT.md` §6, which makes this a hard line for the game itself.

---

## ⚠️ These boards still carry three defects. Do not copy them uncorrected.

**1. The control caption is wrong on A and C.** They say *"TILT TO COUNTER THE WIND"* and *"TILT LEFT OR RIGHT TO FIGHT THE WIND"*. **There is no tilt control.** The game is swipe-angle only — no gyroscope, no drag-back. Correct copy: **SWIPE UP TO THROW**, and on first run only, **ANGLE YOUR SWIPE TO BEAT THE WIND**. (Board B's *"ANGLE AGAINST THE WIND"* is close to right.)

**2. Board A promises "LONGER THROW = MORE POINTS".** There are no points. The score is ballots in the bin, and the bin sits at a fixed distance, so there is no long throw to reward.

**3. All three stage red-left versus blue-right in mirror symmetry.** This is the important one. It hard-codes the wind as an ideological seesaw and hands the player the wrong reading — *"both sides push you around, they're all the same"* — which is a lazier point than the one the game is making, namely that **rhetoric accumulates.**

The fixes, both already in the spec (`../CONCEPT.md` §12):

* **Palette is amber and teal.** No red, no blue. Colour identifies a *campaign*, never a side. The wind axis is physical; it must not double as an ideological one.
* **The candidates are not a pair.** They may push the wind the *same* direction on consecutive speeches, and often will. A player who learns "left speaker means left wind" has learned the wrong game. Break the mirror: different podium heights, one candidate nearer camera, anything that stops them reading as balanced opposites.

Board A additionally splits its slogans along a recognisable national partisan line (`WIN!` / `LAW & ORDER!` against `FACTS!` / `HOPE` / `EQUALITY`) and hangs a US flag. The archetypes are **The Strong Leader** and **The Outsider** — rhetorical styles, not parties, and not American.

---

## What board C is actually good for

The composition and depth staging: vanishing point on the bin, the floor lane arrow, podiums clear of the throwing lane, the ball's dotted arc with its shadow beneath it, and the HUD split of `IN THE BIN` / `TIME LEFT` / `ON THE FLOOR`. That layout works and should carry through to the build.

Take the layout. Leave the palette and the copy.
