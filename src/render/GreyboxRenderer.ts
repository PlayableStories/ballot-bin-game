import Phaser from 'phaser';
import { BIN, PALETTE, SCREEN, BALL_R, WORLD, CAMERA } from '../config';
import { project, projectShadow, shadowFalloff, type Vec3 } from '../systems/Projection';
import type { Ballot } from '../systems/Ballistics';
import type { Renderer } from './Renderer';

/**
 * Stage 1 — grey boxes only.
 *
 * Every shape here is a rectangle or an ellipse. That is deliberate: this stage
 * exists to answer ONE question, and art would only make the answer harder to
 * trust.
 *
 *   Does the arc read as travelling INTO the room, on a real phone?
 *
 * If it doesn't, no amount of low-poly polish rescues it, and we fix the
 * projection before building anything else on top.
 */
export class GreyboxRenderer implements Renderer {
  private scene!: Phaser.Scene;
  private ballot!: Phaser.GameObjects.Container;
  private shadow!: Phaser.GameObjects.Ellipse;
  private landed: Phaser.GameObjects.Ellipse[] = [];
  private landedLayer!: Phaser.GameObjects.Container;
  private binFront!: Phaser.GameObjects.Container;

  create(scene: Phaser.Scene): void {
    this.scene = scene;

    this.drawRoom();

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

  setWind(_normalised: number): void {
    // Stage 2. The room reacts to the wind — bunting, leaflets, slogan words.
    // Nothing to do while the wind is always zero.
  }

  reset(): void {
    for (const l of this.landed) l.destroy();
    this.landed = [];
    this.ballot.setVisible(false);
    this.shadow.setAlpha(0);
  }
}
