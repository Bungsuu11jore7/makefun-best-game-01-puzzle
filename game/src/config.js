// TIDAL LOCKS — shared constants: palette, screens, scoring, timers.
export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_LEVEL_CLEAR = 'clear';
export const SCREEN_OVER = 'over';
export const SCREEN_WIN = 'win';

export const TILE = 64; // px per grid cell
export const HUD_H = 86; // HUD strip height above the grid
export const SIDE_W = 250; // side panel width (help, undo, release)

export const PALETTE = {
  deep: '#06283d',
  sea: '#0a4a6b',
  teal: '#0e7c86',
  foam: '#bfeef2',
  sand: '#f2d8a7',
  coral: '#ff7a59',
  gold: '#ffc53d',
  ink: '#eafcff',
  dim: '#7fb8c9',
  rock: '#3d5a6c',
  danger: '#ff4d5e',
  leaf: '#7ee081',
};

export const LIVES_START = 3;
export const FLOW_TICK_MS = 260; // ms per water step while flowing
export const SCORE_ROTATE = 0;
export const SCORE_LEVEL_BASE = 500;
export const SCORE_TIME_BONUS_PER_SEC = 10;
export const SCORE_WATER_BONUS = 5;

// Canvas logical size: grid up to 8x8 plus HUD and side panel.
export const VIEW_W = 1280;
export const VIEW_H = 720;
