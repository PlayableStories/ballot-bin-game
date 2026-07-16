import Phaser from 'phaser';
import { BIN, PALETTE, SCREEN, BALL_R, WORLD, CAMERA } from '../config';
import { project, projectShadow, shadowFalloff, type Vec3 } from '../systems/Projection';
import type { Ballot } from '../systems/Ballistics';
import type { Candidate } from '../systems/Speeches';
import type { GustPhase } from '../systems/Wind';
import type { Renderer } from './Renderer';

/**
 * Stage 2 — still grey boxes, now blown by politics.
 *
 * Everything here is a rectangle, an ellipse, or a line, exactly as in Stage 1.
 * That is the whole point of the go/no-go: if a player can read the wind from
 * leaning bunting and drifting litter and a swinging sign — with NO numeric
 * meter and NO art — then the thesis holds, and art is polish. If they can't,
 * no art will save it, and we find that out now, cheaply.
 *
 *   Bunting lean · leaflet drift · slogan words · the hanging sign
 *
 * are all driven off one number: `w = W / WIND.MAX` in [-1, 1]. The room is the
 * meter.
 */

/** Where the two candidates stand — flanking the lane, back toward the bin. */
const PODIUM: Record<Candidate, { x: number; z: number }> = {
  STRONG_LEADER: { x: -1.2, z: 5.2 },
  OUTSIDER: { x: 1.2, z: 5.2 },
};
const PODIUM_H = 1.15; // metres

interface Leaflet {
  rect: Phaser.GameObjects.Rectangle;
  x: number; // world, on the floor
  z: number;
}

interface Slogan {
  obj: Phaser.GameObjects.Text;
  vx: number; // px/s
  vy: number;
  life: number;
  maxLife: number;
}

export class GreyboxRenderer implements Renderer {
  private scene!: Phaser.Scene;
  private ballot!: Phaser.GameObjects.Container;
  private shadow!: Phaser.GameObjects.Ellipse;
  private landed: Phaser.GameObjects.Ellipse[] = [];
  private landedLayer!: Phaser.GameObjects.Container;
  private binFront!: Phaser.GameObjects.Container;

  // --- Stage 2 room reactions ------------------------------------------------
  private bunting!: Phaser.GameObjects.Graphics;
  private sign!: Phaser.GameObjects.Container;
  private signAng = 0;
  private signVel = 0;
  private gustFlash!: Phaser.GameObjects.Text;
  private leaflets: Leaflet[] = [];
  private slogans: Slogan[] = [];
  private podiums!: Record<Candidate, { body: Phaser.GameObjects.Rectangle; glow: number }>;
  private windNorm = 0;

  create(scene: Phaser.Scene): void {
    this.scene = scene;

    this.drawRoom();
    this.buildPodiums();
    this.buildIndicators();

    // Landed ballots sit above the floor but below the bin's front lip.
    this.landedLayer = scene.add.container(0, 0);

    // The shadow goes down before the ball, always. It is the depth cue.
    this.shadow = scene.add.ellipse(0, 0, 40, 14, PALETTE.SHADOW).setAlpha(0);

    this.ballot = scene.add.container(0, 0);
    const ball = scene.add.circle(0, 0, 1, PALETTE.BALLOT);
    // A crossed facet, so rotation is visible and the ball reads as a solid
    // object tumbling rather than a flat disc sliding.
    const facet = scene.add
      .rectangle(0, 0, 1.2, 0.35, 0x000000)
      .setAlpha(0.18);
    this.ballot.add([ball, facet]);
    this.ballot.setVisible(false);

    this.drawBinFront();
  }

  /** Room, floor, lane, and the bin's back half. */
  private drawRoom(): void {
    const s = this.scene;
    const horizon = SCREEN.H * CAMERA.HORIZON_FRAC;

    // Back wall above the horizon, floor below. The horizon line itself is the
    // strongest single depth cue after the shadow.
    s.add.rectangle(SCREEN.W / 2, horizon / 2, SCREEN.W, horizon, PALETTE.ROOM_WALL);
    s.add.rectangle(
      SCREEN.W / 2,
      horizon + (SCREEN.H - horizon) / 2,
      SCREEN.W,
      SCREEN.H - horizon,
      PALETTE.ROOM_FLOOR,
    );

    // The throwing lane, drawn in world space so it converges correctly. Two
    // rails running from the player's feet to the bin: free perspective.
    const rail = s.add.graphics();
    rail.lineStyle(3, PALETTE.LANE, 0.9);
    for (const x of [-0.75, 0.75]) {
      const near = project({ x, y: 0, z: 0 });
      const far = project({ x, y: 0, z: BIN.z + 1.5 });
      rail.lineBetween(near.x, near.y, far.x, far.y);
    }

    // Floor bands. Regular spacing in WORLD units, so they bunch up with
    // distance exactly as they should — this is what sells depth for free.
    const bands = s.add.graphics();
    bands.lineStyle(2, PALETTE.LANE, 0.35);
    for (let z = 1; z <= BIN.z + 1.5; z += 1) {
      const l = project({ x: -0.75, y: 0, z });
      const r = project({ x: 0.75, y: 0, z });
      bands.lineBetween(l.x, l.y, r.x, r.y);
    }

    // Bin, back half. Drawn as a box in world space.
    const back = s.add.graphics();
    const rimL = project({ x: BIN.x - BIN.CATCH.lateral, y: BIN.RIM_Y, z: BIN.z });
    const rimR = project({ x: BIN.x + BIN.CATCH.lateral, y: BIN.RIM_Y, z: BIN.z });
    const botL = project({ x: BIN.x - BIN.CATCH.lateral, y: WORLD.FLOOR_Y, z: BIN.z });
    const botR = project({ x: BIN.x + BIN.CATCH.lateral, y: WORLD.FLOOR_Y, z: BIN.z });

    back.fillStyle(PALETTE.BIN, 1);
    back.fillPoints(
      [
        new Phaser.Math.Vector2(rimL.x, rimL.y),
        new Phaser.Math.Vector2(rimR.x, rimR.y),
        new Phaser.Math.Vector2(botR.x, botR.y),
        new Phaser.Math.Vector2(botL.x, botL.y),
      ],
      true,
    );

    s.add
      .text((rimL.x + rimR.x) / 2, (rimL.y + botL.y) / 2, 'BALLOT\nWASTE', {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: '#f2efe6',
        align: 'center',
      })
      .setOrigin(0.5);
  }

  /**
   * The two podiums. Dim in their campaign colour so you can always tell them
   * apart; they light up when their candidate is speaking (see `speak`).
   */
  private buildPodiums(): void {
    const s = this.scene;
    const mk = (cand: Candidate, colour: number) => {
      const foot = project({ x: PODIUM[cand].x, y: 0, z: PODIUM[cand].z });
      const top = project({ x: PODIUM[cand].x, y: PODIUM_H, z: PODIUM[cand].z });
      const h = foot.y - top.y;
      const w = 0.7 * foot.scale * CAMERA.PPM;
      const body = s.add
        .rectangle(foot.x, (foot.y + top.y) / 2, w, h, colour)
        .setAlpha(0.3)
        .setDepth(8);
      return { body, glow: 0 };
    };
    this.podiums = {
      STRONG_LEADER: mk('STRONG_LEADER', PALETTE.STRONG_LEADER),
      OUTSIDER: mk('OUTSIDER', PALETTE.OUTSIDER),
    };
  }

  /** Bunting across the back wall, the hanging PUBLIC OPINION sign, floor litter. */
  private buildIndicators(): void {
    const s = this.scene;

    // Bunting — the primary read. A line of pennants strung across the back
    // wall, redrawn every frame with a wind-driven lean.
    this.bunting = s.add.graphics().setDepth(2);

    // The hanging sign. Pivots from its top; swings with lag and overshoot.
    this.sign = s.add.container(SCREEN.W / 2, SCREEN.H * 0.14).setDepth(3);
    const board = s.add.rectangle(0, 46, 190, 46, PALETTE.BIN_RIM).setAlpha(0.9);
    const cord = s.add.rectangle(0, 12, 2, 24, PALETTE.LANE);
    const label = s.add
      .text(0, 46, 'PUBLIC OPINION', {
        fontFamily: 'monospace',
        fontSize: '16px',
        color: '#1a1a1f',
      })
      .setOrigin(0.5);
    this.sign.add([cord, board, label]);

    // Gust warning — invisible until a gust telegraphs, then it pulses.
    this.gustFlash = s.add
      .text(SCREEN.W / 2, SCREEN.H * 0.3, '⚠ GUST', {
        fontFamily: 'monospace',
        fontSize: '30px',
        color: '#d98b2b',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setDepth(90)
      .setAlpha(0);

    // Floor leaflets — litter that drifts with the wind. Always present; the
    // speed and direction of the drift is the read, not the count.
    for (let i = 0; i < 9; i++) {
      const x = (i / 8 - 0.5) * 3;
      const z = 1.3 + (i % 3) * 1.4 + (i % 2) * 0.5;
      const rect = s.add.rectangle(0, 0, 10, 6, PALETTE.PAPER).setAlpha(0.5).setDepth(1);
      this.leaflets.push({ rect, x, z });
      this.placeLeaflet(this.leaflets[i]);
    }
  }

  private placeLeaflet(lf: Leaflet): void {
    const p = project({ x: lf.x, y: 0, z: lf.z });
    const sc = Math.max(0.4, p.scale);
    lf.rect.setPosition(p.x, p.y).setScale(sc);
  }

  /**
   * The bin's front lip, drawn OVER the ball.
   *
   * Without this a ball landing in the bin just vanishes; with it, you watch it
   * sink behind the rim. It is the difference between "the counter went up" and
   * "it went IN", and it costs ten lines.
   */
  private drawBinFront(): void {
    const s = this.scene;
    this.binFront = s.add.container(0, 0);

    const l = project({ x: BIN.x - BIN.CATCH.lateral, y: BIN.RIM_Y, z: BIN.z });
    const r = project({ x: BIN.x + BIN.CATCH.lateral, y: BIN.RIM_Y, z: BIN.z });
    const w = r.x - l.x;

    const lip = s.add
      .ellipse((l.x + r.x) / 2, l.y, w, w * 0.28, PALETTE.BIN_RIM)
      .setStrokeStyle(2, PALETTE.BIN_RIM);
    // Bottom half only would need a mask; a thin rim reads well enough in grey-box.
    const front = s.add.rectangle((l.x + r.x) / 2, l.y + 8, w, 16, PALETTE.BIN);

    this.binFront.add([lip, front]);
  }

  drawBallot(b: Ballot | null): void {
    if (!b) {
      this.ballot.setVisible(false);
      this.shadow.setAlpha(0);
      return;
    }

    const p = project(b.pos);
    const sh = projectShadow(b.pos);
    const fall = shadowFalloff(b.pos.y);

    const r = BALL_R * p.scale * CAMERA.PPM;

    this.ballot
      .setVisible(true)
      .setPosition(p.x, p.y)
      .setScale(r)
      .setRotation(b.rotation)
      // Depth-sort against the bin's front lip so a ball entering the bin passes
      // BEHIND it, and a ball short of the bin passes in front.
      .setDepth(b.pos.z < BIN.z ? 20 : 5);

    const shR = BALL_R * sh.scale * CAMERA.PPM * fall.spread;
    this.shadow
      .setPosition(sh.x, sh.y)
      .setSize(shR * 2, shR * 0.7)
      .setAlpha(fall.alpha)
      .setDepth(4);

    this.binFront.setDepth(10);
    this.landedLayer.setDepth(6);
  }

  addLanded(at: Vec3): void {
    const p = project(at);
    const r = BALL_R * p.scale * CAMERA.PPM;

    const dot = this.scene.add
      .ellipse(p.x, p.y + r * 0.4, r * 2, r * 1.5, PALETTE.BALLOT)
      .setAlpha(0.85);

    this.landedLayer.add(dot);
    this.landed.push(dot);
  }

  /**
   * The room reacts to the wind. Every indicator here reads off the same
   * normalised `w`, so they always agree — the bunting, the litter and the sign
   * are one instrument seen three ways, never three conflicting dials.
   */
  updateRoom(dt: number, windNorm: number, gust: GustPhase): void {
    this.windNorm = windNorm;

    this.drawBunting(windNorm);
    this.driveSign(dt, windNorm, gust);
    this.driftLeaflets(dt, windNorm, gust);
    this.driveSlogans(dt, windNorm);
    this.driveGustFlash(dt, gust);
    this.fadePodiums(dt);
  }

  /** Pennants leaning off vertical by `w * 30°`. The primary read. */
  private drawBunting(w: number): void {
    const g = this.bunting;
    g.clear();

    const y0 = SCREEN.H * 0.09;
    const x0 = SCREEN.W * 0.1;
    const x1 = SCREEN.W * 0.9;
    const n = 9;
    const lean = Math.tan(w * (30 * Math.PI) / 180);
    const droop = 26; // how far each pennant hangs

    g.lineStyle(2, PALETTE.LANE, 0.9);
    g.lineBetween(x0, y0, x1, y0); // the string
    g.fillStyle(PALETTE.BIN_RIM, 0.9);

    for (let i = 0; i < n; i++) {
      const hx = x0 + ((x1 - x0) * i) / (n - 1);
      const tipX = hx + lean * droop;
      const tipY = y0 + droop;
      g.fillTriangle(hx - 9, y0, hx + 9, y0, tipX, tipY);
    }
  }

  /** The sign swings toward `w * 45°`, on a spring, so it lags and overshoots. */
  private driveSign(dt: number, w: number, gust: GustPhase): void {
    let target = w * (45 * Math.PI) / 180;
    // A telegraphing gust rattles the sign before the force ever reaches the ball.
    if (gust === 'telegraph') target += Math.sin(this.scene.time.now / 40) * 0.25;

    const STIFF = 45;
    const DAMP = 7;
    this.signVel += (target - this.signAng) * STIFF * dt - this.signVel * DAMP * dt;
    this.signAng += this.signVel * dt;
    this.sign.setRotation(this.signAng);
  }

  /** Litter slides along the wind and wraps around, so drift never runs out. */
  private driftLeaflets(dt: number, w: number, gust: GustPhase): void {
    const boost = gust === 'hit' ? 2.2 : 1;
    for (const lf of this.leaflets) {
      lf.x += w * 2.4 * boost * dt;
      if (lf.x > 2) lf.x = -2;
      else if (lf.x < -2) lf.x = 2;
      this.placeLeaflet(lf);
    }
  }

  /** Slogan words rise from the podium and are carried off along the wind. */
  private driveSlogans(dt: number, w: number): void {
    const survivors: Slogan[] = [];
    for (const s of this.slogans) {
      s.vx += w * 260 * dt; // advected by the wind — this is a read too
      s.life -= dt;
      if (s.life <= 0) {
        s.obj.destroy();
        continue;
      }
      s.obj.x += s.vx * dt;
      s.obj.y += s.vy * dt;
      s.obj.setAlpha(Math.min(1, s.life / (s.maxLife * 0.6)));
      survivors.push(s);
    }
    this.slogans = survivors;
  }

  private driveGustFlash(dt: number, gust: GustPhase): void {
    const target = gust === 'none' ? 0 : 1;
    const pulse = 0.55 + 0.45 * Math.sin(this.scene.time.now / 90);
    const a = this.gustFlash.alpha + (target - this.gustFlash.alpha) * Math.min(1, dt * 8);
    this.gustFlash.setAlpha(a * (gust === 'none' ? 1 : pulse));
  }

  private fadePodiums(dt: number): void {
    for (const cand of ['STRONG_LEADER', 'OUTSIDER'] as Candidate[]) {
      const p = this.podiums[cand];
      p.glow = Math.max(0, p.glow - dt * 0.9);
      p.body.setAlpha(0.3 + 0.7 * p.glow);
    }
  }

  speak(candidate: Candidate, words: string[]): void {
    this.podiums[candidate].glow = 1;

    const foot = project({ x: PODIUM[candidate].x, y: PODIUM_H, z: PODIUM[candidate].z });
    const colour = candidate === 'STRONG_LEADER' ? '#d98b2b' : '#2b8f8f';

    words.forEach((word, i) => {
      const obj = this.scene.add
        .text(foot.x + (i - 1) * 18, foot.y - i * 14, word, {
          fontFamily: 'monospace',
          fontSize: '18px',
          color: colour,
          fontStyle: 'bold',
        })
        .setOrigin(0.5)
        .setDepth(85);

      // Fired upward and slightly toward the current wind, then the wind takes over.
      this.slogans.push({
        obj,
        vx: this.windNorm * 40 + (i - 1) * 10,
        vy: -70 - i * 12,
        life: 2.4,
        maxLife: 2.4,
      });
    });
  }

  reset(): void {
    for (const l of this.landed) l.destroy();
    this.landed = [];
    for (const s of this.slogans) s.obj.destroy();
    this.slogans = [];
    this.signAng = 0;
    this.signVel = 0;
    this.sign.setRotation(0);
    this.gustFlash.setAlpha(0);
    for (const cand of ['STRONG_LEADER', 'OUTSIDER'] as Candidate[]) {
      this.podiums[cand].glow = 0;
      this.podiums[cand].body.setAlpha(0.3);
    }
    this.ballot.setVisible(false);
    this.shadow.setAlpha(0);
  }
}
