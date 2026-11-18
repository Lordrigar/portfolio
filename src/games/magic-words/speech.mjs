import { lettersOf, letterName } from './words.mjs';

// Queue speech inside the tap gesture (important on mobile Safari).
// Every callback belongs to a run: canceled speech can never advance a new word.
export function createReader(synth, Utterance, timers = globalThis) {
  let run = 0;
  let watchdog;
  let queued = [];
  const cancel = () => {
    run += 1;
    timers.clearTimeout(watchdog);
    queued.forEach(u => { u.onstart = u.onend = u.onerror = null; });
    queued = [];
    synth?.cancel();
  };
  function speak(entries, { onLetter = () => {}, onDone, onError }) {
    cancel();
    const current = run;
    const voice = synth?.getVoices().find(v => /^cs(?:-|$)/i.test(v.lang));
    if (!synth || !Utterance || !voice) { onError(); return; }
    const fail = () => { if (current !== run) return; cancel(); onError(); };
    const arm = rate => {
      timers.clearTimeout(watchdog);
      watchdog = timers.setTimeout(fail, 15000 / Math.min(1, rate));
    };
    queued = entries.map(({ text, rate, letterIndex }, index) => {
      const utterance = new Utterance(text);
      utterance.lang = 'cs-CZ';
      utterance.voice = voice;
      utterance.rate = rate;
      utterance.onstart = () => {
        if (current !== run) return;
        arm(rate);
        if (letterIndex !== undefined) onLetter(letterIndex);
      };
      utterance.onerror = fail;
      utterance.onend = () => {
        if (current !== run) return;
        if (index === entries.length - 1) {
          timers.clearTimeout(watchdog);
          queued = [];
          onDone();
        } else {
          arm(entries[index + 1].rate);
        }
      };
      return utterance;
    });
    arm(entries[0].rate);
    synth.resume();
    queued.forEach(u => synth.speak(u));
  }
  return {
    cancel,
    play(word, options) {
      const rate = options.rate ?? .75;
      speak([{ text: word, rate: 1 }, ...lettersOf(word).map((letter, letterIndex) => ({ text: letterName(letter), rate, letterIndex }))], options);
    },
    playWord(word, options) {
      speak([{ text: word, rate: 1 }], options);
    },
    playLetter(letter, options) {
      speak([{ text: letterName(letter), rate: options.rate ?? .75 }], options);
    },
  };
}
