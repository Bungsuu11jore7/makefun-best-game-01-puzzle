// TIDAL LOCKS — tile shapes and their pipe openings.
// Directions: 0 = north, 1 = east, 2 = south, 3 = west. Rotation is clockwise steps.
export const DIR_N = 0;
export const DIR_E = 1;
export const DIR_S = 2;
export const DIR_W = 3;
export const DX = [0, 1, 0, -1];
export const DY = [-1, 0, 1, 0];
export const OPPOSITE = [2, 3, 0, 1];

// Base openings at rotation 0; rotating adds the rotation to each direction (mod 4).
export const BASE_OPENINGS = {
  straight: [0, 2],
  corner: [0, 1],
  tee: [0, 1, 2],
  cross: [0, 1, 2, 3],
  rock: [],
  spring: [1], // spring's single spout; rotation aims it
  reservoir: [3], // reservoir's single inlet; rotation aims it
};

export const ROTATABLE = new Set(['straight', 'corner', 'tee', 'cross']);
export const TILE_NAMES = {
  straight: 'Straight Pipe',
  corner: 'Elbow Pipe',
  tee: 'T-Junction',
  cross: 'Cross Pipe',
  rock: 'Rock (blocked)',
  spring: 'Spring',
  reservoir: 'Reservoir',
};

/** Openings of a tile after rotation. */
export function openings(type, rot) {
  const base = BASE_OPENINGS[type] || [];
  return base.map((d) => (d + rot) % 4);
}

/** True when tile `a` at (x,y) connects to tile `b` in direction `dir` (a opens toward b and b opens back). */
export function tilesConnect(a, b, dir) {
  if (!a || !b) return false;
  return openings(a.type, a.rot).includes(dir) && openings(b.type, b.rot).includes(OPPOSITE[dir]);
}

/** Rotate a tile one step clockwise (or counter-clockwise when ccw is true). Rocks and fixed ends do not rotate. */
export function rotateTile(tile, ccw) {
  if (!ROTATABLE.has(tile.type)) return false;
  tile.rot = (tile.rot + (ccw ? 3 : 1)) % 4;
  return true;
}
