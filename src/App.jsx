import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Link, Route, Routes, useLocation } from 'react-router-dom';

const FoxAdventure = lazy(() => import('./games/fox-adventure/FoxAdventure.jsx'));

function PageTitle() {
  const { pathname } = useLocation();
  useEffect(() => {
    document.title = pathname.startsWith('/games/fox-adventure')
      ? "Fox’s Adventure | Portfolio"
      : pathname.startsWith('/games') ? 'Games | Portfolio' : 'Website under construction';
  }, [pathname]);
  return null;
}

function Home() {
  return <main className="landing">
    <p className="eyebrow">Coming soon</p>
    <h1>Website under construction</h1>
    <p>We&rsquo;re working on something new. Please check back soon.</p>
    <Link className="button" to="/games/">Explore the games →</Link>
  </main>;
}

function Games() {
  return <main className="games-page">
    <Link className="back-link" to="/">← Portfolio</Link>
    <Link className="game-card" to="/games/fox-adventure/">
      <div className="fox-preview"><img src="/games/fox-adventure/sprites/idle-00.png" alt="Sleepy pixel fox wearing a yellow hat" /></div>
      <div className="game-card-copy">
        <h2>Fox&rsquo;s Adventure</h2>
        <p>A tired project manager on a quest to make it home from work.</p>
        <span className="play-label">Play →</span>
      </div>
    </Link>
  </main>;
}

export default function App() {
  return <BrowserRouter><PageTitle /><Suspense fallback={<main><p>Loading game…</p></main>}>
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/games/" element={<Games />} />
      <Route path="/games/fox-adventure/" element={<FoxAdventure />} />
      <Route path="*" element={<main><h1>Page not found</h1><Link to="/">Back to portfolio</Link></main>} />
    </Routes>
  </Suspense></BrowserRouter>;
}
