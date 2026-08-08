// Per-graph Players / Teams toggle.
export default function ViewToggle({ view, setView }) {
  return (
    <div className="vseg" role="group" aria-label="View">
      <span className="lab">View</span>
      {[['players', 'Players'], ['teams', 'Teams']].map(([v, lab]) => (
        <button key={v} aria-pressed={view === v} onClick={() => setView(v)}>{lab}</button>
      ))}
    </div>
  )
}
