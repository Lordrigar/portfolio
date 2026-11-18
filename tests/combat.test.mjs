import test from 'node:test';
import assert from 'node:assert/strict';
import { SOLO_HEALTH, BOTTLE_DAMAGE, PUNCH_DAMAGE, SLIPPER_GRAVITY, slipperTrajectory, remainingSoloHealth } from '../src/games/fox-adventure/combat.mjs';

test('Solo takes ten bottles or four muscle punches to defeat', () => {
  for (const [damage, hits] of [[BOTTLE_DAMAGE, 10], [PUNCH_DAMAGE, 4]]) {
    let health = SOLO_HEALTH;
    for (let i = 0; i < hits - 1; i++) health = remainingSoloHealth(health, damage);
    assert.ok(health > 0);
    assert.equal(remainingSoloHealth(health, damage), 0);
  }
  assert.equal(remainingSoloHealth(5, PUNCH_DAMAGE), 0);
});

test('slipper arc reaches its captured target from either side of the room', () => {
  for (const [start, target] of [
    [{ x: 720, y: 108 }, { x: 140, y: 424 }],
    [{ x: 240, y: 108 }, { x: 820, y: 424 }],
    [{ x: 480, y: 108 }, { x: 480, y: 424 }],
  ]) {
    const { vx, vy, seconds } = slipperTrajectory(start, target);
    assert.ok(seconds >= 0.8 && seconds <= 1.3);
    assert.ok(Math.abs(start.x + vx * seconds - target.x) < 1e-8);
    assert.ok(Math.abs(start.y + vy * seconds + 0.5 * SLIPPER_GRAVITY * seconds ** 2 - target.y) < 1e-8);
  }
});

test('moving after an attack dodges the original aim rather than retargeting', () => {
  const start = { x: 600, y: 108 };
  const target = { x: 300, y: 424 };
  const flight = slipperTrajectory(start, target);
  target.x += 180;
  const arrival = start.x + flight.vx * flight.seconds;
  assert.equal(arrival, 300);
  assert.notEqual(arrival, target.x);
});
