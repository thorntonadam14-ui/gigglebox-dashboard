export default function Dashboard() {
  return (
    <div style={{ padding: 32, maxWidth: 1000, margin: "0 auto", fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif" }}>
      <div style={{ color: "#7c3aed", fontWeight: 700, marginBottom: 10 }}>Connected Dashboard</div>
      <h1 style={{ marginTop: 0, marginBottom: 10, fontSize: 40 }}>Dashboard</h1>
      <p style={{ color: "#667085", maxWidth: 720 }}>
        Device connected successfully. This is the post-sync area. From here, the next step is to add child switching, unlinking, and richer dashboard content.
      </p>
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginTop: 18 }}>
        <a href="/">Home</a>
        <a href="/children">Children</a>
        <a href="/bluetooth">Bluetooth Console</a>
      </div>

      <div style={{ marginTop: 28, padding: 18, border: "1px solid #e5e7eb", borderRadius: 18, background: "#fff", boxShadow: "0 8px 24px rgba(15, 23, 42, 0.04)" }}>
        <strong>Device connected ✅</strong>
        <p style={{ color: "#667085", marginBottom: 0 }}>
          Do not go back to setup unless you want to intentionally create a new child or start a fresh sync flow later.
        </p>
      </div>
    </div>
  );
}
