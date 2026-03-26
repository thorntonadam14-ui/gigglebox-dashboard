"use client";

import { useEffect, useMemo, useState } from "react";

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

const shell: React.CSSProperties = {
  padding: 32,
  display: "grid",
  gap: 20,
  maxWidth: 1400,
  margin: "0 auto",
  fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
};

const card: React.CSSProperties = {
  border: "1px solid #e5e7eb",
  borderRadius: 18,
  padding: 18,
  background: "#ffffff",
  boxShadow: "0 8px 24px rgba(15, 23, 42, 0.04)"
};

const metricCard: React.CSSProperties = {
  ...card,
  minHeight: 112
};

export default function DashboardPage() {
  const [data, setData] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [childId, setChildId] = useState<string>("");

  async function loadDashboard(selectedChildId?: string) {
    setLoading(true);
    setError(null);

    try {
      const query = selectedChildId ? `?childId=${selectedChildId}` : "";
      const response = await fetch(`/api/dashboard/overview${query}`, { cache: "no-store" });
      const json = await response.json();

      if (!response.ok || !json.ok) {
        throw new Error(json.error || "Failed to load dashboard.");
      }

      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  const eventTypeList = useMemo(() => {
    if (!data) return [];
    return Object.entries(data.deepDive.eventTypes).sort((a, b) => b[1] - a[1]);
  }, [data]);

  return (
    <div style={shell}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap", alignItems: "end" }}>
        <div>
          <div style={{ color: "#7c3aed", fontWeight: 700, marginBottom: 8 }}>Parent Dashboard</div>
          <h1 style={{ margin: 0, fontSize: 40 }}>GiggleBox Dashboard</h1>
          <p style={{ marginTop: 10, color: "#667085", maxWidth: 760 }}>
            A parent-friendly overview with summary cards, recent activity, emotions, artwork signals, and room to drill deeper when needed.
          </p>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <a href="/" style={{ textDecoration: "underline" }}>Home</a>
          <a href="/children" style={{ textDecoration: "underline" }}>Children</a>
          <select value={childId} onChange={(e) => setChildId(e.target.value)} style={{ padding: "10px 12px", borderRadius: 10 }}>
            <option value="">All children</option>
            {data?.children.map((child) => (
              <option key={child.id} value={child.id}>{child.name}</option>
            ))}
          </select>
          <button onClick={() => loadDashboard(childId || undefined)} style={{ padding: "10px 14px", borderRadius: 10 }}>
            Refresh
          </button>
        </div>
      </div>

      {loading ? <p>Loading dashboard…</p> : null}
      {error ? <p style={{ color: "crimson" }}>{error}</p> : null}

      {data ? (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 14 }}>
            <div style={metricCard}><div style={{ color: "#667085" }}>Children</div><div style={{ fontSize: 30, fontWeight: 800, marginTop: 12 }}>{data.summary.totalChildren}</div></div>
            <div style={metricCard}><div style={{ color: "#667085" }}>Devices</div><div style={{ fontSize: 30, fontWeight: 800, marginTop: 12 }}>{data.summary.totalDevices}</div></div>
            <div style={metricCard}><div style={{ color: "#667085" }}>Active Links</div><div style={{ fontSize: 30, fontWeight: 800, marginTop: 12 }}>{data.summary.totalLinks}</div></div>
            <div style={metricCard}><div style={{ color: "#667085" }}>Total Events</div><div style={{ fontSize: 30, fontWeight: 800, marginTop: 12 }}>{data.summary.totalEvents}</div></div>
            <div style={metricCard}><div style={{ color: "#667085" }}>Latest Word</div><div style={{ fontSize: 24, fontWeight: 800, marginTop: 12 }}>{data.summary.latestWord ?? "—"}</div></div>
            <div style={metricCard}><div style={{ color: "#667085" }}>Latest Emotion</div><div style={{ fontSize: 24, fontWeight: 800, marginTop: 12 }}>{data.summary.latestEmotion ?? "—"}</div></div>
            <div style={metricCard}><div style={{ color: "#667085" }}>Coloring Saves</div><div style={{ fontSize: 30, fontWeight: 800, marginTop: 12 }}>{data.summary.coloringSaveCount}</div></div>
            <div style={metricCard}><div style={{ color: "#667085" }}>Open Alerts</div><div style={{ fontSize: 30, fontWeight: 800, marginTop: 12 }}>{data.summary.openAlerts}</div></div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 16 }}>
            <div style={card}>
              <h2 style={{ marginTop: 0 }}>Recent Activity</h2>
              <p style={{ color: "#667085", marginTop: 0 }}>
                Latest interactions across play, spoken words, emotion states, and saved artwork.
              </p>

              {data.recentActivity.length === 0 ? (
                <p>No activity yet.</p>
              ) : (
                <div style={{ display: "grid", gap: 12 }}>
                  {data.recentActivity.map((event) => (
                    <div key={event.id} style={{ borderTop: "1px solid #eef2f7", paddingTop: 12 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                        <strong>{event.eventType}</strong>
                        <span style={{ color: "#667085", fontSize: 13 }}>{event.createdAt ?? event.occurredAt ?? "—"}</span>
                      </div>
                      <div style={{ color: "#667085", fontSize: 13, marginTop: 4 }}>
                        {event.childName ? `Child: ${event.childName}` : "Child: not resolved"} • Device: {event.deviceId}
                      </div>
                      <pre style={{ marginTop: 10, padding: 12, background: "#f8fafc", borderRadius: 12, whiteSpace: "pre-wrap", overflowX: "auto" }}>
                        {JSON.stringify(event.payload, null, 2)}
                      </pre>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ display: "grid", gap: 16 }}>
              <div style={card}>
                <h2 style={{ marginTop: 0 }}>Children</h2>
                {data.children.length === 0 ? (
                  <p>No child profiles yet.</p>
                ) : (
                  <div style={{ display: "grid", gap: 12 }}>
                    {data.children.map((child) => (
                      <a
                        href={`/children/${child.id}`}
                        key={child.id}
                        style={{
                          border: "1px solid #eef2f7",
                          borderRadius: 14,
                          padding: 14,
                          color: "inherit",
                          textDecoration: "none"
                        }}
                      >
                        <div style={{ fontWeight: 700, fontSize: 18 }}>{child.name}</div>
                        <div style={{ color: "#667085", marginTop: 4 }}>
                          {typeof child.age === "number" ? `Age ${child.age}` : "Age not set"}
                        </div>
                        <div style={{ color: "#667085", marginTop: 6, fontSize: 13 }}>
                          Events: {child.totalEvents} • Emotion: {child.latestEmotion ?? "—"}
                        </div>
                        <div style={{ color: "#667085", marginTop: 6, fontSize: 13 }}>
                          Device: {child.linkedDevice?.device_name ?? "Not linked"}
                        </div>
                      </a>
                    ))}
                  </div>
                )}
              </div>

              <div style={card}>
                <h2 style={{ marginTop: 0 }}>Emotion View</h2>
                {data.deepDive.emotions.length === 0 ? (
                  <p>No emotion telemetry yet.</p>
                ) : (
                  <div style={{ display: "grid", gap: 8 }}>
                    {data.deepDive.emotions.slice(0, 8).map((emotion) => (
                      <div key={emotion.id} style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                        <span>{emotion.childName ?? "Unknown child"} — <strong>{emotion.emotion ?? "unknown"}</strong></span>
                        <span style={{ color: "#667085", fontSize: 13 }}>{emotion.createdAt ?? "—"}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div style={card}>
                <h2 style={{ marginTop: 0 }}>Saved Artwork / Coloring</h2>
                {data.deepDive.savedArtwork.length === 0 ? (
                  <p>No saved artwork telemetry yet.</p>
                ) : (
                  <div style={{ display: "grid", gap: 10 }}>
                    {data.deepDive.savedArtwork.slice(0, 6).map((art) => (
                      <div key={art.id} style={{ borderTop: "1px solid #eef2f7", paddingTop: 10 }}>
                        <div><strong>{art.title ?? art.page ?? "Saved artwork"}</strong></div>
                        <div style={{ color: "#667085", fontSize: 13 }}>
                          {art.childName ?? "Unknown child"} • {art.createdAt ?? "—"}
                        </div>
                        <div style={{ color: "#667085", fontSize: 13 }}>
                          Image: {art.imageUrl ?? "No image reference yet"}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div style={card}>
                <h2 style={{ marginTop: 0 }}>Event Type Mix</h2>
                {eventTypeList.length === 0 ? (
                  <p>No telemetry yet.</p>
                ) : (
                  <ul style={{ margin: 0, paddingLeft: 18 }}>
                    {eventTypeList.map(([eventType, count]) => (
                      <li key={eventType}>
                        <strong>{eventType}</strong>: {count}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
