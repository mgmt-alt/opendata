import { NavLink, Route, Routes } from 'react-router-dom'
import Home from './components/Home.jsx'
import Leaderboard from './components/Leaderboard.jsx'
import Explorer from './components/Explorer.jsx'
import Profile from './components/Profile.jsx'
import Radar from './components/Radar.jsx'
import Athletic from './components/Athletic.jsx'
import Passing from './components/Passing.jsx'
import Shooting from './components/Shooting.jsx'
import RunMix from './components/RunMix.jsx'
import Heatmaps from './components/Heatmaps.jsx'
import ThemeToggle from './components/ThemeToggle.jsx'
import Colophon from './components/Colophon.jsx'

const LINKS = [
  ['/', 'Index', true],
  ['/runs', 'Runs'],
  ['/leaderboard', 'Rating'],
  ['/explorer', 'Explore'],
  ['/athletic', 'Athletic'],
  ['/passing', 'Passing'],
  ['/shooting', 'Shooting'],
  ['/heatmaps', 'Territory'],
  ['/profile', 'Player'],
  ['/compare', 'Compare'],
]

// The wordmark carries a tiny run-vector — the atlas mark in miniature.
function Mark() {
  return (
    <svg className="mk" width="26" height="26" viewBox="0 0 40 40" aria-hidden="true">
      <g fill="none" stroke="var(--accent)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
        transform="rotate(-22 20 20)">
        <circle cx="7" cy="20" r="2.4" fill="var(--accent)" stroke="none" />
        <path d="M7 20 H33" />
        <path d="M26 14 L34 20 L26 26" />
      </g>
    </svg>
  )
}

export default function App() {
  return (
    <>
      <header className="masthead">
        <div className="mast-inner">
          <NavLink to="/" className="mast-brand">
            <Mark />
            <span>
              <span className="wm">stat<i>ted</i></span>
              <span className="tag">Atlas of Movement</span>
            </span>
          </NavLink>
          <nav className="mast-nav">
            {LINKS.map(([to, label, end]) => (
              <NavLink key={to} to={to} end={end}>{label}</NavLink>
            ))}
          </nav>
          <div className="mast-tools"><ThemeToggle /></div>
        </div>
      </header>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/leaderboard" element={<Page><Leaderboard /></Page>} />
        <Route path="/explorer" element={<Page><Explorer /></Page>} />
        <Route path="/profile" element={<Page><Profile /></Page>} />
        <Route path="/compare" element={<Page><Radar /></Page>} />
        <Route path="/athletic" element={<Page><Athletic /></Page>} />
        <Route path="/passing" element={<Page><Passing /></Page>} />
        <Route path="/shooting" element={<Page><Shooting /></Page>} />
        <Route path="/runs" element={<Page><RunMix /></Page>} />
        <Route path="/heatmaps" element={<Page><Heatmaps /></Page>} />
      </Routes>
    </>
  )
}

function Page({ children }) {
  return (
    <div className="wrap">
      {children}
      <Colophon />
    </div>
  )
}
