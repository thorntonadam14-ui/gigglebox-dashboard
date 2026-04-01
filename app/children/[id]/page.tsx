"use client";

import { use, useEffect, useState } from "react";

type Overview = {
  ok: boolean;
  filters: { childId: string | null };
  summary: {
    totalChildren: number;
    totalDevices: number;
    totalLinks: number;
    totalEvents: number;
    lastActivityAt: string | null;
    lastEventType: string | null;
    latestWord: string | null;
    latestEmotion: string | null;
    coloringSaveCount: number;
    openAlerts: number;
  };
  children: Array<{
    id: string;
    name: string;
    age: number | null;
    createdAt: string | null;
    linkedDevice: {
      id: string;
      serial_number: string;
      device_name: string | null;
      created_at: string | null;
    } | null;
    totalEvents: number;
    latestEmotion: string | null;
    lastActivityAt: string | null;
  }>;
  recentActivity: Array<{
    id: string;
    eventType: string;
    payload: Record<string, unknown>;
    deviceId: string;
    childId: string | null;
    childName: string | null;
    occurredAt: string | null;
    createdAt: string | null;
  }>;
  deepDive: {
    words: Array<{
      id: string;
      word: string | null;
      childId: string | null;
      childName: string | null;
      createdAt: string | null;
    }>;
    emotions: Array<{
      id: string;
      emotion: string | null;
      childId: string | null;
      childName: string | null;
      createdAt: string | null;
    }>;
    savedArtwork: Array<{
      id: string;
      childId: string | null;
      childName: string | null;
      imageUrl: string | null;
      page: string | null;
      title: string | null;
      payload: Record<string, unknown>;
      createdAt: string | null;
    }>;
    eventTypes: Record<string, number>;
  };
  alerts: Array<{
    id: string;
    child_id: string | null;
    alert_type: string | null;
    message: string | null;
    created_at: string | null;
  }>;
  error?: string;
};

const card: React.CSSProperties = {
  border: "1px solid #e5e7eb",
  borderRadius: 18,
  padding: 18,
  background: "#fff",
  boxShadow: "0 8px 24px rgba(15, 23, 42, 0.04)"
};

export default function ChildDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [data, setData] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/dashboard/overview?childId=${id}`, { cache: "no-store" });
      const text = await response.text();

      let json: Overview | { ok?: boolean; error?: string } | null = null;
      try {
        json = text ? JSON.parse(text) : null;
      } catch {
        throw new Error("Dashboard API returned a non-JSON response.");
      }

      if (!response.ok || !json?.ok) {
        throw new Error((json && "error" in json && json.error) || "Failed to load child detail.");
      }

      setData(json as Overview);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [id]);

  const child = data?.children?.[0] ?? null;

  return (
    <div style={{ padding: 32, maxWidth: 1200, margin: "0 auto", display: "grid", gap: 20 }}>
      <div>
        <div style={{ color: "#7c3aed", fontWeight: 700, marginBottom: 8 }}>Child Detail</div>
        <h1 style={{ marginBottom: 8 }}>{child?.name ?? "Child"}</h1>
        <p style={{ marginTop: 0, color: "#667085" }}>
          A more focused child view with linked device context, recent events, words, emotions, and saves.
        </p>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <a href="/children" style={{ textDecoration: "underline" }}>Back to Children</a>
          <a href="/dashboard" style={{ textDecoration: "underline" }}>Dashboard</a>
          <button onClick={load}>Refresh Child</button>
        </div>
      </div>

      {loading ? <p>Loading child detail…</p> : null}
      {error ? <p style={{ color: "crimson" }}>{error}</p> : null}

      {data && child ? (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
            <div style={card}><div style={{ color: "#667085" }}>Age</div><div style={{ fontSize: 28, fontWeight: 800, marginTop: 10 }}>{child.age ?? "—"}</div></div>
            <div style={card}><div style={{ color: "#667085" }}>Events</div><div style={{ fontSize: 28, fontWeight: 800, marginTop: 10 }}>{child.totalEvents}</div></div>
            <div style={card}><div style={{ color: "#667085" }}>Latest Emotion</div><div style={{ fontSize: 24, fontWeight: 800, marginTop: 10 }}>{child.latestEmotion ?? "—"}</div></div>
            <div style={card}><div style={{ color: "#667085" }}>Latest Word</div><div style={{ fontSize: 24, fontWeight: 800, marginTop: 10 }}>{data.summary.latestWord ?? "—"}</div></div>
            <div style={card}><div style={{ color: "#667085" }}>Coloring Saves</div><div style={{ fontSize: 28, fontWeight: 800, marginTop: 10 }}>{data.summary.coloringSaveCount}</div></div>
            <div style={card}><div style={{ color: "#667085" }}>Linked Device</div><div style={{ fontSize: 18, fontWeight: 700, marginTop: 10 }}>{child.linkedDevice?.device_name ?? "Not linked"}</div></div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 16 }}>
            <div style={card}>
              <h2 style={{ marginTop: 0 }}>Recent Child Activity</h2>
              {data.recentActivity.length === 0 ? (
                <p>No activity for this child yet.</p>
              ) : (
                <div style={{ display: "grid", gap: 12 }}>
                  {data.recentActivity.map((event) => (
                    <div key={event.id} style={{ borderTop: "1px solid #eef2f7", paddingTop: 12 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                        <strong>{event.eventType}</strong>
                        <span style={{ color: "#667085", fontSize: 13 }}>{event.createdAt ?? event.occurredAt ?? "—"}</span>
                      </div>
                      <pre style={{ marginTop: 8, padding: 12, background: "#f8fafc", borderRadius: 12, whiteSpace: "pre-wrap", overflowX: "auto" }}>
                        {JSON.stringify(event.payload, null, 2)}
                      </pre>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ display: "grid", gap: 16 }}>
              <div style={card}>
                <h2 style={{ marginTop: 0 }}>Words Spoken</h2>
                {data.deepDive.words.length === 0 ? (
                  <p>No words yet.</p>
                ) : (
                  <ul style={{ margin: 0, paddingLeft: 18 }}>
                    {data.deepDive.words.slice(0, 12).map((item) => (
                      <li key={item.id}>
                        <strong>{item.word ?? "unknown"}</strong> — {item.createdAt ?? "—"}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div style={card}>
                <h2 style={{ marginTop: 0 }}>Emotion Timeline</h2>
                {data.deepDive.emotions.length === 0 ? (
                  <p>No emotion signals yet.</p>
                ) : (
                  <ul style={{ margin: 0, paddingLeft: 18 }}>
                    {data.deepDive.emotions.slice(0, 12).map((item) => (
                      <li key={item.id}>
                        <strong>{item.emotion ?? "unknown"}</strong> — {item.createdAt ?? "—"}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div style={card}>
                <h2 style={{ marginTop: 0 }}>Saved Artwork</h2>
                {data.deepDive.savedArtwork.length === 0 ? (
                  <p>No saved artwork yet.</p>
                ) : (
                  <div style={{ display: "grid", gap: 10 }}>
                    {data.deepDive.savedArtwork.slice(0, 8).map((art) => (
                      <div key={art.id}>
                        <strong>{art.title ?? art.page ?? "Saved artwork"}</strong>
                        <div style={{ color: "#667085", fontSize: 13 }}>Image: {art.imageUrl ?? "No image reference yet"}</div>
                        <div style={{ color: "#667085", fontSize: 13 }}>{art.createdAt ?? "—"}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
