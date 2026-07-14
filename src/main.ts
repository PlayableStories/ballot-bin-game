import Phaser from 'phaser';
import { SCREEN, PALETTE } from './config';
import { PlayScene } from './scenes/Play';

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: SCREEN.W,
  height: SCREEN.H,
  backgroundColor: PALETTE.ROOM_BACK,
  scale: {
    // Portrait, letterboxed. The game scales to fit; it does not reflow.
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  // No Arcade/Matter physics. Ballistics is 20 lines of our own integration — a
  // physics engine would only get in the way of a wind we fully control.
  scene: [PlayScene],
});
