# Process Log — designing Ballot / Waste with an AI partner

**Session 1 · 14 July 2026 · Claude Opus 4.8 in Claude Code**

Playable Stories repos are teaching material as well as version control. This log records how the design actually got made — including the parts that went sideways — because a log that only records good decisions teaches nobody anything.

Nothing here is reconstructed. It is what happened, in order.

---

## Where it started

The designer arrived with a **finished 19-section concept document** and **three AI-generated visual direction boards**. Not a prompt, not a vibe — a real brief, with a thesis:

> The voter casts the ballot, but political performance shapes the atmosphere through which it must travel.

The instruction was: *read this, come back for discussion.* Not *build this*. That framing did most of the work. What followed was a design review, not a code-generation session.

**Lesson 1 — bring a thesis.** The model can build almost anything, and will happily build the wrong thing beautifully. Every good decision below traces back to the designer already knowing what the game was *about*. The AI's contribution was pressure-testing the thesis, not supplying one.

---

## What the review found: the docs and the pictures disagreed

The concept doc and the three boards had been produced separately, and they contradicted each other in four places. **All four contradictions were in the pictures, and all four were the pictures drifting toward convention:**

| The doc said | Every board said |
| --- | --- |
| Swipe angle. Gyroscope explicitly ruled out. | "TILT LEFT OR RIGHT TO FIGHT THE WIND" |
| Fictional archetypes. No real politicians. | Recognisable Trump and Clinton likenesses |
| Points de-emphasised; final count only | "LONGER THROW = MORE POINTS" |
| Never hard-code ideology as red-versus-blue | Blue left, red right, mirror-symmetric |

None of these were random. The image generator reached for the most conventional version of a political game — a tilt control because that's what mobile games do, real politicians because that's what political satire looks like, points because that's what games have, red-versus-blue because that's what politics looks like. **Left alone, generative tools regress to the mean of their training data, and the mean is a cliché.**

The "LONGER THROW = MORE POINTS" caption was the tell. It isn't just off-brief; it's *incoherent* — the bin is at a fixed distance, so there is no long throw to reward. The board looked authoritative and said something impossible.

**Lesson 2 — generated art is a proposal, not a spec.** Read it as adversarially as you'd read a contract. The prettier it is, the more it gets away with.

**Lesson 3 — the drift is where the design lives.** Each contradiction turned out to be a real fork the designer hadn't yet chosen. The boards were useful precisely *because* they were wrong: they surfaced four decisions that were still open.

---

## The four decisions

Presented as forks. Answered in one line:

> **Swipe only, archetypes, low-poly, no "independent vote", bin count is our only real score at the moment.**

Each one closed a door deliberately:

**Swipe only.** Tilt is a second continuous input competing with the throw for attention, and it makes the game unplayable one-handed on a bus — which is exactly where it should be playable.

**Archetypes.** A satire about a live by-election showing identifiable politicians speaking invented lines is a materially different legal and editorial object from one that doesn't. It also throws away the reusability that lets the game outlive one news cycle.

**Low-poly.** Not the most beautiful of the three boards — the cardboard theatre was — but the only one where you can actually see where the ball is in its arc. **Legibility beat beauty**, and, as it turned out much later, low-poly is also the one style that can be authored in code.

**Bin count only.** See below. This is the one the AI got wrong.

---

## Where the AI was overruled, and was wrong

The original doc had a throwaway idea in a "secondary scoring" list: an **"independent vote" bonus** for landing a ballot close to the player's *intended* line rather than the wind-corrected one.

The AI argued — at some length, and with some confidence — that this was the thematic heart of the game and should be promoted from a footnote to the primary metric. The reasoning sounded good: the game's real argument is *you only succeed by aiming where the wind takes you*, so measuring intention-versus-compensation puts the thesis on the scoreboard.

**The designer cut it. The designer was right.**

Scoring the player for ignoring the wind creates a second objective that quietly instructs them to **stop reading the room** — which is the one behaviour the entire game exists to produce. It would have shipped a mechanic that argued against its own thesis, and it would have needed an end screen that explained itself, when the ending works precisely because it doesn't.

The theme doesn't need a counter. It's already in the physics: the ballot goes in when you aim where the wind takes it. The player feels that with no number attached — and a number would only have given them something to argue with.

**Lesson 4 — the model's most dangerous output is a confident, elegant argument for a bad idea.** It was articulate, it was thematically coherent, and it would have damaged the game. The designer's "no" took four words. It was worth more than the paragraph that preceded it.

This is written into `CONCEPT.md` §10 as a rejection, not quietly retconned into having always been the plan. **If the log only records the AI being right, the log is lying.**

---

## Where the AI earned its keep

**It derived a number that turned out to be load-bearing.** The doc said "wind should be capped so the game remains playable" — a sensible instinct with no value attached. Working it through: over a 1.1s flight, the strongest legal wind drags the ball 2.72m sideways; the strongest available counter-swipe moves it 3.09m. **So the cap is 4.5 m/s² — the strongest wind that is still *just* beatable.**

That isn't a tuning value. It's the mechanical guarantee behind the theme. The moment wind exceeds counter-steer, skill stops mattering and the game starts quietly arguing *voting is futile* — a lazier and less true claim than the one the designer is making. The constant is now documented as a rule, with the derivation, so nobody bumps it later in a tuning pass and breaks the argument without noticing.

**It found an asymmetry the design needed but hadn't stated.** The bin's catch window is forgiving in depth (±0.55m) and tight laterally (±0.30m). Sloppy power survives; sloppy wind-reading does not. That single asymmetry is what makes *wind* the skill rather than *throw strength* — and it was implied by the design but written down nowhere.

**Lesson 5 — the model is at its best turning stated intent into mechanical consequence.** The designer said "playable." The AI worked out that "playable" had a number, and that the number was doing philosophical work.

---

## The part that had nothing to do with games

The repo was to be public. The concept art still contained the Trump and Clinton likenesses — fine as private scratch material, materially different once published under an organisation's name and cached by GitHub forever.

**The AI stopped before pushing and asked.** Not because it was forbidden — the designer had explicitly asked for a public repo, and a compliant tool would have shipped it. Because publishing is the hard-to-undo step, and the material contradicted the project's own §6.

The designer's answer was better than any of the options offered: *"Let me update the concept art and replace the figures."* **Fix it at the source rather than deciding what to hide.**

The PNGs were held out of the first commit, so no real likeness ever entered the public history — nothing to scrub, nothing cached, no fork carrying it. The replacements arrived, the AI **looked at all three before committing**, confirmed the likenesses were gone, and pushed.

**Lesson 6 — the irreversible steps deserve a pause, even when you've been authorised.** Especially then.

---

## An honest boundary: what the AI cannot do

Asked directly whether the game could be "vibe coded 0 to 100," or whether it would have to move to a real engine and real art, the answer was:

**Code: 100%. No engine migration, ever.** One room, one fixed camera, one moving object, one scalar force. The physics is twenty lines. An engine would charge an asset pipeline and megabytes of download for nothing.

**But the boundary isn't prototype-versus-full. It's code-versus-art.** Three things the model genuinely cannot do:

* **Raster images.** No PNGs, no renders. It could not have made those boards.
* **Original audio.** It can wire and mix; it cannot author.
* **Feel whether it's fun.** It can prove the wind is beatable. It cannot tell you whether compensating for it *feels good in the hand*. That loop needs a human holding a phone, and it is the loop that decides whether the game works at all.

The lucky accident: **low-poly is the one art style that is itself code.** Flat-shaded triangles are data. The crumpled ballot is literally a low-poly sphere with jittered vertices. Most of the 22-item asset list turns out to be code once you look at it — which means the visual direction chosen for *legibility* also happened to be the one the AI could build alone.

**Lesson 7 — ask the model where it stops.** It will tell you, and the answer is usually more specific and more useful than "AI can't do art."

---

## What actually got made today

No game code. Four documents and a corrected set of boards:

| | |
| --- | --- |
| `CONCEPT.md` | The revised concept — every original section kept, every alternative kept, each annotated with the decision and the reasoning. A record, not a clean-up. |
| `GDD-PROTOTYPE.md` | The build spec — world model, gesture maths, wind parameters, asset list, build order. |
| `IMPLEMENTATION-PLAN.md` | Stages 0–6, two hard go/no-go gates, the art decision, the renderer seam. |
| `concept-art/` | Three boards, re-cast with fictional figures — and a README listing the three defects that *survived* the regeneration, so nobody copies them uncritically. |

The rejected alternatives were **kept, not deleted.** Someone will ask in three weeks why it isn't the cardboard one. The answer is written down: it lost on production time against the election date, not on merit, and it's the natural upgrade path if the project continues.

---

## The method, if you want to steal it

1. **Bring a thesis.** The model supplies competence, not intent.
2. **Generate art early, and read it as an adversary.** Where it drifts from your brief is where your brief has holes.
3. **Make the model argue.** Then overrule it when it's wrong — it will be, fluently.
4. **Make it derive your hand-wavy words into numbers.** "Playable" had a value. So did "readable."
5. **Write down the rejections, with reasons.** Including the model's.
6. **Pause before the irreversible step**, even when authorised.
7. **Ask where it stops.** Plan the human's time around that boundary, not around a guess.

---

## Open, going into session 2

* **The art path** — code-drawn, hybrid, or production art. Recommended: hybrid.
* **Stage 1 go/no-go**: does the arc read as depth on a real phone?
* **Stage 2 go/no-go**: can five strangers read the wind from the room, with no meter?

The second one is the whole game. Everything before it is scaffolding, and everything after it is decoration.
