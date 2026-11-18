import test from 'node:test';
import assert from 'node:assert/strict';
import { PowerupState, POWER_DURATION, POWER_COOLDOWN } from '../src/games/fox-adventure/powerup.mjs';

function activated(at = 1000) {
  const power = new PowerupState();
  assert.equal(power.request(Math.max(0, at - 1700), 1), 'started');
  power.phase = 'flashing';
  assert.equal(power.activate(at), true);
  return power;
}

test('requires an available bottle and cannot start twice during transformation', () => {
  const power = new PowerupState();
  assert.equal(power.request(0, 0), 'missing-bottle');
  assert.equal(power.phase, 'idle');
  assert.equal(power.request(0, 1), 'started');
  assert.equal(power.request(100, 1), 'unavailable');
  assert.equal(power.activate(100), false);
});

test('form expires at 20 seconds, cooldown ends at 30 seconds from activation', () => {
  const power = activated(2000);
  assert.equal(power.expire(2000 + POWER_DURATION - 1), false);
  assert.equal(power.expire(2000 + POWER_DURATION), true);
  assert.equal(power.phase, 'idle');
  assert.equal(power.bonusHealth, 0);
  assert.equal(power.cooldown(22000), 10);
  assert.equal(power.request(22000, 1), 'unavailable');
  assert.equal(power.request(2000 + POWER_COOLDOWN, 1), 'started');
});

test('two temporary hearts absorb damage first and cannot heal normal health on expiry', () => {
  const power = activated();
  let normalHealth = 2;
  normalHealth -= power.absorbDamage(1);
  assert.equal(normalHealth, 2);
  assert.equal(power.bonusHealth, 1);
  normalHealth -= power.absorbDamage(2);
  assert.equal(normalHealth, 1);
  assert.equal(power.bonusHealth, 0);
  power.expire(21000);
  assert.equal(normalHealth, 1);
});

test('each activation replenishes only temporary hearts and progress clamps at zero', () => {
  const power = activated(1000);
  power.absorbDamage(2);
  power.expire(21000);
  assert.equal(power.remaining(22000), 0);
  assert.equal(power.request(31000, 1), 'started');
  power.phase = 'flashing';
  power.activate(33000);
  assert.equal(power.bonusHealth, 2);
  power.cancel();
  assert.equal(power.phase, 'idle');
  assert.equal(power.bonusHealth, 0);
});
