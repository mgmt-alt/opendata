import { useMemo, useState } from 'react'

// Generic sortable table. columns: [{ key, label, get(d), fmt?(v,d), numeric?, align? }]
export default function DataTable({ rows, columns, initialSort, onRowClick }) {
  const [sort, setSort] = useState(initialSort || { key: columns[0].key, dir: 1 })
  const colBy = Object.fromEntries(columns.map((c) => [c.key, c]))
  const sorted = useMemo(() => {
    const c = colBy[sort.key]
    return [...rows].sort((a, b) => {
      const va = c.get(a), vb = c.get(b)
      if (c.numeric) return (( va ?? -Infinity) - (vb ?? -Infinity)) * sort.dir
      return String(va).localeCompare(String(vb)) * sort.dir
    })
  }, [rows, sort, colBy])
  const click = (k) => setSort((s) => (s.key === k ? { key: k, dir: -s.dir } : { key: k, dir: colBy[k].numeric ? -1 : 1 }))
  return (
    <div className="tbl-wrap">
      <table className="tbl">
        <thead>
          <tr>{columns.map((c) => (
            <th key={c.key} onClick={() => click(c.key)} className={c.numeric ? 'num' : ''} style={{ textAlign: c.align || (c.numeric ? 'right' : 'left') }}>
              {c.label}{sort.key === c.key ? (sort.dir < 0 ? ' ▾' : ' ▴') : ''}
            </th>
          ))}</tr>
        </thead>
        <tbody>
          {sorted.map((d) => (
            <tr key={d.player_id} onClick={() => onRowClick && onRowClick(d)} className={onRowClick ? 'clickable' : ''}>
              {columns.map((c) => {
                const v = c.get(d)
                return <td key={c.key} className={c.numeric ? 'num' : ''} style={{ textAlign: c.align || (c.numeric ? 'right' : 'left') }}>{c.fmt ? c.fmt(v, d) : v}</td>
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
