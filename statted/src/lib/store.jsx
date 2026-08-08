import { createContext, useContext, useMemo, useState } from 'react'
import { DATA, META } from './data.js'

// Global filters (position set + min matches) shared across pages, plus a helper to select
// the filtered player pool.
const Ctx = createContext(null)

export function FiltersProvider({ children }) {
  const [positions, setPositions] = useState(() => new Set(META.positions))
  const [minMatches, setMinMatches] = useState(3)
  const togglePos = (p) => setPositions((prev) => {
    const next = new Set(prev)
    if (next.has(p)) next.delete(p); else next.add(p)
    if (next.size === 0) next.add(p)
    return next
  })
  const value = useMemo(() => ({ positions, togglePos, minMatches, setMinMatches }), [positions, minMatches])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
export const useFilters = () => useContext(Ctx)

// filtered player pool for the current filters
export function useFilteredPlayers() {
  const { positions, minMatches } = useFilters()
  return useMemo(
    () => DATA.filter((d) => positions.has(d.position_group) && d.matches >= minMatches),
    [positions, minMatches],
  )
}
