import { useMemo } from 'react'
import { showTip, moveTip, hideTip } from '../lib/tip.js'

// Reusable responsive scatter. Fixed viewBox scaled by CSS so it needs no measurement.
const W = 900, H = 520, M = { l: 58, r: 20, t: 16, b: 52 }

export default function Scatter({ rows, x, y, xlab, ylab, fill, label, tip, onClick, size }) {
  const geom = useMemo(() => {
    const pts = rows.filter((d) => x(d) != null && y(d) != null)
    if (!pts.length) return null
    const xs = pts.map(x), ys = pts.map(y)
    const xmin = Math.min(...xs), xmax = Math.max(...xs), ymin = Math.min(...ys), ymax = Math.max(...ys)
    const pdx = (xmax - xmin) * 0.05 || 1, pdy = (ymax - ymin) * 0.08 || 1
    const X = (v) => M.l + ((v - (xmin - pdx)) / ((xmax + pdx) - (xmin - pdx))) * (W - M.r - M.l)
    const Y = (v) => (H - M.b) - ((v - (ymin - pdy)) / ((ymax + pdy) - (ymin - pdy))) * (H - M.b - M.t)
    const ticks = (a, b) => { const o = []; for (let i = 0; i <= 5; i++) o.push(a + (b - a) / 5 * i); return o }
    return { X, Y, pts, xt: ticks(xmin - pdx, xmax + pdx), yt: ticks(ymin - pdy, ymax + pdy) }
  }, [rows, x, y])
  const labelled = label && geom ? label(geom.pts) : []
  return (
    <div className="chart-wrap">
      <svg className="chart" viewBox={`0 0 ${W} ${H}`} width={W} height={H}>
        {geom && geom.yt.map((t, i) => (
          <g key={'y' + i}>
            <line className="gridline" x1={M.l} x2={W - M.r} y1={geom.Y(t)} y2={geom.Y(t)} />
            <text className="axis" x={M.l - 8} y={geom.Y(t) + 3} textAnchor="end">{Math.round(t)}</text>
          </g>
        ))}
        {geom && geom.xt.map((t, i) => <text className="axis" key={'x' + i} x={geom.X(t)} y={H - M.b + 18} textAnchor="middle">{Math.round(t)}</text>)}
        <line className="baseline" x1={M.l} x2={W - M.r} y1={H - M.b} y2={H - M.b} />
        <line className="baseline" x1={M.l} x2={M.l} y1={M.t} y2={H - M.b} />
        <text className="axis-title" x={(M.l + W - M.r) / 2} y={H - 10} textAnchor="middle">{xlab}</text>
        <text className="axis-title" transform={`translate(16 ${(M.t + H - M.b) / 2}) rotate(-90)`} textAnchor="middle">{ylab}</text>
        {geom && geom.pts.map((d) => {
          const r = size ? size(d) : 5.5
          return (
            <circle key={d.player_id} className="dot" cx={geom.X(x(d))} cy={geom.Y(y(d))} r={r} fill={fill(d)}
              style={{ cursor: onClick ? 'pointer' : 'default' }}
              onMouseEnter={(e) => { showTip(tip(d), e); e.target.setAttribute('r', r + 2) }}
              onMouseMove={moveTip} onMouseLeave={(e) => { hideTip(); e.target.setAttribute('r', r) }}
              onClick={() => onClick && onClick(d)} />
          )
        })}
        {geom && labelled.map((d) => {
          const cx = geom.X(x(d)), cy = geom.Y(y(d)), flip = cx > W - 150
          return <text key={'l' + d.player_id} className="axis" style={{ fontWeight: 700, fill: 'var(--ink)' }}
            x={flip ? cx - 9 : cx + 9} y={cy + 4} textAnchor={flip ? 'end' : 'start'}>{d.player_short_name}</text>
        })}
      </svg>
    </div>
  )
}
