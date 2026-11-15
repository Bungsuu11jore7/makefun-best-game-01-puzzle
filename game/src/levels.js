// TIDAL LOCKS — 8 hand-designed levels of rising difficulty.
// Each level is a grid plus a guaranteed solution path from the spring to the
// reservoir. Path tiles are laid down correctly, then every rotatable tile is
// scrambled, so the player must rotate pipes back into a working channel.
import { makeRng, pick } from './rng.js';
import { OPPOSITE } from './tiles.js';

const LEVEL_SPECS = [
  { cols: 5, rows: 5, time: 75, path: [[0, 2], [1, 2], [2, 2], [2, 3], [3, 3], [4, 3]], rocks: [[4, 0]] },
  { cols: 6, rows: 5, time: 75, path: [[0, 0], [1, 0], [1, 1], [1, 2], [2, 2], [3, 2], [3, 3], [4, 3], [5, 3]], rocks: [[4, 0], [0, 4]] },
  { cols: 6, rows: 6, time: 90, path: [[0, 5], [1, 5], [2, 5], [2, 4], [2, 3], [3, 3], [4, 3], [4, 2], [4, 1], [5, 1]], rocks: [[0, 0], [5, 4], [1, 2]] },
  { cols: 7, rows: 6, time: 90, path: [[0, 1], [1, 1], [2, 1], [2, 2], [3, 2], [3, 3], [3, 4], [4, 4], [5, 4], [6, 4]], rocks: [[5, 0], [0, 5], [6, 1]] },
  { cols: 7, rows: 7, time: 100, path: [[0, 3], [1, 3], [1, 2], [2, 2], [2, 1], [3, 1], [4, 1], [4, 2], [5, 2], [5, 3], [6, 3]], rocks: [[0, 6], [6, 0], [3, 5], [5, 5]] },
  { cols: 8, rows: 7, time: 110, path: [[0, 6], [1, 6], [2, 6], [2, 5], [3, 5], [3, 4], [4, 4], [5, 4], [5, 3], [6, 3], [6, 2], [7, 2]], rocks: [[7, 0], [0, 0], [4, 6], [1, 3]] },
  { cols: 8, rows: 8, time: 120, path: [[0, 0], [0, 1], [1, 1], [2, 1], [2, 2], [3, 2], [3, 3], [4, 3], [5, 3], [5, 4], [6, 4], [6, 5], [7, 5]], rocks: [[7, 0], [0, 7], [4, 6], [2, 6], [6, 1]] },
  { cols: 8, rows: 8, time: 120, path: [[0, 7], [1, 7], [1, 6], [2, 6], [3, 6], [3, 5], [4, 5], [4, 4], [5, 4], [5, 3], [6, 3], [6, 2], [7, 2], [7, 1]], rocks: [[0, 0], [7, 7], [3, 1], [5, 7], [2, 2]] },
];

function dirFrom(a, b) {
  if (b[0] === a[0] + 1) return 1;
  if (b[0] === a[0] - 1) return 3;
  if (b[1] === a[1] + 1) return 2;
  return 0;
}

function straightRot(dIn, dOut) {
  // dIn/dOut are travel directions; straight when they are opposite.
  return (dIn === 0 || dIn === 2) ? 0 : 1;
}

function cornerRot(openA, openB) {
  for (let rot = 0; rot < 4; rot += 1) {
    const set = new Set([(0 + rot) % 4, (1 + rot) % 4]);
    if (set.has(openA) && set.has(openB)) return rot;
  }
  return 0;
}

const FILLER = ['straight', 'straight', 'corner', 'corner', 'corner', 'tee', 'cross'];

/** Build a level's grid (seeded, so the same seed always deals the same board). */
export function buildLevel(index, seed) {
  const spec = LEVEL_SPECS[index];
  const rng = makeRng(seed * 7919 + index * 131 + 17);
  const grid = [];
  for (let y = 0; y < spec.rows; y += 1) {
    const row = [];
    for (let x = 0; x < spec.cols; x += 1) {
      row.push({ type: pick(rng, FILLER), rot: Math.floor(rng() * 4), water: 0 });
    }
    grid.push(row);
  }
  const path = spec.path;
  const onPath = new Set(path.map(([x, y]) => `${x},${y}`));
  for (const [rx, ry] of spec.rocks) {
    if (!onPath.has(`${rx},${ry}`)) grid[ry][rx] = { type: 'rock', rot: 0, water: 0 };
  }
  for (let i = 0; i < path.length; i += 1) {
    const [x, y] = path[i];
    if (i === 0) {
      const d = dirFrom(path[0], path[1]);
      grid[y][x] = { type: 'spring', rot: (d - 1 + 4) % 4, water: 0 };
    } else if (i === path.length - 1) {
      const d = dirFrom(path[i - 1], path[i]);
      grid[y][x] = { type: 'reservoir', rot: (OPPOSITE[d] - 3 + 4) % 4, water: 0 };
    } else {
      const dIn = dirFrom(path[i - 1], path[i]);
      const dOut = dirFrom(path[i], path[i + 1]);
      const openIn = OPPOSITE[dIn];
      if (dIn === dOut) {
        grid[y][x] = { type: 'straight', rot: straightRot(dIn, dOut), water: 0 };
      } else {
        grid[y][x] = { type: 'corner', rot: cornerRot(openIn, dOut), water: 0 };
      }
    }
  }
  // Scramble every rotatable tile (including the solution) so the puzzle is real.
  // First remember the solved rotations so the screenshot autopilot can replay them.
  const solution = new Map();
  for (let y = 0; y < spec.rows; y += 1) {
    for (let x = 0; x < spec.cols; x += 1) solution.set(`${x},${y}`, grid[y][x].rot);
  }
  for (let y = 0; y < spec.rows; y += 1) {
    for (let x = 0; x < spec.cols; x += 1) {
      const tile = grid[y][x];
      if (tile.type === 'straight' || tile.type === 'corner') tile.rot = Math.floor(rng() * 4);
      else if (tile.type === 'tee' || tile.type === 'cross') tile.rot = Math.floor(rng() * 4);
    }
  }
  return {
    index,
    cols: spec.cols,
    rows: spec.rows,
    timeLimit: spec.time,
    grid,
    spring: path[0],
    reservoir: path[path.length - 1],
    pathLength: path.length,
    solution,
  };
}

export const LEVEL_COUNT = LEVEL_SPECS.length;
