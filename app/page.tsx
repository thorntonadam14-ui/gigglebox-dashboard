export default function Home() {
  return (
    <div style={{ padding: 32, maxWidth: 1000, margin: "0 auto", fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif" }}>
      <div style={{ color: "#7c3aed", fontWeight: 700, marginBottom: 10 }}>GiggleBox Parent Dashboard</div>
      <h1 style={{ marginTop: 0, marginBottom: 10, fontSize: 42 }}>GiggleBox Dashboard</h1>
      <p style={{ color: "#667085", maxWidth: 720 }}>
        A growing parent dashboard for child profiles, linked toys, emotions, spoken words, activity history, and saved artwork.
      </p>
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginTop: 18 }}>
        <a href="/children">Children</a>
        <a href="/dashboard">Dashboard</a>
        <a href="/api/health">Health</a>
        <a href="/api/children">Children API</a>
      </div>
    </div>
  );
}
