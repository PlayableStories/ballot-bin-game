import Phaser from 'phaser';
import { SCREEN, SESSION, PALETTE, WORLD, DEBUG } from '../config';
import { readSwipe, addNoise, type Sample } from '../systems/Gesture';
import { launch, step, resolve, type Ballot } from '../systems/Ballistics';
import { GreyboxRenderer } from '../render/GreyboxRenderer';
import type { Renderer } from '../render/Renderer';
import { panel } from '../debug/TuningPanel';

/** Fixed physics step. Decoupled from the frame rate so a 120Hz phone plays the same as a 60Hz one. */
const FIXED_DT = 1 / 60;
const MAX_FRAME = 0.1;

export class PlayScene extends Phaser.Scene {
  private view: Renderer = new GreyboxRenderer();

  private ballot: Ballot | null = null;
  private held = true; // a fresh ballot waits in the hand
  private accumulator = 0;

  private timeLeft: number = SESSION.DURATION_S;
  private inBin = 0;
  private onFloor = 0;
  private over = false;

  private samples: Sample[] = [];

  private hudTime!: Phaser.GameObjects.Text;
  private hudBin!: Phaser.GameObjects.Text;
  private hudFloor!: Phaser.GameObjects.Text;
  private hint!: Phaser.GameObjects.Text;
  private hand!: Phaser.GameObjects.Ellipse;

  constructor() {
    super('Play');
  }

  create(): void {
    this.view.create(this);
    this.buildHud();
    this.bindInput();
    this.resetSession();
  }

  private buildHud(): void {
    const mono = { fontFamily: 'monospace', fontSize: '28px', color: '#f2efe6' };

    this.hudTime = this.add.text(SCREEN.W / 2, 40, '', { ...mono, fontSize: '40px' })
      .setOrigin(0.5, 0)
      .setDepth(100);

    this.hudBin = this.add.text(24, 40, '', { ...mono, color: '#2b8f8f' }).setDepth(100);
    this.hudFloor = this.add.text(SCREEN.W - 24, 40, '', { ...mono, color: '#d98b2b' })
      .setOrigin(1, 0)
      .setDepth(100);

    // The ballot resting in the hand, before the throw.
    this.hand = this.add
      .ellipse(SCREEN.W / 2, SCREEN.H - 150, 130, 130, PALETTE.BALLOT)
      .setDepth(50);

    this.hint = this.add
      .text(SCREEN.W / 2, SCREEN.H - 48, 'SWIPE UP TO THROW', {
        fontFamily: 'monospace',
        fontSize: '26px',
        color: '#f2efe6',
      })
      .setOrigin(0.5)
      .setDepth(100);
  }

  private bindInput(): void {
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (this.over || !this.held) return;
      this.samples = [{ x: p.x, y: p.y, t: this.time.now }];
    });

    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (!p.isDown || !this.samples.length) return;
      this.samples.push({ x: p.x, y: p.y, t: this.time.now });
    });

    this.input.on('pointerup', (p: Phaser.Input.Pointer) => {
      if (this.over || !this.held || !this.samples.length) return;
      this.samples.push({ x: p.x, y: p.y, t: this.time.now });

      const swipe = readSwipe(this.samples, SCREEN.H);
      this.samples = [];

      // A rejected gesture costs nothing. No ballot is consumed, no penalty.
      if (!swipe) return;

      this.throwBallot(swipe.power, swipe.theta);
    });
  }

  private throwBallot(power: number, theta: number): void {
    const t = addNoise({ power, theta });
    this.ballot = launch(t.power, t.theta);
    this.held = false;
    this.hand.setVisible(false);
    this.hint.setVisible(false);
  }

  update(_now: number, deltaMs: number): void {
    const dt = Math.min(deltaMs / 1000, MAX_FRAME);

    if (!this.over) {
      this.timeLeft = Math.max(0, this.timeLeft - dt);
      // The timer expiring does not snatch a ballot out of the air. Anything
      // already in flight is allowed to land, and to count.
      if (this.timeLeft === 0 && !this.ballot) this.endSession();
    }

    this.accumulator += dt;
    while (this.accumulator >= FIXED_DT) {
      this.accumulator -= FIXED_DT;
      this.stepPhysics(FIXED_DT);
    }

    this.view.drawBallot(this.ballot);
    this.drawHud();
  }

  private stepPhysics(dt: number): void {
    if (!this.ballot) return;

    // Stage 2 is where politics blows this. Until then it is a hand-dialled
    // constant from the tuning panel, so the wind can be FELT before it can speak.
    const wind = DEBUG.wind;

    const next = step(this.ballot, wind, dt);
    const landing = resolve(this.ballot, next);

    switch (landing.kind) {
      case 'flying':
        this.ballot = next;
        return;

      case 'in':
        this.inBin++;
        panel.recordThrow(true);
        this.ballot = null;
        this.afterLanding();
        return;

      case 'rim':
      case 'floor': {
        this.onFloor++;
        panel.recordThrow(false);
        // The ballot stays where it fell, for the whole session. By the end the
        // floor is a physical record of the election.
        this.view.addLanded(
          landing.kind === 'floor'
            ? landing.at
            : { x: landing.at.x, y: WORLD.FLOOR_Y, z: landing.at.z },
        );
        this.ballot = null;
        this.afterLanding();
        return;
      }
    }
  }

  private afterLanding(): void {
    if (this.timeLeft === 0) {
      this.endSession();
      return;
    }
    this.time.delayedCall(SESSION.RESPAWN_S * 1000, () => {
      if (this.over) return;
      this.held = true;
      this.hand.setVisible(true);
    });
  }

  private drawHud(): void {
    const s = Math.ceil(this.timeLeft);
    const mm = String(Math.floor(s / 60)).padStart(2, '0');
    const ss = String(s % 60).padStart(2, '0');

    this.hudTime.setText(`${mm}:${ss}`).setColor(s <= 15 ? '#d98b2b' : '#f2efe6');
    this.hudBin.setText(`IN THE BIN\n${String(this.inBin).padStart(2, '0')}`);
    this.hudFloor.setText(`ON THE FLOOR\n${String(this.onFloor).padStart(2, '0')}`);
  }

  private endSession(): void {
    if (this.over) return;
    this.over = true;
    this.hand.setVisible(false);

    const thrown = this.inBin + this.onFloor;

    // Stage 4 builds the real count screen — camera pull-back, the room revealed,
    // every ballot where it fell. This is a placeholder that says the numbers.
    this.add.rectangle(SCREEN.W / 2, SCREEN.H / 2, SCREEN.W, SCREEN.H, 0x000000, 0.75)
      .setDepth(200);

    this.add
      .text(
        SCREEN.W / 2,
        SCREEN.H / 2,
        [
          `${thrown} votes cast.`,
          `${this.inBin} reached the count.`,
          `${this.onFloor} were swept aside.`,
          '',
          'The wind continues.',
          '',
          '',
          'TAP TO VOTE AGAIN',
        ].join('\n'),
        {
          fontFamily: 'monospace',
          fontSize: '30px',
          color: '#f2efe6',
          align: 'center',
          lineSpacing: 12,
        },
      )
      .setOrigin(0.5)
      .setDepth(201);

    this.input.once('pointerdown', () => this.scene.restart());
  }

  private resetSession(): void {
    this.view.reset();
    this.timeLeft = SESSION.DURATION_S;
    this.inBin = 0;
    this.onFloor = 0;
    this.over = false;
    this.ballot = null;
    this.held = true;
    this.samples = [];
  }
}
