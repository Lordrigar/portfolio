import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { allWords, lettersOf, searchKey, themes, wordCount } from './words.mjs';
import { createReader } from './speech.mjs';
import './magic-words.css';

function readSettings() {
  try {
    const value = JSON.parse(localStorage.getItem('magic-words-settings'));
    return { discovery: value?.discovery === 'manual' ? 'manual' : 'auto', mode: value?.mode === 'whole' ? 'whole' : 'reveal', lower: value?.lower === true, rate: Number.isFinite(value?.rate) && value.rate >= .1 && value.rate <= 1.25 ? value.rate : .75 };
  } catch { return { discovery: 'auto', mode: 'reveal', lower: false, rate: .75 }; }
}
function Book() {
  return <svg viewBox="0 0 240 180" fill="none" aria-hidden="true"><ellipse cx="120" cy="160" rx="94" ry="12" fill="#d8c8f5"/><path d="M120 54C89 35 51 37 18 52v95c36-16 70-13 102 5 32-18 66-21 102-5V52c-33-15-71-17-102 2Z" fill="#8660d3" stroke="#6944b2" strokeWidth="4"/><path d="M120 45C87 26 56 32 28 43v91c30-11 62-8 92 10 30-18 62-21 92-10V43c-28-11-59-17-92 2Z" fill="#fffdf9" stroke="#6944b2" strokeWidth="4"/><path d="M120 46v96M47 65l49 9M47 87l49 9M47 109l36 6M145 102l47-9M145 124l34-6" stroke="#d2bfe9" strokeWidth="5" strokeLinecap="round"/><path d="m165 43 5 14 15 1-12 10 4 15-12-8-13 8 4-15-12-10 15-1 6-14Z" fill="#ffce6c"/><path d="m51 11 3 8 8 3-8 3-3 8-3-8-8-3 8-3 3-8ZM204 10l3 7 7 3-7 3-3 7-3-7-7-3 7-3 3-7Z" fill="#b798df"/><circle cx="90" cy="14" r="4" fill="#f3b09e"/></svg>;
}

export default function MagicWords() {
  const [screen, setScreen] = useState('home');
  const [themeId, setThemeId] = useState(themes[0].id);
  const [index, setIndex] = useState(0);
  const [settings, setSettings] = useState(readSettings);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [active, setActive] = useState(-1);
  const [revealed, setRevealed] = useState(0);
  const [reading, setReading] = useState(false);
  const [audioError, setAudioError] = useState(false);
  const [hasVoice, setHasVoice] = useState(false);
  const reader = useRef(null);
  const theme = themes.find(t => t.id === themeId);
  const item = theme.words[index];
  const letters = lettersOf(item.word);
  const manual = settings.mode === 'reveal' && settings.discovery === 'manual';

  useEffect(() => {
    const synth = window.speechSynthesis;
    reader.current = createReader(synth, window.SpeechSynthesisUtterance);
    const check = () => setHasVoice(Boolean(synth?.getVoices().some(v => /^cs(?:-|$)/i.test(v.lang))));
    check();
    synth?.addEventListener('voiceschanged', check);
    const hide = () => { if (document.hidden) { reader.current.cancel(); setReading(false); setActive(-1); } };
    document.addEventListener('visibilitychange', hide);
    return () => { reader.current.cancel(); synth?.removeEventListener('voiceschanged', check); document.removeEventListener('visibilitychange', hide); };
  }, []);
  useEffect(() => { window.scrollTo(0, 0); }, [screen]);
  useEffect(() => {
    try { localStorage.setItem('magic-words-settings', JSON.stringify(settings)); } catch { /* Settings remain usable without storage. */ }
  }, [settings]);

  function stop() { reader.current?.cancel(); setReading(false); setActive(-1); }
  function navigate(next) { stop(); setAudioError(false); setScreen(next); }
  function selectWord(word) {
    stop(); setThemeId(word.theme); setIndex(themes.find(t => t.id === word.theme).words.findIndex(w => w.id === word.id));
    setRevealed(0); setAudioError(false); setScreen('play');
  }
  function play() {
    setRevealed(0); setActive(-1); setAudioError(false); setReading(true);
    const method = manual ? 'playWord' : 'play';
    reader.current?.[method](item.word, {
      rate: settings.rate,
      onLetter: n => { setActive(n); setRevealed(n + 1); },
      onDone: () => { setReading(false); setActive(-1); if (!manual) setRevealed(letters.length); },
      onError: () => { setReading(false); setActive(-1); setAudioError(true); },
    });
  }
  function revealNext() {
    if (revealed >= letters.length || (manual && reading)) return;
    stop();
    setActive(revealed);
    setRevealed(revealed + 1);
    if (manual) {
      setReading(true); setAudioError(false);
      reader.current?.playLetter(letters[revealed], {
        rate: settings.rate,
        onDone: () => setReading(false),
        onError: () => { setReading(false); setAudioError(true); },
      });
    }
  }
  function next() { stop(); setIndex((index + 1) % theme.words.length); setRevealed(0); setAudioError(false); }
  function updateSettings(patch) { stop(); setSettings(s => ({ ...s, ...patch })); setRevealed(0); }
  const matches = allWords.filter(w => (filter === 'all' || w.theme === filter) && searchKey(w.word).includes(searchKey(query.trim())));

  return <main className="magic-app" lang="cs">
    <div className="mw-cloud mw-cloud-one" aria-hidden="true"/><div className="mw-cloud mw-cloud-two" aria-hidden="true"/>
    <header className="mw-header">
      <button className="mw-brand" onClick={() => navigate('home')} aria-label="Kouzelná slovíčka – úvod"><span aria-hidden="true">✦</span> Kouzelná slovíčka</button>
      <nav aria-label="Hlavní navigace">
        <Link to="/games/">Portfolio</Link>
        <button className={screen === 'browse' ? 'mw-nav-active' : ''} onClick={() => navigate('browse')}>Najít slovíčko</button>
        <button aria-expanded={settingsOpen} onClick={() => setSettingsOpen(!settingsOpen)}>Nastavení <span aria-hidden="true">⚙</span></button>
      </nav>
    </header>
    {settingsOpen && <section className="mw-settings" aria-label="Nastavení hry">
      <fieldset><legend>Zobrazení slova</legend>
        <label><input type="radio" name="mode" checked={settings.mode === 'reveal'} onChange={() => updateSettings({ mode: 'reveal' })}/> Postupně odkrývat</label>
        <label><input type="radio" name="mode" checked={settings.mode === 'whole'} onChange={() => updateSettings({ mode: 'whole' })}/> Celé slovo a zvýraznění</label>
      </fieldset>
      {settings.mode === 'reveal' && <fieldset><legend>Odkrývání písmen</legend>
        <label><input type="radio" name="discovery" checked={!manual} onChange={() => updateSettings({ discovery: 'auto' })}/> Automaticky</label>
        <label><input type="radio" name="discovery" checked={manual} onChange={() => updateSettings({ discovery: 'manual' })}/> Po kliknutí</label>
      </fieldset>}
      <fieldset><legend>Tiskací písmena</legend>
        <label><input type="radio" name="case" checked={!settings.lower} onChange={() => updateSettings({ lower: false })}/> Velká ABC</label>
        <label><input type="radio" name="case" checked={settings.lower} onChange={() => updateSettings({ lower: true })}/> Malá abc</label>
      </fieldset>
      <div className="mw-speed">
        <label htmlFor="mw-reading-speed">Rychlost hláskování</label>
        <output htmlFor="mw-reading-speed">{settings.rate.toLocaleString('cs-CZ', { maximumFractionDigits: 2 })}×</output>
        <input id="mw-reading-speed" type="range" min="0.1" max="1.25" step="0.05" value={settings.rate} style={{ '--speed-progress': `${(settings.rate - .1) / 1.15 * 100}%` }}
          aria-valuetext={`${settings.rate.toLocaleString('cs-CZ')}×`}
          onChange={e => updateSettings({ rate: Number(e.target.value) })}/>
        <span className="mw-speed-scale" aria-hidden="true"><span>Pomaleji</span><span>Rychleji</span></span>
      </div>
      <button className="mw-soft" onClick={() => setSettingsOpen(false)}>Hotovo</button>
      <small>Hláskujeme českými názvy písmen. CH je jedno písmeno. Hlas závisí na zařízení.</small>
    </section>}

    {screen === 'home' && <div className="mw-home">
      <section className="mw-welcome"><div className="mw-book"><Book/></div><div><span className="mw-eyebrow">Malá písmenka, velká kouzla</span><h1>Co dnes napíšeme?</h1><p>Vyber si obrázek. Poslechni si slovíčko.<br/>A pak ho zkus napsat na papír.</p><span className="mw-paper-note"><span aria-hidden="true">✏️</span> Připrav si tužku a papír. Nikam nespěcháme.</span></div></section>
      <section className="mw-themes" aria-labelledby="mw-theme-title"><div className="mw-section-heading"><h2 id="mw-theme-title">Vyber si svůj svět</h2><span>10 světů · 100 slovíček</span></div>
        <div className="mw-theme-grid">{themes.map(t => <button className="mw-theme" key={t.id} style={{ '--theme-color': t.color }} onClick={() => selectWord(t.words[0])}><span className="mw-theme-picture" aria-hidden="true">{t.icon}</span><strong>{t.title}</strong><span>{t.words.length} slovíček</span></button>)}</div>
      </section>
      <footer className="mw-footer">Každé písmenko se počítá. I to trochu křivé. <span aria-hidden="true">♡</span></footer>
    </div>}

    {screen === 'browse' && <section className="mw-browser"><div className="mw-section-heading"><div><span className="mw-eyebrow">Malý obrázkový slovník</span><h1>Najdi si slovíčko</h1></div><span>{wordCount(matches.length)}</span></div>
      <div className="mw-search"><label>Hledat slovíčko<input type="search" placeholder="Třeba kočka…" value={query} onChange={e => setQuery(e.target.value)}/></label><label>Svět<select value={filter} onChange={e => setFilter(e.target.value)}><option value="all">Všechny světy</option>{themes.map(t => <option value={t.id} key={t.id}>{t.title}</option>)}</select></label></div>
      <div className="mw-word-grid">{matches.map(w => <button key={w.id} onClick={() => selectWord(w)}><span aria-hidden="true">{w.picture}</span><strong>{settings.lower ? w.word : w.word.toLocaleUpperCase('cs')}</strong></button>)}</div>
      {!matches.length && <p className="mw-empty">Tohle slovíčko tu ještě není. Zkus jiné.</p>}
    </section>}

    {screen === 'play' && <section className="mw-play" aria-label="Psaní slovíčka"><h1 className="synth-sr-only">Píšeme slovíčka</h1>
      <div className="mw-play-top"><button className="mw-soft" onClick={() => navigate('home')}>Vybrat jiný svět</button><span>{theme.icon} {theme.title} <b>{index + 1} / {theme.words.length}</b></span></div>
      <div className="mw-word-stage" style={{ '--theme-color': theme.color }}>
        <div className="mw-picture-orbit"><span className="mw-spark mw-spark-one" aria-hidden="true">✦</span><span className="mw-main-picture" role="img" aria-label={item.word}>{item.picture}</span><span className="mw-spark mw-spark-two" aria-hidden="true">✧</span></div>
        <div className="mw-letter-row" style={{ '--letter-count': letters.length }} aria-label={settings.mode === 'whole' || revealed === letters.length ? item.word : 'Poslechni si a odkryj písmena'}>{letters.map((letter, n) => <span key={`${item.id}-${n}`} aria-hidden="true" className={`mw-letter ${letter.length > 1 ? 'mw-letter-digraph' : ''} ${n === active ? 'mw-letter-active' : ''} ${settings.mode === 'reveal' && n >= revealed ? 'mw-letter-hidden' : ''}`}>{settings.lower ? letter : letter.toLocaleUpperCase('cs')}</span>)}</div>
        <p className="mw-writing-hint">{reading ? 'Poslouchej a sleduj písmenka…' : revealed === letters.length ? 'Teď je řada na tobě. Napiš slovíčko na papír.' : manual ? 'Odkrývej písmenka tlačítkem, jedno po druhém.' : 'Jak se to píše? Pojďme to zjistit.'}</p>
        <div className="mw-actions"><button className="mw-primary" onClick={play}><span aria-hidden="true">♫</span> {reading ? 'Znovu od začátku' : manual ? 'Poslechnout slovíčko' : 'Poslechnout a hláskovat'}</button>{reading && <button className="mw-soft" onClick={stop}>Zastavit</button>}</div>
        {(!hasVoice || audioError) && <p className="mw-audio-note" role="status">{audioError ? 'Hlas se nepodařilo přehrát.' : 'Český hlas zatím není dostupný.'} Písmenka můžeš odkrývat tlačítkem. Pro zvuk zkontroluj český hlas v nastavení zařízení.</p>}
        <button className="mw-reveal" disabled={revealed >= letters.length || (manual && reading)} onClick={revealNext}>{settings.mode === 'whole' ? 'Zvýraznit další písmenko' : 'Odkrýt další písmenko'}</button>
      </div>
      <div className="mw-play-bottom"><span><span aria-hidden="true">✏️</span> Piš si svým tempem.</span><button className="mw-next" onClick={next}>{index === theme.words.length - 1 ? 'Znovu projít svět' : 'Další slovíčko'} <span aria-hidden="true">✦</span></button></div>
    </section>}
  </main>;
}
