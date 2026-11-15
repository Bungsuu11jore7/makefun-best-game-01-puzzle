// TIDAL LOCKS — bootstrap, input, and the main loop (canvas 1280x720).
import { World } from './world.js';
import { drawGame, gridOrigin, buttonRects } from './render.js';
import { SoundBank } from './audio.js';
import { stageShot } from './shots.js';
import { SCREEN_TITLE, SCREEN_PLAY, SCREEN_LEVEL_CLEAR, SCREEN_OVER, SCREEN_WIN, TILE, VIEW_W, VIEW_H } from './config.js';

const canvas = document.getElementById('game');
const statusEl = document.getElementById('status');
canvas.width = VIEW_W;
canvas.height = VIEW_H;
const ctx = canvas.getContext('2d');
const params = new URLSearchParams(window.location.search);
const seed = Number(params.get('seed') || 1) || 1;
const shotName = params.get('shot');

const world = new World(seed);
const sounds = new SoundBank();
let screen = SCREEN_PLAY;
let hover = null;
let message = { text: '', until: 0 };
let muted = false;
let lastTick = performance.now();
let flowSoundAccum = 0;

function say(text) {
  message = { text, until: performance.now() + 2600 };
  statusEl.textContent = text;
}

function pointIn(rect, x, y) {
  return x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h;
}

function canvasPos(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (event.clientX - rect.left) * (VIEW_W / rect.width),
    y: (event.clientY - rect.top) * (VIEW_H / rect.height),
  };
}

function cellAt(pos) {
  const origin = gridOrigin(world);
  const x = Math.floor((pos.x - origin.x) / TILE);
  const y = Math.floor((pos.y - origin.y) / TILE);
  if (x < 0 || y < 0 || x >= world.cols || y >= world.rows) return null;
  return { x, y };
}

function releaseWater() {
  if (screen !== SCREEN_PLAY) return;
  const msg = world.releaseWater();
  say(msg);
  if (world.flow === 'running') sounds.splash();
  else sounds.denied();
}

function doRotate(cell, ccw) {
  if (screen !== SCREEN_PLAY) return;
  const msg = world.rotateAt(cell.x, cell.y, ccw);
  if (!msg) return;
  say(msg);
  if (msg.startsWith('Turned')) sounds.click();
  else sounds.denied();
}

function nextScreen() {
  if (world.wonAll()) {
    screen = SCREEN_WIN;
    sounds.win();
    sounds.stopMusic();
    return;
  }
  if (world.levelClear) {
    screen = SCREEN_LEVEL_CLEAR;
    sounds.win();
    return;
  }
  if (world.gameOver) {
    screen = SCREEN_OVER;
    sounds.lose();
    sounds.stopMusic();
  }
}

function handleEvent(event) {
  if (!event) return;
  if (event.startsWith('gameover:')) {
    screen = SCREEN_OVER;
    say(event.slice(9));
    sounds.lose();
    sounds.stopMusic();
  } else if (event.startsWith('life:')) {
    say(`${event.slice(5)} One life lost — the level resets.`);
    sounds.lose();
  }
}

canvas.addEventListener('mousemove', (event) => {
  hover = cellAt(canvasPos(event));
});

canvas.addEventListener('click', (event) => {
  sounds.ensure();
  const pos = canvasPos(event);
  const btns = buttonRects();
  if (screen === SCREEN_TITLE) {
    if (pointIn(btns.start, pos.x, pos.y)) {
      screen = SCREEN_PLAY;
      sounds.startMusic();
      say('Level 1 — turn the pipes, then release the water!');
    }
    return;
  }
  if (screen === SCREEN_LEVEL_CLEAR) {
    if (pointIn(btns.next, pos.x, pos.y)) {
      if (world.wonAll()) { screen = SCREEN_WIN; return; }
      world.nextLevel();
      screen = SCREEN_PLAY;
      say(`Level ${world.levelIndex + 1} — a longer channel awaits!`);
      sounds.click();
    }
    return;
  }
  if (screen === SCREEN_OVER || screen === SCREEN_WIN) {
    if (pointIn(btns.again, pos.x, pos.y)) {
      world.reset(seed);
      screen = SCREEN_PLAY;
      sounds.startMusic();
      say('Fresh tide — level 1!');
    }
    return;
  }
  if (pointIn(btns.release, pos.x, pos.y)) { releaseWater(); return; }
  if (pointIn(btns.undo, pos.x, pos.y)) { say(world.undo()); sounds.undo(); return; }
  if (pointIn(btns.restart, pos.x, pos.y)) {
    world.retryLevel();
    say('Level restarted — pipes scrambled again.');
    sounds.undo();
    return;
  }
  if (pointIn(btns.mute, pos.x, pos.y)) {
    muted = !muted;
    sounds.muted = muted;
    say(muted ? 'Sound off.' : 'Sound on.');
    return;
  }
  const cell = cellAt(pos);
  if (cell) doRotate(cell, false);
});

canvas.addEventListener('contextmenu', (event) => {
  event.preventDefault();
  const cell = cellAt(canvasPos(event));
  if (cell) doRotate(cell, true);
});

window.addEventListener('keydown', (event) => {
  if (event.code === 'Space') { event.preventDefault(); releaseWater(); }
  else if (event.key === 'u' || event.key === 'U') { say(world.undo()); sounds.undo(); }
  else if (event.key === 'r' || event.key === 'R') {
    if (screen === SCREEN_PLAY) { world.retryLevel(); say('Level restarted.'); }
  } else if (event.key === 'm' || event.key === 'M') {
    muted = !muted;
    sounds.muted = muted;
  } else if (event.key === 'Enter') {
    if (screen === SCREEN_TITLE) { screen = SCREEN_PLAY; sounds.startMusic(); }
    else if (screen === SCREEN_LEVEL_CLEAR) {
      if (world.wonAll()) screen = SCREEN_WIN;
      else { world.nextLevel(); screen = SCREEN_PLAY; }
    } else if (screen === SCREEN_OVER || screen === SCREEN_WIN) {
      world.reset(seed);
      screen = SCREEN_PLAY;
      sounds.startMusic();
    }
  }
});

function frame(now) {
  const dt = Math.min(0.1, (now - lastTick) / 1000);
  lastTick = now;
  if (!shotName && screen === SCREEN_PLAY) {
    const event = world.step(dt);
    handleEvent(event);
    if (world.flow === 'running') {
      flowSoundAccum += dt;
      if (flowSoundAccum > 0.26) { flowSoundAccum = 0; sounds.bubble(); }
    }
    if (world.levelClear || world.gameOver) nextScreen();
  }
  drawGame(ctx, world, screen, hover, message, muted, now);
  requestAnimationFrame(frame);
}

if (shotName) {
  const staged = stageShot(shotName, world);
  screen = staged.screen;
  world.best = Math.max(world.best, staged.best);
  drawGame(ctx, world, screen, null, { text: '', until: 0 }, false, performance.now());
} else {
  screen = SCREEN_TITLE;
  requestAnimationFrame(frame);
}
