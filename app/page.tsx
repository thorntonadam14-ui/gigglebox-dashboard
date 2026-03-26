export default function Home() {
  return (
    <div style={{padding:40}}>
      <h1>GiggleBox Dashboard</h1>
      <p>App is running ✅</p>
      <div style={{display:"flex", gap:12, flexWrap:"wrap"}}>
        <a href="/children">Go to Children</a>
        <a href="/dashboard">Open Dashboard</a>
        <a href="/api/health">Health</a>
      </div>
    </div>
  )
}
