// TIDAL LOCKS — canvas rendering: sea backdrop, pipe tiles, water, HUD, screens.
import { PALETTE, TILE, HUD_H, SIDE_W, VIEW_W, VIEW_H, SCREEN_TITLE, SCREEN_LEVEL_CLEAR, SCREEN_OVER, SCREEN_WIN } from './config.js';
import { openings, DX, DY } from './tiles.js';
import { LEVEL_COUNT } from './levels.js';

export function gridOrigin(world) {
  const areaW = VIEW_W - SIDE_W;
  const x = Math.floor((areaW - world.cols * TILE) / 2);
  const y = HUD_H + Math.floor((VIEW_H - HUD_H - world.rows * TILE) / 2);
  return { x, y };
}

export function buttonRects() {
  const bx = VIEW_W - SIDE_W + 18;
  return {
    release: { x: bx, y: 232, w: SIDE_W - 36, h: 52 },
    undo: { x: bx, y: 296, w: SIDE_W - 36, h: 40 },
    restart: { x: bx, y: 348, w: SIDE_W - 36, h: 40 },
    mute: { x: bx, y: 400, w: SIDE_W - 36, h: 40 },
    start: { x: VIEW_W / 2 - 160, y: 470, w: 320, h: 60 },
    next: { x: VIEW_W / 2 - 160, y: 430, w: 320, h: 56 },
    again: { x: VIEW_W / 2 - 160, y: 470, w: 320, h: 56 },
    retry: { x: VIEW_W / 2 - 160, y: 430, w: 320, h: 56 },
  };
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawPipeArm(ctx, cx, cy, dir, len, width, color) {
  const ex = cx + DX[dir] * len;
  const ey = cy + DY[dir] * len;
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(ex, ey);
  ctx.stroke();
}

export function drawTile(ctx, tile, px, py, hovered) {
  const cx = px + TILE / 2;
  const cy = py + TILE / 2;
  ctx.fillStyle = hovered ? '#155a75' : '#0d3d56';
  roundRect(ctx, px + 2, py + 2, TILE - 4, TILE - 4, 10);
  ctx.fill();
  ctx.strokeStyle = 'rgba(191,238,242,0.18)';
  ctx.lineWidth = 1;
  ctx.stroke();
  if (tile.type === 'rock') {
    ctx.fillStyle = PALETTE.rock;
    ctx.beginPath();
    ctx.arc(cx - 6, cy + 4, 14, 0, Math.PI * 2);
    ctx.arc(cx + 10, cy - 6, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#6b8a9c';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('ROCK', cx, cy + 22);
    return;
  }
  if (tile.type === 'spring') {
    ctx.fillStyle = '#1d7fa8';
    ctx.beginPath();
    ctx.arc(cx, cy, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#9fe8ff';
    ctx.beginPath();
    ctx.arc(cx, cy, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#06283d';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('SPRING', cx, cy + 30);
    drawPipeArm(ctx, cx, cy, openings(tile.type, tile.rot)[0], TILE / 2 - 4, 12, '#9fe8ff');
    return;
  }
  if (tile.type === 'reservoir') {
    ctx.fillStyle = '#274b63';
    roundRect(ctx, px + 10, py + 10, TILE - 20, TILE - 20, 8);
    ctx.fill();
    ctx.strokeStyle = PALETTE.gold;
    ctx.lineWidth = 3;
    ctx.stroke();
    const fill = tile.water ? 1 : 0.15;
    ctx.fillStyle = '#2fa8d8';
    const h = (TILE - 26) * fill;
    ctx.fillRect(px + 13, py + TILE - 13 - h, TILE - 26, h);
    ctx.fillStyle = PALETTE.ink;
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('TANK', cx, cy + 4);
    return;
  }
  const open = openings(tile.type, tile.rot);
  for (const dir of open) drawPipeArm(ctx, cx, cy, dir, TILE / 2 - 4, 16, '#8fb7c9');
  for (const dir of open) drawPipeArm(ctx, cx, cy, dir, TILE / 2 - 4, 9, '#c8e6ef');
  if (tile.water) {
    for (const dir of open) drawPipeArm(ctx, cx, cy, dir, TILE / 2 - 4, 9, '#2fa8d8');
    ctx.fillStyle = '#2fa8d8';
    ctx.beginPath();
    ctx.arc(cx, cy, 7, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#5fb3d1';
  ctx.beginPath();
  ctx.arc(cx, cy, 4, 0, Math.PI * 2);
  ctx.fill();
}

function drawButton(ctx, rect, label, enabled, accent) {
  ctx.fillStyle = enabled ? (accent || '#0e7c86') : '#33505f';
  roundRect(ctx, rect.x, rect.y, rect.w, rect.h, 9);
  ctx.fill();
  ctx.strokeStyle = 'rgba(234,252,255,0.5)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = PALETTE.ink;
  ctx.font = 'bold 16px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, rect.x + rect.w / 2, rect.y + rect.h / 2 + 1);
  ctx.textBaseline = 'alphabetic';
}

function drawBar(ctx, x, y, w, h, frac, color, label) {
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  roundRect(ctx, x, y, w, h, 6);
  ctx.fill();
  ctx.fillStyle = color;
  if (frac > 0) {
    roundRect(ctx, x + 2, y + 2, Math.max(4, (w - 4) * Math.min(1, frac)), h - 4, 4);
    ctx.fill();
  }
  ctx.fillStyle = PALETTE.ink;
  ctx.font = 'bold 12px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(label, x, y - 6);
}

export function drawGame(ctx, world, screen, hover, message, muted, timeNow) {
  // Sea backdrop.
  const grad = ctx.createLinearGradient(0, 0, 0, VIEW_H);
  grad.addColorStop(0, PALETTE.deep);
  grad.addColorStop(1, PALETTE.sea);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.strokeStyle = 'rgba(191,238,242,0.08)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 5; i += 1) {
    ctx.beginPath();
    ctx.moveTo(0, 140 + i * 130);
    ctx.bezierCurveTo(320, 110 + i * 130, 900, 180 + i * 130, VIEW_W, 130 + i * 130);
    ctx.stroke();
  }

  // HUD strip.
  ctx.fillStyle = 'rgba(4,32,48,0.85)';
  ctx.fillRect(0, 0, VIEW_W, HUD_H);
  ctx.fillStyle = PALETTE.foam;
  ctx.font = 'bold 30px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('🌊 TIDAL LOCKS', 20, 40);
  ctx.font = '15px sans-serif';
  ctx.fillStyle = PALETTE.dim;
  ctx.fillText('Rotate the pipes — guide the spring water to the tank!', 22, 66);
  const hudX = 470;
  ctx.fillStyle = PALETTE.ink;
  ctx.font = 'bold 17px sans-serif';
  ctx.fillText(`LEVEL ${world.levelIndex + 1} / ${LEVEL_COUNT}`, hudX, 34);
  ctx.fillText(`SCORE ${world.score}`, hudX, 62);
  ctx.fillText('💧'.repeat(Math.max(0, world.lives)) + '·'.repeat(Math.max(0, 3 - world.lives)), hudX + 190, 34);
  ctx.fillStyle = world.timeLeft < 15 ? PALETTE.danger : PALETTE.ink;
  ctx.fillText(`⏱ ${Math.ceil(world.timeLeft)}s`, hudX + 190, 62);
  drawBar(ctx, 830, 52, 180, 14, world.waterMeter / 100, '#2fa8d8', `WATER ${world.waterMeter}%`);

  // Grid.
  const origin = gridOrigin(world);
  for (let y = 0; y < world.rows; y += 1) {
    for (let x = 0; x < world.cols; x += 1) {
      const hov = hover && hover.x === x && hover.y === y && screen === 'play';
      drawTile(ctx, world.tileAt(x, y), origin.x + x * TILE, origin.y + y * TILE, hov);
    }
  }

  // Side panel.
  ctx.fillStyle = 'rgba(4,32,48,0.85)';
  ctx.fillRect(VIEW_W - SIDE_W, HUD_H, SIDE_W, VIEW_H - HUD_H);
  ctx.fillStyle = PALETTE.foam;
  ctx.font = 'bold 17px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('HOW TO PLAY', VIEW_W - SIDE_W + 18, HUD_H + 28);
  ctx.font = '13px sans-serif';
  ctx.fillStyle = PALETTE.dim;
  const tips = ['Click a pipe to turn it 90°.', 'Right-click turns it back.', 'Press SPACE to release water.', 'U = undo · R = restart level.', 'Finish all 8 locks to win!'];
  tips.forEach((t, i) => ctx.fillText(t, VIEW_W - SIDE_W + 18, HUD_H + 52 + i * 19));
  const btns = buttonRects();
  drawButton(ctx, btns.release, '💧 RELEASE WATER', world.flow === 'idle', '#2fa8d8');
  drawButton(ctx, btns.undo, '↩ UNDO  (U)', world.undoStack.length > 0);
  drawButton(ctx, btns.restart, '↻ RESTART LEVEL  (R)', true);
  drawButton(ctx, btns.mute, muted ? '🔇 SOUND OFF' : '🔊 SOUND ON', true);

  // Toast message.
  if (message && timeNow < message.until) {
    ctx.fillStyle = 'rgba(4,32,48,0.92)';
    const w = ctx.measureText(message.text).width + 36;
    roundRect(ctx, (VIEW_W - w) / 2, VIEW_H - 64, w, 40, 10);
    ctx.fill();
    ctx.fillStyle = PALETTE.gold;
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(message.text, VIEW_W / 2, VIEW_H - 38);
    ctx.textAlign = 'left';
  }

  if (screen === SCREEN_TITLE) drawTitle(ctx, world);
  if (screen === SCREEN_LEVEL_CLEAR) drawClear(ctx, world);
  if (screen === SCREEN_OVER) drawOver(ctx, world);
  if (screen === SCREEN_WIN) drawWin(ctx, world);
}

function overlay(ctx) {
  ctx.fillStyle = 'rgba(3,20,32,0.82)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
}

function drawTitle(ctx, world) {
  overlay(ctx);
  ctx.textAlign = 'center';
  ctx.fillStyle = PALETTE.foam;
  ctx.font = 'bold 64px sans-serif';
  ctx.fillText('🌊 TIDAL LOCKS', VIEW_W / 2, 170);
  ctx.fillStyle = PALETTE.gold;
  ctx.font = 'bold 24px sans-serif';
  ctx.fillText('A pipe-turning tide puzzle', VIEW_W / 2, 220);
  ctx.fillStyle = PALETTE.ink;
  ctx.font = '19px sans-serif';
  ctx.fillText('Turn the pipes so the spring water reaches the tank before time runs out.', VIEW_W / 2, 280);
  ctx.fillText('8 levels · 3 lives · undo · bonus points for speed and full tanks.', VIEW_W / 2, 312);
  ctx.fillText('Click a tile to rotate it · Right-click to rotate back · SPACE releases the water', VIEW_W / 2, 344);
  ctx.fillStyle = PALETTE.dim;
  ctx.font = '15px sans-serif';
  ctx.fillText('Best score this session: ' + world.best, VIEW_W / 2, 400);
  drawButton(ctx, buttonRects().start, '▶  START THE TIDE', true, '#2fa8d8');
  ctx.textAlign = 'left';
}

function drawClear(ctx, world) {
  overlay(ctx);
  ctx.textAlign = 'center';
  ctx.fillStyle = PALETTE.leaf;
  ctx.font = 'bold 52px sans-serif';
  ctx.fillText('💧 LEVEL CLEAR!', VIEW_W / 2, 220);
  ctx.fillStyle = PALETTE.ink;
  ctx.font = '22px sans-serif';
  ctx.fillText(`Level ${world.levelIndex + 1} filled! Score: ${world.score}  ·  Lives: ${world.lives}`, VIEW_W / 2, 280);
  ctx.fillText('The tide rolls on to the next lock…', VIEW_W / 2, 320);
  const label = world.levelIndex + 1 >= LEVEL_COUNT ? '🏆 SEE RESULTS' : '▶  NEXT LEVEL';
  drawButton(ctx, buttonRects().next, label, true, '#2fa8d8');
  ctx.textAlign = 'left';
}

function drawOver(ctx, world) {
  overlay(ctx);
  ctx.textAlign = 'center';
  ctx.fillStyle = PALETTE.danger;
  ctx.font = 'bold 52px sans-serif';
  ctx.fillText('🏜 THE TIDE RAN DRY', VIEW_W / 2, 220);
  ctx.fillStyle = PALETTE.ink;
  ctx.font = '22px sans-serif';
  ctx.fillText(`Out of lives on level ${world.levelIndex + 1}. Final score: ${world.score}`, VIEW_W / 2, 280);
  ctx.fillText('The spring is waiting — try the locks again!', VIEW_W / 2, 320);
  drawButton(ctx, buttonRects().again, '↻  PLAY AGAIN', true, '#2fa8d8');
  ctx.textAlign = 'left';
}

function drawWin(ctx, world) {
  overlay(ctx);
  ctx.textAlign = 'center';
  ctx.fillStyle = PALETTE.gold;
  ctx.font = 'bold 52px sans-serif';
  ctx.fillText('🏆 ALL LOCKS OPEN!', VIEW_W / 2, 200);
  ctx.fillStyle = PALETTE.ink;
  ctx.font = '22px sans-serif';
  ctx.fillText(`You guided the tide through all ${LEVEL_COUNT} locks!`, VIEW_W / 2, 260);
  ctx.font = 'bold 30px sans-serif';
  ctx.fillStyle = PALETTE.foam;
  ctx.fillText(`FINAL SCORE: ${world.score}`, VIEW_W / 2, 320);
  ctx.font = '18px sans-serif';
  ctx.fillStyle = PALETTE.dim;
  ctx.fillText(`Lives left: ${world.lives} · Best this session: ${world.best}`, VIEW_W / 2, 356);
  drawButton(ctx, buttonRects().again, '↻  PLAY AGAIN', true, '#2fa8d8');
  ctx.textAlign = 'left';
}
