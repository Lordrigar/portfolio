import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Link, Route, Routes, useLocation } from 'react-router-dom';
import SynthwaveLanding, { SynthwaveScene } from './SynthwaveLanding.jsx';

const FoxAdventure = lazy(() => import('./games/fox-adventure/FoxAdventure.jsx'));

function PageTitle() {
  const { pathname } = useLocation();
  useEffect(() => {
    document.title = pathname.startsWith('/games/fox-adventure')
      ? "Fox’s Adventure | Portfolio"
      : pathname.startsWith('/games') ? 'Games | Portfolio' : 'Portfolio | Welcome to my humble collection';
  }, [pathname]);
  return null;
}


function Games() {
  return <main className="synth-landing synth-games">
    <SynthwaveScene />
    <header className="synth-nav">
      <Link className="synth-wordmark" to="/"><span aria-hidden="true">←</span> PORTFOLIO</Link>
      <span className="synth-current" aria-current="page">Games</span>
    </header>
    <div className="synth-library">
      <h1 className="synth-sr-only">Games</h1>
      <Link className="synth-game-card" to="/games/fox-adventure/">
        <div className="synth-game-art">
          <div className="synth-fox-glow" aria-hidden="true" />
          <img src="/games/fox-adventure/sprites/idle-00.png" alt="Sleepy pixel fox wearing a yellow hat" />
        </div>
        <div className="synth-game-copy">
          <h2>Fox&rsquo;s Adventure</h2>
          <p>A tired project manager on a quest to make it home from work.</p>
          <span className="synth-game-play">Play <span aria-hidden="true">→</span></span>
        </div>
      </Link>
    </div>
    <footer className="synth-footer"><span aria-hidden="true">✦</span> Made for the fun of it.</footer>
  </main>;
}

export default function App() {
  return <BrowserRouter><PageTitle /><Suspense fallback={<main><p>Loading game…</p></main>}>
    <Routes>
      <Route path="/" element={<SynthwaveLanding />} />
      <Route path="/games/" element={<Games />} />
      <Route path="/games/fox-adventure/" element={<FoxAdventure />} />
      <Route path="*" element={<main><h1>Page not found</h1><Link to="/">Back to portfolio</Link></main>} />
    </Routes>
  </Suspense></BrowserRouter>;
}
