// Consistent editorial header for every interior page: a numbered kicker, a big
// title (with optional accent via <em>…</em> in `title`), and a standfirst.
export default function PageHead({ no, kicker, title, sub, tag }) {
  return (
    <header className="page-head">
      <div className="eyebrow">{no ? `§ ${no} — ` : ''}{kicker}{tag ? <> &nbsp;<span className="tag-s">{tag}</span></> : null}</div>
      <h1 dangerouslySetInnerHTML={{ __html: title }} />
      {sub && <p className="sub" style={{ marginBottom: 0 }}>{sub}</p>}
    </header>
  )
}
