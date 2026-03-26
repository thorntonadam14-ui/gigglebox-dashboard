"use client";

import { useEffect, useState } from "react";

type Child = {
  id: string;
  name: string;
  age: number | null;
  created_at?: string | null;
  parent_id?: string;
};

type ChildrenResponse = {
  ok: boolean;
  count: number;
  children: Child[];
  error?: string;
};

const cardStyle: React.CSSProperties = {
  border: "1px solid #ddd",
  borderRadius: 16,
  padding: 18,
  background: "#fff"
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
    <div style={{ padding: 40, display: "grid", gap: 20 }}>
      <div>
        <h1 style={{ marginBottom: 8 }}>Children</h1>
        <p style={{ marginTop: 0, color: "#555" }}>
          Real child profiles pulled from Supabase, ready to evolve into the parent dashboard flow.
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
                <div key={child.id} style={cardStyle}>
                  <div style={{ fontSize: 12, color: "#666", marginBottom: 6 }}>Child Profile</div>
                  <h2 style={{ margin: "0 0 8px 0" }}>{child.name}</h2>
                  <div style={{ color: "#555", marginBottom: 8 }}>
                    {typeof child.age === "number" ? `Age ${child.age}` : "Age not set"}
                  </div>
                  <div style={{ fontSize: 13, color: "#666" }}>
                    ID: {child.id}
                  </div>
                  <div style={{ fontSize: 13, color: "#666", marginTop: 4 }}>
                    Created: {child.created_at ?? "—"}
                  </div>
                </div>
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
