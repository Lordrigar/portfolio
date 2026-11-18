import { Link } from 'react-router-dom';
import './synthwave.css';

function Palm() {
  return <svg viewBox="0 0 240 320" aria-hidden="true" focusable="false">
    <path className="palm-trunk" d="M110 319Q143 220 115 105L125 102Q163 212 134 319Z" />
    <g className="palm-fronds">
      <path d="M120 104Q54 48 3 97Q47 67 107 111Q46 81 8 148Q61 102 120 111Z" />
      <path d="M120 104Q58 12 21 39Q67 36 117 110Q91 31 108 4Q119 42 126 107Z" />
      <path d="M122 104Q168 21 220 52Q173 47 132 110Q194 62 239 113Q182 91 128 116Z" />
      <path d="M126 108Q204 95 227 176Q190 119 129 118Q164 145 164 209Q146 151 121 116Z" />
      <path d="M119 110Q60 119 54 193Q79 139 124 118Z" />
    </g>
    <path className="palm-highlight" d="M124 112Q153 219 123 315M119 106Q61 52 13 96M127 110Q183 65 231 110" />
  </svg>;
}

export function SynthwaveScene() {
  return <div className="synth-scene" aria-hidden="true">
      <div className="synth-stars" />
      <div className="synth-halo" />
      <div className="synth-sun" />
      <svg className="synth-mountains" viewBox="0 0 1440 190" preserveAspectRatio="none" focusable="false">
        <path d="M0 190V100L65 62 108 106 198 30 261 111 325 67 401 145 468 100 533 168 610 143 720 190 833 144 900 167 972 97 1031 140 1120 48 1193 102 1265 18 1342 100 1391 65 1440 110V190Z" />
      </svg>
      <div className="synth-floor">
        <svg className="synth-grid" viewBox="0 0 1000 500" preserveAspectRatio="none" focusable="false">
          {Array.from({ length: 23 }, (_, i) => <line key={i} x1="500" y1="0" x2={-1700 + i * 200} y2="500" />)}
        </svg>
        {Array.from({ length: 14 }, (_, i) => <div key={i} className="grid-crossline" style={{ animationDelay: `${-i * 0.23}s` }} />)}
        <div className="synth-road" />
        <div className="road-stripes" />
        <svg className="road-edges" viewBox="0 0 1000 500" preserveAspectRatio="none" focusable="false">
          <path d="M484 0 75 500M516 0 925 500" />
        </svg>
      </div>
      <div className="synth-horizon" />
      <div className="synth-palms">
        {[-1, 1].flatMap(side => Array.from({ length: 4 }, (_, i) =>
          <div key={`${side}-${i}`} className={`palm-traveller ${side < 0 ? 'palm-left' : 'palm-right'}`}
            style={{ '--travel-x': `${side * 66}vw`, animationDelay: `${-i * 3}s` }}><Palm /></div>,
        ))}
      </div>
      <div className="synth-vignette" />
      <div className="synth-scanlines" />
    </div>;
}

export default function SynthwaveLanding() {
  return <main className="synth-landing">
    <SynthwaveScene />

    <header className="synth-nav">
      <span className="synth-wordmark"><span aria-hidden="true">▱</span> PORTFOLIO</span>
      <Link to="/games/">Games <span aria-hidden="true">↗</span></Link>
    </header>

    <div className="synth-content">
      <h1><span className="synth-welcome">Welcome to my</span><span className="synth-title">humble collection</span></h1>
      <Link className="synth-cta" to="/games/">Explore the games <span aria-hidden="true">→</span></Link>
    </div>

    <footer className="synth-footer"><span aria-hidden="true">✦</span> Made for the fun of it.</footer>
  </main>;
}
