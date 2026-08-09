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

export default function App() {
  return (
    <>
      <header className="masthead">
        <div className="mast-inner">
          <NavLink to="/" className="mast-brand">
            <span className="wm">stat<i>ted</i></span>
            <span className="tag">An Atlas of Movement</span>
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
