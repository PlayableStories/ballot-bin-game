import Phaser from 'phaser';
import { SCREEN, PALETTE, WIND, SESSION, BIN } from '../config';

/**
 * Stage 0 — scaffold only.
 *
 * The bar for this stage is deliberately low: a coloured rectangle, on a real
 * phone, from a live URL. What it actually proves is the things Stage 1 needs
 * and cannot debug later — that portrait scaling works, that the viewport is
 * right on a device, that touch input arrives, and that the config is wired in.
 *
 * Replaced wholesale by the grey-box in Stage 1.
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create(): void {
    const cx = SCREEN.W / 2;

    this.add
      .rectangle(cx, SCREEN.H / 2, SCREEN.W - 80, SCREEN.H - 160, PALETTE.ROOM_FLOOR)
      .setStrokeStyle(4, PALETTE.BIN_RIM);

    this.add
      .text(cx, 220, 'BALLOT / WASTE', {
        fontFamily: 'Impact, Haettenschweiler, sans-serif',
        fontSize: '64px',
        color: '#f2efe6',
      })
      .setOrigin(0.5);

    this.add
      .text(cx, 300, 'STAGE 0 — SCAFFOLD', {
        fontFamily: 'monospace',
        fontSize: '24px',
        color: '#d98b2b',
      })
      .setOrigin(0.5);

    // Proof the config is actually loaded and not just compiling.
    const facts = [
      `wind cap      ${WIND.MAX} m/s²`,
      `wind half-life ${(Math.log(2) / WIND.DECAY).toFixed(1)}s`,
      `bin at         ${BIN.z}m`,
      `catch window   ±${BIN.CATCH.depth} deep / ±${BIN.CATCH.lateral} lateral`,
      `session        ${SESSION.DURATION_S}s`,
    ];
    this.add
      .text(cx, SCREEN.H / 2 - 40, facts.join('\n'), {
        fontFamily: 'monospace',
        fontSize: '22px',
        color: '#f2efe6',
        align: 'center',
        lineSpacing: 10,
      })
      .setOrigin(0.5);

    // Touch check. Stage 1's whole mechanic is a swipe, so knowing input lands
    // on the device — before any of it depends on that — is worth the 10 lines.
    const readout = this.add
      .text(cx, SCREEN.H - 220, 'TAP OR SWIPE TO TEST INPUT', {
        fontFamily: 'monospace',
        fontSize: '20px',
        color: '#2b8f8f',
      })
      .setOrigin(0.5);

    let start: { x: number; y: number; t: number } | null = null;

    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      start = { x: p.x, y: p.y, t: this.time.now };
      readout.setText('…');
    });

    this.input.on('pointerup', (p: Phaser.Input.Pointer) => {
      if (!start) return;
      const dx = p.x - start.x;
      const dy = start.y - p.y; // + = upward, which is how the throw will read it
      const ms = Math.max(this.time.now - start.t, 1);
      const angle = (Math.atan2(dx, dy) * 180) / Math.PI;
      readout.setText(
        dy > 40
          ? `SWIPE UP  ${dy.toFixed(0)}px  ${angle.toFixed(0)}°  ${ms.toFixed(0)}ms`
          : `TAP  (${p.x.toFixed(0)}, ${p.y.toFixed(0)})`,
      );
      start = null;
    });
  }
}
