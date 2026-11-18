import test from 'node:test';
import assert from 'node:assert/strict';
import { themes, allWords, lettersOf, letterName, searchKey, wordCount } from '../src/games/magic-words/words.mjs';
import { createReader } from '../src/games/magic-words/speech.mjs';

test('Czech spelling preserves accents and treats CH as one letter, not OU or DĚ', () => {
  assert.deepEqual(lettersOf('CHLÉB'), ['ch', 'l', 'é', 'b']);
  assert.deepEqual(lettersOf('děti'), ['d', 'ě', 't', 'i']);
  assert.deepEqual(lettersOf('houba'), ['h', 'o', 'u', 'b', 'a']);
  assert.equal(letterName('ch'), 'ch');
  assert.equal(letterName('ů'), 'u s kroužkem');
  assert.equal(searchKey('ŽÁBA'), searchKey('zaba'));
  assert.equal(wordCount(1), '1 slovíčko');
  assert.equal(wordCount(3), '3 slovíčka');
  assert.equal(wordCount(0), '0 slovíček');
  assert.equal(themes.length, 10);
  assert.equal(allWords.length, 100);
  assert.equal(new Set(allWords.map(w => w.id)).size, 100);
  for (const item of allWords) assert.ok(item.picture && themes.some(t => t.id === item.theme));
});
function fixture(voices = [{ lang: 'cs-CZ' }]) {
  const spoken = [];
  const synth = { getVoices: () => voices, speak: u => spoken.push(u), resume() {}, cancel() {} };
  const timers = { setTimeout: () => 1, clearTimeout() {} };
  class Utterance { constructor(text) { this.text = text; } }
  return { spoken, reader: createReader(synth, Utterance, timers) };
}
test('speech highlights the current letter and completes after the final utterance', () => {
  const { spoken, reader } = fixture();
  const highlighted = [];
  let done = 0;
  reader.play('chléb', { onLetter: n => highlighted.push(n), onDone: () => done++, onError: () => assert.fail() });
  assert.deepEqual(spoken.map(u => u.text), ['chléb', 'ch', 'l', 'dlouhé e', 'b']);
  spoken[0].onstart();
  assert.deepEqual(highlighted, []);
  spoken[1].onstart();
  spoken[4].onstart();
  spoken[4].onend();
  assert.deepEqual(highlighted, [0, 3]);
  assert.equal(done, 1);
});
test('replay or navigation cancels old speech and ignores stale callbacks', () => {
  const { spoken, reader } = fixture();
  let oldCalls = 0;
  const callbacks = { onLetter: () => oldCalls++, onDone: () => oldCalls++, onError: () => oldCalls++ };
  reader.play('pes', callbacks);
  const oldStart = spoken[1].onstart;
  const oldEnd = spoken[3].onend;
  const oldError = spoken[0].onerror;
  reader.cancel();
  oldStart(); oldEnd(); oldError();
  assert.equal(oldCalls, 0);
  assert.equal(spoken[0].onstart, null);
});
test('missing Czech voice falls back instead of using an English voice', () => {
  const { reader, spoken } = fixture([{ lang: 'en-US' }]);
  let errors = 0;
  reader.play('pes', { onLetter: () => assert.fail(), onDone: () => assert.fail(), onError: () => errors++ });
  assert.equal(errors, 1);
  assert.equal(spoken.length, 0);
});

test('plain vowels are spoken without a prefix or added accent', () => {
  const { spoken, reader } = fixture();
  reader.play('kočka', { onLetter() {}, onDone() {}, onError: () => assert.fail() });
  assert.deepEqual(spoken.map(u => u.text), ['kočka', 'k', 'o', 'c s háčkem', 'k', 'a']);
  for (const vowel of ['a', 'e', 'o', 'u']) assert.equal(letterName(vowel), vowel);
  assert.equal(letterName('á'), 'dlouhé a');
  assert.equal(letterName('ó'), 'dlouhé o');
  assert.equal(letterName('ú'), 'u s čárkou');
  assert.equal(letterName('ě'), 'e s háčkem');
});

test('PRINCEZNA distinguishes short I, E and A from their accented forms', () => {
  const { spoken, reader } = fixture();
  reader.play('princezna', { onLetter() {}, onDone() {}, onError: () => assert.fail() });
  assert.deepEqual(spoken.map(u => u.text), [
    'princezna', 'p', 'r', 'i', 'n', 'c', 'e', 'z', 'n', 'a',
  ]);
  assert.equal(letterName('í'), 'dlouhé měkké i');
  assert.equal(letterName('é'), 'dlouhé e');
  assert.equal(letterName('á'), 'dlouhé a');
  assert.equal(letterName('y'), 'y');
  assert.equal(letterName('ý'), 'dlouhé tvrdé y');
});

test('plain consonants never inject accented vowels through phonetic name spellings', () => {
  for (const letter of 'bcdfghjklmnpqrstvwxz') {
    assert.equal(letterName(letter), letter);
  }
  assert.equal(letterName('Č'), 'c s háčkem');
  assert.equal(letterName('CH'), 'ch');
});

test('spelling contains no spoken Písmeno prefix for any word', () => {
  for (const item of allWords) {
    for (const letter of lettersOf(item.word)) assert.doesNotMatch(letterName(letter), /písmeno/iu);
  }
});

test('whole word stays at normal speed while spelling uses the selected speed', () => {
  for (const rate of [.1, .25, .5, .75, 1, 1.25]) {
    const { spoken, reader } = fixture();
    reader.play('kočka', { rate, onLetter() {}, onDone() {}, onError: () => assert.fail() });
    assert.equal(spoken.length, 6);
    assert.equal(spoken[0].rate, 1);
    assert.ok(spoken.slice(1).every(utterance => utterance.rate === rate));
  }
});

test('manual mode reads only the whole word, then speaks one letter per request', () => {
  const { spoken, reader } = fixture();
  let done = 0;
  const options = { rate: .2, onDone: () => done++, onError: () => assert.fail() };
  reader.playWord('kočka', options);
  assert.deepEqual(spoken.map(u => [u.text, u.rate]), [['kočka', 1]]);
  spoken[0].onend();
  assert.equal(done, 1);
  assert.equal(spoken.length, 1, 'finishing the word must not start spelling');
  reader.playLetter('k', options);
  assert.equal(spoken.length, 2);
  assert.equal(spoken[1].text, 'k');
  assert.equal(spoken[1].rate, .2);
  spoken[1].onend();
  assert.equal(spoken.length, 2, 'finishing a letter must wait for the next click');
  reader.playLetter('o', options);
  assert.equal(spoken[2].text, 'o');
});

test('switching to manual speech invalidates callbacks from automatic spelling', () => {
  const { spoken, reader } = fixture();
  const options = { onDone() {}, onError: () => assert.fail() };
  reader.play('pes', { ...options, onLetter: () => assert.fail('old spelling continued') });
  const staleLetter = spoken[1].onstart;
  reader.playWord('kočka', options);
  staleLetter();
  assert.equal(spoken.at(-1).text, 'kočka');
});
