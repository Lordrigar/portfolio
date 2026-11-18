import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import * as combat from '../src/games/fox-adventure/combat.mjs';
import { PUNCH_DAMAGE } from '../src/games/fox-adventure/combat.mjs';
import { PowerupState, POWER_DURATION } from '../src/games/fox-adventure/powerup.mjs';

function roomWithCollisions() {
  const Phaser = { Math: { Clamp: (value, min, max) => Math.max(min, Math.min(max, value)) }, Scene: class {}, Game: class { constructor(config) { Object.assign(this, config); } }, AUTO: 0,
    Scale: { FIT: 0, CENTER_BOTH: 0 } };
  const context = vm.createContext({ Phaser, PowerupState, POWER_DURATION, ...combat });
  const source = fs.readFileSync(new URL('../src/games/fox-adventure/createGame.js', import.meta.url), 'utf8')
    .replace(/^import .*;$/gm, '').replace('export function createGame', 'function createGame');
  vm.runInContext(source + '\nglobalThis.factory = createGame;', context);
  const config = context.factory(null);
  const room = new config.scene[2]();
  const chain = new Proxy({}, { get: (_target, property) => property === 'then' ? undefined : () => chain });
  const overlaps = [], colliders = [], handlers = new Map();
  room.fox = { body: {} }; room.bottles = {}; room.roomFloor = {};
  room.add = { zone: () => ({ body: { updateFromGameObject() {} }, setPosition() { return this; } }), container: () => chain, graphics: () => chain, text: () => chain };
  room.physics = { add: {
    existing: () => {}, group: () => ({ clear() {} }),
    collider: (...args) => colliders.push(args), overlap: (...args) => { overlaps.push(args); return { destroy() {} }; },
  } };
  room.events = { on: (name, callback) => handlers.set(name, callback), once() {}, off() {} };
  room.time = { delayedCall() {} };
  room.setupCombat();
  return { room, overlaps, colliders, handlers };
}

test('slipper collision keeps the player and floor first, destroys only the slipper', () => {
  const { room, overlaps, colliders } = roomWithCollisions();
  const pair = overlaps.find(([first]) => first === room.fox);
  assert.equal(pair[1], room.slippers);
  let damage = 0, destroyed = 0;
  room.takeDamage = amount => { damage += amount; };
  const slipper = { active: true, destroy: () => destroyed++ };
  pair[2](room.fox, slipper);
  assert.equal(damage, 1);
  assert.equal(destroyed, 1);
  assert.ok(room.fox.body);
  assert.equal(colliders[0][0], room.roomFloor);
  colliders[0][2](room.roomFloor, slipper);
  assert.equal(destroyed, 2);
});

test('a bottle damages Solo once and breaks the bottle, preserving Solo collider', () => {
  const { room, overlaps } = roomWithCollisions();
  const pair = overlaps.find(([first]) => first === room.soloBody);
  assert.equal(pair[1], room.bottles);
  let damage = 0;
  room.damageSolo = amount => { damage += amount; };
  room.breakBottle = bottle => { bottle.active = false; };
  const bottle = { active: true };
  pair[2](room.soloBody, bottle);
  pair[2](room.soloBody, bottle);
  assert.equal(damage, 10);
  assert.ok(room.soloBody.body);
});


test('a muscle punch delivers 25 damage once even across multiple overlap frames', () => {
  const { room, overlaps, handlers } = roomWithCollisions();
  let damage = 0;
  room.damageSolo = amount => { damage += amount; };
  const hitbox = { body: { enable: true } };
  handlers.get('player-punch')({ hitbox, damage: PUNCH_DAMAGE });
  const pair = overlaps.find(([first]) => first === hitbox);
  assert.equal(pair[1], room.soloBody);
  pair[2]();
  pair[2]();
  assert.equal(damage, 25);
});

test('Solo death disables his collider and plays death only once', () => {
  const { room } = roomWithCollisions();
  let deaths = 0, cleared = 0;
  room.soloHealth = 25;
  room.soloBody.body.enable = true;
  room.slippers.clear = () => cleared++;
  room.solo = {
    clearTint() { return this; },
    play(key) { assert.equal(key, 'solo-death'); deaths++; return this; },
    once() {},
  };
  room.damageSolo(25);
  room.damageSolo(25);
  assert.equal(room.soloHealth, 0);
  assert.equal(room.soloBody.body.enable, false);
  assert.equal(deaths, 1);
  assert.equal(cleared, 1);
});


test('Solo heavy punch applies one heart once at impact, and can be interrupted', () => {
  for (const interrupt of [false, true]) {
    const { room } = roomWithCollisions();
    const callbacks = [];
    let damage = 0;
    room.time.delayedCall = (_delay, callback) => callbacks.push(callback);
    room.takeDamage = amount => { damage += amount; };
    room.fox.x = 140;
    Object.assign(room.fox.body, { x: 119, y: 389, width: 43, height: 71 });
    room.solo = {
      x: 220, y: 460, anims: { isPlaying: true, stop() {} },
      setFlipX() { return this; }, setTexture() { return this; }, setTint() { return this; },
      clearTint() { return this; }, play() { return this; },
    };
    room.updateSolo(0, 16);
    assert.equal(callbacks.length, 0);
    room.updateSolo(650, 16);
    room.updateSolo(651, 16);
    assert.equal(callbacks.length, 1);
    if (interrupt) room.soloAI.stun(700);
    callbacks[0]();
    assert.equal(damage, interrupt ? 0 : 1);
  }
});
