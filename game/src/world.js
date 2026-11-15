// TIDAL LOCKS — game state: rotations, undo, water flow, timer, score, lives.
import { buildLevel, LEVEL_COUNT } from './levels.js';
import { LIVES_START, FLOW_TICK_MS, SCORE_LEVEL_BASE, SCORE_TIME_BONUS_PER_SEC, SCORE_WATER_BONUS } from './config.js';
import { openings, rotateTile, tilesConnect, DX, DY } from './tiles.js';

export const FLOW_IDLE = 'idle';
export const FLOW_RUNNING = 'running';
export const FLOW_LEAKED = 'leaked';
export const FLOW_ARRIVED = 'arrived';

export class World {
  constructor(seed) {
    this.seed = seed;
    this.levelIndex = 0;
    this.score = 0;
    this.lives = LIVES_START;
    this.best = 0;
    this.undoStack = [];
    this.message = '';
    this.messageUntil = 0;
    this.loadLevel(0);
  }

  loadLevel(index) {
    this.levelIndex = index;
    this.level = buildLevel(index, this.seed);
    this.timeLeft = this.level.timeLimit;
    this.flow = FLOW_IDLE;
    this.flowPath = [];
    this.flowHead = 0;
    this.flowAccum = 0;
    this.waterMeter = 0;
    this.undoStack = [];
    this.leakCell = null;
    this.levelStartScore = this.score;
    this.flash = null;
  }

  get cols() { return this.level.cols; }
  get rows() { return this.level.rows; }

  tileAt(x, y) {
    if (x < 0 || y < 0 || x >= this.cols || y >= this.rows) return null;
    return this.level.grid[y][x];
  }

  /** Rotate the tile at (x,y); returns a short feedback string, or '' when nothing happened. */
  rotateAt(x, y, ccw) {
    if (this.flow === FLOW_RUNNING) return 'Wait for the water to settle!';
    const tile = this.tileAt(x, y);
    if (!tile) return '';
    if (tile.type === 'rock') return 'Rock — it cannot turn.';
    if (tile.type === 'spring' || tile.type === 'reservoir') return 'That end is fixed in place.';
    this.undoStack.push({ x, y, rot: tile.rot });
    if (this.undoStack.length > 200) this.undoStack.shift();
    rotateTile(tile, ccw);
    return ccw ? 'Turned counter-clockwise.' : 'Turned clockwise.';
  }

  undo() {
    if (this.flow === FLOW_RUNNING) return 'Wait for the water to settle!';
    const last = this.undoStack.pop();
    if (!last) return 'Nothing to undo.';
    this.tileAt(last.x, last.y).rot = last.rot;
    return 'Undid the last turn.';
  }

  /** Trace the connected channel from the spring; returns the cells water can reach. */
  traceChannel() {
    const [sx, sy] = this.level.spring;
    const seen = new Set([`${sx},${sy}`]);
    const order = [[sx, sy]];
    let head = 0;
    while (head < order.length) {
      const [x, y] = order[head];
      head += 1;
      const tile = this.tileAt(x, y);
      for (const dir of openings(tile.type, tile.rot)) {
        const nx = x + DX[dir];
        const ny = y + DY[dir];
        const next = this.tileAt(nx, ny);
        if (!next || seen.has(`${nx},${ny}`)) continue;
        if (tilesConnect(tile, next, dir)) {
          seen.add(`${nx},${ny}`);
          order.push([nx, ny]);
        }
      }
    }
    return order;
  }

  /** Open the spring: water walks the connected channel one cell per tick. */
  releaseWater() {
    if (this.flow === FLOW_RUNNING) return 'Water is already flowing!';
    if (this.flow === FLOW_ARRIVED) return 'The reservoir is full — nice work!';
    this.flow = FLOW_RUNNING;
    this.flowPath = this.traceChannel();
    this.flowHead = 0;
    this.flowAccum = 0;
    this.leakCell = null;
    for (const row of this.level.grid) for (const t of row) t.water = 0;
    return 'Water released! Watch it flow…';
  }

  /** Advance the clock by dt seconds. Returns an event string when something big happens. */
  step(dt) {
    if (this.flow === FLOW_RUNNING) {
      this.flowAccum += dt * 1000;
      let event = null;
      while (this.flowAccum >= FLOW_TICK_MS && this.flow === FLOW_RUNNING) {
        this.flowAccum -= FLOW_TICK_MS;
        const e = this.advanceWater();
        if (e) event = e;
      }
      return event;
    }
    if (this.flow === FLOW_IDLE) {
      this.timeLeft -= dt;
      if (this.timeLeft <= 0) {
        this.timeLeft = 0;
        return this.loseLife('Time ran out!');
      }
    }
    return null;
  }

  advanceWater() {
    const cell = this.flowPath[this.flowHead];
    if (!cell) {
      this.flow = FLOW_LEAKED;
      this.leakCell = this.flowPath[this.flowPath.length - 1];
      return this.loseLife('The channel leaked into the sand!');
    }
    const [x, y] = cell;
    const tile = this.tileAt(x, y);
    tile.water = 1;
    this.waterMeter = Math.round(((this.flowHead + 1) / this.level.pathLength) * 100);
    this.flowHead += 1;
    if (tile.type === 'reservoir') {
      this.flow = FLOW_ARRIVED;
      const timeBonus = Math.round(this.timeLeft) * SCORE_TIME_BONUS_PER_SEC;
      const waterBonus = this.waterMeter * SCORE_WATER_BONUS;
      this.score += SCORE_LEVEL_BASE + timeBonus + waterBonus;
      this.best = Math.max(this.best, this.score);
      return 'arrived';
    }
    return null;
  }

  loseLife(reason) {
    this.lives -= 1;
    this.flow = FLOW_LEAKED;
    if (this.lives <= 0) return `gameover:${reason}`;
    this.timeLeft = this.level.timeLimit;
    this.flow = FLOW_IDLE;
    this.undoStack = [];
    for (const row of this.level.grid) for (const t of row) t.water = 0;
    this.waterMeter = 0;
    return `life:${reason}`;
  }

  nextLevel() {
    if (this.levelIndex + 1 >= LEVEL_COUNT) return false;
    this.loadLevel(this.levelIndex + 1);
    return true;
  }

  retryLevel() {
    const keepScore = this.levelStartScore;
    this.score = keepScore;
    this.loadLevel(this.levelIndex);
  }

  reset(seed) {
    this.seed = seed;
    this.score = 0;
    this.lives = LIVES_START;
    this.loadLevel(0);
  }

  get levelClear() { return this.flow === FLOW_ARRIVED; }
  get gameOver() { return this.lives <= 0; }
  get wonAll() { return this.levelClear && this.levelIndex + 1 >= LEVEL_COUNT; }
}
