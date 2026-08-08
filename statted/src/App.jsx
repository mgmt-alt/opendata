import { NavLink, Route, Routes } from 'react-router-dom'
import Home from './components/Home.jsx'
import Leaderboard from './components/Leaderboard.jsx'
import Explorer from './components/Explorer.jsx'
import Profile from './components/Profile.jsx'
import Heatmaps from './components/Heatmaps.jsx'
import Radar from './components/Radar.jsx'

const LINKS = [
  ['/', 'Home', true],
  ['/leaderboard', 'Leaderboard'],
  ['/explorer', 'Explorer'],
  ['/profile', 'Player'],
  ['/compare', 'Compare'],
  ['/heatmaps', 'Heat-maps'],
]

export default function App() {
  return (
    <>
      <nav className="nav">
        <div className="nav-inner">
          <div className="brand">stat<span>ted</span></div>
          {LINKS.map(([to, label, end]) => (
            <NavLink key={to} to={to} end={end}>{label}</NavLink>
          ))}
        </div>
      </nav>
      <div className="wrap">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/explorer" element={<Explorer />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/compare" element={<Radar />} />
          <Route path="/heatmaps" element={<Heatmaps />} />
        </Routes>
      </div>
    </>
  )
}
