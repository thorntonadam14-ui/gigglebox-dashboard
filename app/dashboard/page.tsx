"use client";

import { useEffect, useState } from "react";

type Overview = {
  ok: boolean;
  summary: {
    totalChildren: number;
    totalDevices: number;
    totalLinks: number;
    totalEvents: number;
    lastEventType: string | null;
    lastEventAt: string | null;
    lastWord: string | null;
    emotionEventCount: number;
    latestEmotion: string | null;
    coloringSaveCount: number;
  };
  children: Array<{ id: string; name: string; age?: number | null }>;
  devices: Array<{ id: string; serial_number: string; device_name?: string | null }>;
  emotionBreakdown: Record<string, number>;
  latestColoringSave: {
    id: string;
    payload?: Record<string, unknown>;
    createdAt?: string | null;
  } | null;
  recentActivity: Array<{
    id: string;
    deviceId: string;
    eventType: string;
    payload: Record<string, unknown>;
    occurredAt: string | null;
    createdAt: string | null;
  }>;
  error?: string;
};

const cardStyle: React.CSSProperties = {
  border: "1px solid #ddd",
  borderRadius: 14,
  padding: 16,
  background: "#fff"
};

export default function DashboardPage() {
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/dashboard/overview", { cache: "no-store" });
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
    load();
  }, []);

  return (
    <div style={{ padding: 40, display: "grid", gap: 20 }}>
      <div>
        <h1 style={{ marginBottom: 8 }}>GiggleBox Dashboard</h1>
        <p style={{ marginTop: 0, color: "#555" }}>
          Summary cards for quick insight, plus recent activity for deeper drill-down.
        </p>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <a href="/" style={{ textDecoration: "underline" }}>Home</a>
          <a href="/children" style={{ textDecoration: "underline" }}>Children API View</a>
          <button onClick={load}>Refresh Dashboard</button>
        </div>
      </div>

      {loading ? <p>Loading dashboard…</p> : null}
      {error ? <p style={{ color: "crimson" }}>{error}</p> : null}

      {data ? (
        <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 16
            }}
          >
            <div style={cardStyle}>
              <strong>Total Events</strong>
              <div style={{ fontSize: 28, marginTop: 8 }}>{data.summary.totalEvents}</div>
            </div>
            <div style={cardStyle}>
              <strong>Children</strong>
              <div style={{ fontSize: 28, marginTop: 8 }}>{data.summary.totalChildren}</div>
            </div>
            <div style={cardStyle}>
              <strong>Devices</strong>
              <div style={{ fontSize: 28, marginTop: 8 }}>{data.summary.totalDevices}</div>
            </div>
            <div style={cardStyle}>
              <strong>Active Links</strong>
              <div style={{ fontSize: 28, marginTop: 8 }}>{data.summary.totalLinks}</div>
            </div>
            <div style={cardStyle}>
              <strong>Last Word</strong>
              <div style={{ fontSize: 22, marginTop: 8 }}>{data.summary.lastWord ?? "—"}</div>
            </div>
            <div style={cardStyle}>
              <strong>Latest Emotion</strong>
              <div style={{ fontSize: 22, marginTop: 8 }}>{data.summary.latestEmotion ?? "—"}</div>
            </div>
            <div style={cardStyle}>
              <strong>Emotion Events</strong>
              <div style={{ fontSize: 28, marginTop: 8 }}>{data.summary.emotionEventCount}</div>
            </div>
            <div style={cardStyle}>
              <strong>Coloring Saves</strong>
              <div style={{ fontSize: 28, marginTop: 8 }}>{data.summary.coloringSaveCount}</div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 16 }}>
            <div style={cardStyle}>
              <h2 style={{ marginTop: 0 }}>Recent Activity</h2>
              {data.recentActivity.length === 0 ? (
                <p>No telemetry yet.</p>
              ) : (
                <div style={{ display: "grid", gap: 12 }}>
                  {data.recentActivity.map((event) => (
                    <div key={event.id} style={{ borderTop: "1px solid #eee", paddingTop: 12 }}>
                      <div><strong>{event.eventType}</strong></div>
                      <div style={{ color: "#555", fontSize: 13 }}>
                        Device: {event.deviceId}
                      </div>
                      <div style={{ color: "#555", fontSize: 13 }}>
                        Time: {event.createdAt ?? event.occurredAt ?? "—"}
                      </div>
                      <pre
                        style={{
                          marginTop: 8,
                          padding: 12,
                          background: "#f7f7f7",
                          borderRadius: 10,
                          overflowX: "auto",
                          whiteSpace: "pre-wrap"
                        }}
                      >
                        {JSON.stringify(event.payload, null, 2)}
                      </pre>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ display: "grid", gap: 16 }}>
              <div style={cardStyle}>
                <h2 style={{ marginTop: 0 }}>Emotion State Summary</h2>
                {Object.keys(data.emotionBreakdown).length === 0 ? (
                  <p>No emotion telemetry yet.</p>
                ) : (
                  <ul>
                    {Object.entries(data.emotionBreakdown).map(([emotion, count]) => (
                      <li key={emotion}>
                        <strong>{emotion}</strong>: {count}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div style={cardStyle}>
                <h2 style={{ marginTop: 0 }}>Children</h2>
                {data.children.length === 0 ? (
                  <p>No children yet.</p>
                ) : (
                  <ul>
                    {data.children.map((child) => (
                      <li key={child.id}>
                        {child.name}{typeof child.age === "number" ? ` (age ${child.age})` : ""}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div style={cardStyle}>
                <h2 style={{ marginTop: 0 }}>Devices</h2>
                {data.devices.length === 0 ? (
                  <p>No devices yet.</p>
                ) : (
                  <ul>
                    {data.devices.map((device) => (
                      <li key={device.id}>
                        {device.device_name ?? "Unnamed"} — {device.serial_number}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div style={cardStyle}>
                <h2 style={{ marginTop: 0 }}>Latest Coloring Save</h2>
                {data.latestColoringSave ? (
                  <pre
                    style={{
                      margin: 0,
                      padding: 12,
                      background: "#f7f7f7",
                      borderRadius: 10,
                      overflowX: "auto",
                      whiteSpace: "pre-wrap"
                    }}
                  >
                    {JSON.stringify(data.latestColoringSave, null, 2)}
                  </pre>
                ) : (
                  <p>No coloring-book save telemetry yet.</p>
                )}
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
