"use client";

import { useEffect, useState } from "react";

type Child = {
  id: string;
  name: string;
  age: number | null;
  created_at?: string | null;
};

type ChildrenResponse = {
  ok: boolean;
  count: number;
  children: Child[];
  error?: string;
};

const cardStyle: React.CSSProperties = {
  border: "1px solid #e5e7eb",
  borderRadius: 18,
  padding: 18,
  background: "#fff",
  boxShadow: "0 8px 24px rgba(15, 23, 42, 0.04)"
};

export default function ChildrenPage() {
  const [data, setData] = useState<ChildrenResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadChildren() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/children", { cache: "no-store" });
      const json = await response.json();

      if (!response.ok || !json.ok) {
        throw new Error(json.error || "Failed to load children.");
      }

      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadChildren();
  }, []);

  return (
    <div style={{ padding: 32, maxWidth: 1200, margin: "0 auto", display: "grid", gap: 20 }}>
      <div>
        <div style={{ color: "#7c3aed", fontWeight: 700, marginBottom: 8 }}>Parent Dashboard</div>
        <h1 style={{ marginBottom: 8 }}>Children</h1>
        <p style={{ marginTop: 0, color: "#667085" }}>
          Child profiles pulled from Supabase, ready for richer parent views and child-specific drill-down.
        </p>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <a href="/" style={{ textDecoration: "underline" }}>Home</a>
          <a href="/dashboard" style={{ textDecoration: "underline" }}>Open Dashboard</a>
          <button onClick={loadChildren}>Refresh Children</button>
        </div>
      </div>

      {loading ? <p>Loading children…</p> : null}
      {error ? <p style={{ color: "crimson" }}>{error}</p> : null}

      {data && !loading ? (
        data.children.length === 0 ? (
          <div style={cardStyle}>
            <h2 style={{ marginTop: 0 }}>No children yet</h2>
            <p style={{ marginBottom: 0 }}>
              Create a child via the API first, then this page will show real profile cards.
            </p>
          </div>
        ) : (
          <>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                gap: 16
              }}
            >
              {data.children.map((child) => (
                <a
                  key={child.id}
                  href={`/children/${child.id}`}
                  style={{ ...cardStyle, color: "inherit", textDecoration: "none" }}
                >
                  <div style={{ fontSize: 12, color: "#667085", marginBottom: 8 }}>Child Profile</div>
                  <h2 style={{ margin: "0 0 8px 0" }}>{child.name}</h2>
                  <div style={{ color: "#667085", marginBottom: 8 }}>
                    {typeof child.age === "number" ? `Age ${child.age}` : "Age not set"}
                  </div>
                  <div style={{ fontSize: 13, color: "#667085" }}>ID: {child.id}</div>
                  <div style={{ fontSize: 13, color: "#667085", marginTop: 4 }}>
                    Created: {child.created_at ?? "—"}
                  </div>
                </a>
              ))}
            </div>

            <div style={cardStyle}>
              <h2 style={{ marginTop: 0 }}>Quick View</h2>
              <p style={{ margin: 0 }}>
                Total children: <strong>{data.count}</strong>
              </p>
            </div>
          </>
        )
      ) : null}
    </div>
  );
}
