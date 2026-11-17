import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

export default function FoxAdventure() {
  const container = useRef(null);
  const [error, setError] = useState('');
  const [started, setStarted] = useState(false);
  const [finished, setFinished] = useState(false);
  const [run, setRun] = useState(0);
  const [cursorHint, setCursorHint] = useState('Click the game to capture the cursor. Esc releases it.');

  useEffect(() => {
    if (!started) return;
    const host = container.current;
    let game;
    let cancelled = false;
    import('./createGame.js').then(({ createGame }) => {
      if (!cancelled) game = createGame(host, {
        onComplete: () => {
          if (cancelled) return;
          if (document.pointerLockElement && host?.contains(document.pointerLockElement)) document.exitPointerLock();
          setFinished(true);
        },
      });
    }).catch(() => setError('The game could not load. Please refresh and try again.'));
    return () => {
      cancelled = true;
      if (document.pointerLockElement && host?.contains(document.pointerLockElement)) {
        document.exitPointerLock();
      }
      game?.destroy(true);
    };
  }, [started, run]);

  async function captureCursor(event) {
    if (!started || finished) return;
    const canvas = event.currentTarget.querySelector('canvas');
    if (!canvas || document.pointerLockElement === canvas) return;
    if (!canvas.requestPointerLock) {
      setCursorHint('Cursor capture is unavailable in this browser. Keyboard controls still work.');
      return;
    }
    try {
      await canvas.requestPointerLock();
      setCursorHint('Click the game to capture the cursor. Esc releases it.');
    } catch {
      setCursorHint('Cursor capture was blocked. Click the game to try again.');
    }
  }

  return <main className="game-page">
    <Link className="back-link" to="/games/">← All games</Link>
    <header><h1>Fox&rsquo;s Adventure</h1></header>
    <ul className="key-map" aria-label="Keyboard controls">
      <li><span><kbd>A</kbd><kbd>D</kbd></span> Move</li>
      <li><kbd>W</kbd> Jump</li>
      <li><kbd>S</kbd> Crouch</li>
      <li><kbd>Space</kbd> Throw bottle</li>
      <li><kbd>Shift</kbd> Run</li>
      <li><kbd>R</kbd> Restart</li>
    </ul>
    <p className="cursor-hint">{cursorHint}</p>
    {error ? <p role="alert">{error}</p> : <div className="game-canvas" ref={container} onClick={captureCursor} aria-label="Fox's Adventure platform game">
      {!started && <button className="start-adventure" onClick={() => setStarted(true)}>Start Adventure</button>}
      {finished && <button className="start-adventure" onClick={(event) => {
        event.stopPropagation();
        setFinished(false);
        setRun(value => value + 1);
      }}>Restart Adventure</button>}
    </div>}
  </main>;
}
