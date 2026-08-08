import { META } from '../lib/data.js'
import { useFilters } from '../lib/store.jsx'

// Position chips + min-matches slider. Shared across pages.
export default function FilterBar() {
  const { positions, togglePos, minMatches, setMinMatches } = useFilters()
  return (
    <div className="filters">
      <label>Position</label>
      {META.positions.map((p) => (
        <button key={p} className="chip" aria-pressed={positions.has(p)} onClick={() => togglePos(p)}>{p}</button>
      ))}
      <label style={{ marginLeft: 'auto' }}>
        Min matches
        <input type="range" min="1" max="10" value={minMatches} onChange={(e) => setMinMatches(+e.target.value)} />
        <b style={{ color: 'var(--ink)' }}>{minMatches}</b>
      </label>
    </div>
  )
}
