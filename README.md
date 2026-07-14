# Ballot / Waste

> You may cast as many votes as time allows.
> You may choose the force and direction of every throw.
> But you do not control the political wind.

A short, mobile-first political satire game. You stand in a polling station, crumple your ballot, and swipe it towards a container labelled **BALLOT / WASTE**. The room is full of wind — and the wind is made of politicians' speeches. Every statement reinforces, weakens or reverses it, and bends your ballot off course.

The central metaphor:

> **The voter casts the ballot, but political performance shapes the atmosphere through which it must travel.**

You can only get the ballot in the bin by aiming at where the wind will carry it, not where you meant it to go.

---

## Status

Pre-production. Design is settled; no code yet.

| Document | Contents |
| --- | --- |
| [`CONCEPT.md`](CONCEPT.md) | The why — theme, metaphor, political framing, visual direction, decision history. |
| [`GDD-PROTOTYPE.md`](GDD-PROTOTYPE.md) | The how — world model, gesture maths, wind parameters, asset list, build order. |
| [`IMPLEMENTATION-PLAN.md`](IMPLEMENTATION-PLAN.md) | Stages 0–6, the two go/no-go gates, and where code stops and a human starts. |
| [`PROCESS-LOG.md`](PROCESS-LOG.md) | **How this was designed with an AI partner** — including where the AI was wrong. |
| [`concept-art/`](concept-art/) | Visual direction boards, and the three defects that survived regeneration. |

### On the process log

Playable Stories repos are teaching material as well as version control. [`PROCESS-LOG.md`](PROCESS-LOG.md) records how the design actually got made — what the AI caught, what it derived, what it argued for that would have damaged the game, and where the designer overruled it. A log that only records good decisions teaches nobody anything.

## Design at a glance

| | |
| --- | --- |
| Input | Upward swipe. Angle it to counter the wind. Nothing else. |
| Candidates | Fictional archetypes — **The Strong Leader**, **The Outsider**. No real likenesses, names, or invented quotations. |
| Wind | One signed scalar. Accumulates across throws, decays slowly, capped so it is **always counterable**. |
| Score | Ballots in the bin. That is the whole scoreboard. |
| Session | 75 seconds. |
| Visuals | Stylised low-poly, as 2D sprites over a 2.5D room. |
| Stack | Phaser 4.1 · TypeScript · Vite. |

Two rules hold the design together. The bin's catch window is **forgiving in depth and tight laterally**, so sloppy power survives and sloppy wind-reading does not — that is what makes the wind the skill. And the wind cap is derived, not guessed: the strongest possible wind is *just* beatable by the strongest possible counter-swipe. If wind ever exceeded counter-steer, the game would quietly start arguing that voting is futile, which is a lazier claim than the one it is making.

## The question the prototype exists to answer

> Does hearing a political statement, seeing it alter the wind, and then compensating through a ballot throw communicate the idea that political speech shapes the environment of voting?

Everything not serving that question is out of scope.

---

Inspired by the framing around the 2026 Clacton by-election, but built to outlive it — candidates and speeches are data, so a new election is a content pack, not a rewrite.
