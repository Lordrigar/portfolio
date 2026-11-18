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

test('Solo chases, commits his punch direction during charge, and has a recovery gap', async () => {
  const { SoloBrain, SOLO_CHARGE_MS, SOLO_RECOVERY_MS } = await import('../src/games/fox-adventure/combat.mjs');
  const brain = new SoloBrain();
  assert.equal(brain.step(0, 765, 140).velocity, -110);
  const charge = brain.step(1000, 220, 140);
  assert.equal(charge.phase, 'charge');
  assert.equal(charge.velocity, 0);
  assert.equal(brain.step(1000 + SOLO_CHARGE_MS - 1, 220, 500).direction, -1);
  const hit = brain.step(1000 + SOLO_CHARGE_MS, 220, 500);
  assert.equal(hit.strike, true);
  assert.equal(hit.direction, -1);
  assert.equal(brain.step(1001 + SOLO_CHARGE_MS, 220, 500).strike, false);
  assert.equal(brain.step(1000 + SOLO_CHARGE_MS + SOLO_RECOVERY_MS - 1, 220, 500).velocity, 0);
  assert.equal(brain.step(1000 + SOLO_CHARGE_MS + SOLO_RECOVERY_MS, 220, 500).velocity, 110);
});

test('running away, jumping, ducking, or getting behind Solo avoids his fixed punch area', async () => {
  const { soloPunchBounds, rectanglesOverlap } = await import('../src/games/fox-adventure/combat.mjs');
  const swing = soloPunchBounds(220, 460, -1);
  assert.equal(rectanglesOverlap(swing, { x: 119, y: 389, width: 43, height: 71 }), true);
  for (const body of [
    { x: 30, y: 389, width: 43, height: 71 },
    { x: 119, y: 280, width: 43, height: 71 },
    { x: 119, y: 416, width: 43, height: 44 },
    { x: 240, y: 389, width: 43, height: 71 },
  ]) assert.equal(rectanglesOverlap(swing, body), false);
});

test('stunning or defeating Solo cancels a charged attack', async () => {
  const { SoloBrain } = await import('../src/games/fox-adventure/combat.mjs');
  const brain = new SoloBrain();
  brain.step(0, 220, 140);
  const strike = brain.step(650, 220, 140);
  assert.equal(brain.currentAttack(strike.attackId), true);
  brain.stun(700);
  assert.equal(brain.currentAttack(strike.attackId), false);
  assert.equal(brain.step(800, 220, 500).velocity, 0);
  brain.defeat();
  assert.equal(brain.step(5000, 220, 500).phase, 'dead');
  assert.equal(brain.step(5000, 220, 500).velocity, 0);
});
