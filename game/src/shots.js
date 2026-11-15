// TIDAL LOCKS — deterministic screenshot scenes behind ?shot=start|play|clear|over.
// Each scene replays the real rules from a fresh world with a fixed seed, so the
// frame is what a real game looks like and the same seed always gives the same frame.
import { SCREEN_TITLE, SCREEN_PLAY, SCREEN_LEVEL_CLEAR, SCREEN_OVER } from './config.js';

/** Turn every rotatable tile to its solved rotation (the level's own solution). */
function solveAll(world) {
  for (let y = 0; y < world.rows; y += 1) {
    for (let x = 0; x < world.cols; x += 1) {
      const tile = world.tileAt(x, y);
      const solved = world.level.solution.get(`${x},${y}`);
      if (tile && solved !== undefined) tile.rot = solved;
    }
  }
}

/** Set `world` to the named scene and return the screen to draw over it. */
export function stageShot(name, world) {
  world.reset(world.seed);
  if (name === 'play') {
    solveAll(world);
    world.releaseWater();
    for (let i = 0; i < 8; i += 1) world.step(0.13); // water halfway down the channel
    return { screen: SCREEN_PLAY, best: 0 };
  }
  if (name === 'clear') {
    solveAll(world);
    world.releaseWater();
    for (let i = 0; i < 400 && !world.levelClear; i += 1) world.step(0.13);
    return { screen: SCREEN_LEVEL_CLEAR, best: world.score };
  }
  if (name === 'over') {
    world.score = 1250;
    world.lives = 1;
    world.timeLeft = 0.4;
    world.step(1); // the clock runs out with one life left: game over
    return { screen: SCREEN_OVER, best: world.score };
  }
  return { screen: SCREEN_TITLE, best: 0 };
}
