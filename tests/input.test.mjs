import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { installGameScrollGuard } from '../src/games/fox-adventure/input.mjs';

function press(target, code, modifiers = {}) {
  const event = new Event('keydown', { cancelable: true });
  Object.defineProperties(event, Object.fromEntries(Object.entries({ code, ...modifiers }).map(([key, value]) => [key, { value }])));
  target.dispatchEvent(event);
  return event;
}

test('Space still reaches Phaser after repeated full game destruction and restart', () => {
  const target = new EventTarget();
  let attacks = 0;
  for (let run = 0; run < 5; run++) {
    const events = new EventEmitter();
    const phaserListener = event => { if (!event.defaultPrevented && event.code === 'Space') attacks++; };
    target.addEventListener('keydown', phaserListener);
    installGameScrollGuard(events, target);
    assert.equal(press(target, 'Space').defaultPrevented, true);
    assert.equal(attacks, run + 1);
    events.emit('destroy');
    target.removeEventListener('keydown', phaserListener);
    assert.equal(press(target, 'Space').defaultPrevented, false);
    assert.equal(events.listenerCount('shutdown'), 0);
    assert.equal(events.listenerCount('destroy'), 0);
  }
});

test('scene shutdown cleans up the scroll guard and Shift+Space stays captured', () => {
  const target = new EventTarget();
  const events = new EventEmitter();
  const remove = installGameScrollGuard(events, target);
  assert.equal(press(target, 'Space', { shiftKey: true }).defaultPrevented, true);
  assert.equal(press(target, 'Space', { ctrlKey: true }).defaultPrevented, false);
  events.emit('shutdown');
  remove();
  events.emit('destroy');
  assert.equal(press(target, 'Space').defaultPrevented, false);
  assert.equal(events.listenerCount('destroy'), 0);
});
