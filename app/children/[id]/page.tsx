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

const SURFACE = "#ffffff";
const BORDER = "#e7ecf3";
const TEXT_MUTED = "#667085";
const TEXT = "#101828";
const BRAND = "#7c3aed";
const BG = "#f8fafc";

const card: React.CSSProperties = {
  border: `1px solid ${BORDER}`,
  borderRadius: 20,
  padding: 20,
  background: SURFACE,
  boxShadow: "0 10px 30px rgba(15, 23, 42, 0.06)"
};

const statValue: React.CSSProperties = {
  fontSize: 30,
  fontWeight: 800,
  marginTop: 10,
  color: TEXT,
  lineHeight: 1.1
};

const buttonStyle: React.CSSProperties = {
  border: `1px solid ${BORDER}`,
  background: SURFACE,
  borderRadius: 10,
  padding: "10px 14px",
  fontWeight: 600,
  color: TEXT,
  cursor: "pointer"
};

function formatDateTime(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function formatRelative(value: string | null | undefined) {
  if (!value) return "No activity yet";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  const diffMs = Date.now() - date.getTime();
  const minutes = Math.max(0, Math.round(diffMs / 60000));
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

function isSystemWord(word: string | null | undefined) {
  if (!word) return false;
  return ["ble_test", "hello"].includes(word.trim().toLowerCase());
}

function humanizeLabel(value: string | null | undefined) {
  if (!value) return "Unknown";
  return value
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function eventTone(eventType: string) {
  if (eventType.includes("emotion")) return "#ecfdf3";
  if (eventType.includes("word")) return "#eef4ff";
  if (eventType.includes("storybook")) return "#f5f3ff";
  if (eventType.includes("MONSTERCHEF")) return "#fff7ed";
  if (eventType.includes("coloring")) return "#effcf6";
  return "#f8fafc";
}

function summarizeEvent(eventType: string, payload: Record<string, unknown>, childName: string) {
  const safeName = childName || "This child";
  const word = typeof payload.word === "string" ? payload.word : null;
  const emotion = typeof payload.emotion === "string" ? payload.emotion : null;
  const pageId = typeof payload.page_id === "string" ? payload.page_id : null;
  const choiceValue = typeof payload.value === "string" ? payload.value : null;
  const choiceLabel = typeof payload.choice_label === "string" ? payload.choice_label : null;
  const saveTitle = typeof payload.title === "string" ? payload.title : null;

  switch (eventType) {
    case "word_spoken":
      return word ? `${safeName} said “${word}”.` : `${safeName} spoke a word.`;
    case "emotion_state":
      return emotion ? `${safeName} felt ${emotion}.` : `${safeName} sent an emotion update.`;
    case "coloring_saved":
      return `${safeName} saved ${saveTitle || "a colouring page"}.`;
    case "MONSTERCHEF_START":
      return `${safeName} started Monster Chef.`;
    case "MONSTERCHEF_CHOICE":
      return `${safeName} picked ${choiceLabel || choiceValue || "an option"} in Monster Chef.`;
    case "SPEAKTO_STORYBOOK_PAGE":
      return `${safeName} opened story page ${pageId || ""}.`.trim();
    case "SPEAKTO_STORYBOOK_CHOICE":
      return `${safeName} chose ${choiceValue || "an option"} in the story.`;
    default:
      return `${safeName} triggered ${humanizeLabel(eventType)}.`;
  }
}

export default function ChildDetailPage({ params }: { params: { id: string } }) {
  const [data, setData] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/dashboard/overview?childId=${params.id}`, { cache: "no-store" });
      const json = await response.json();

      if (!response.ok || !json.ok) {
        throw new Error(json.error || "Failed to load child detail.");
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
  }, [params.id]);

  const child = data?.children?.[0] ?? null;

  const filteredWords = useMemo(() => {
    return (data?.deepDive.words ?? []).filter((item) => !isSystemWord(item.word));
  }, [data]);

  const latestRealWord = filteredWords[0]?.word ?? null;
  const lastSeen = child?.lastActivityAt ?? data?.summary?.lastActivityAt ?? null;
  const deviceOnline = Boolean(lastSeen && Date.now() - new Date(lastSeen).getTime() < 1000 * 60 * 10);

  return (
    <div style={{ padding: 32, maxWidth: 1240, margin: "0 auto", display: "grid", gap: 20, background: BG, minHeight: "100vh" }}>
      <div>
        <div style={{ color: BRAND, fontWeight: 800, marginBottom: 8 }}>Child Detail</div>
        <h1 style={{ marginBottom: 8, color: TEXT }}>{child?.name ?? "Child"}</h1>
        <p style={{ marginTop: 0, color: TEXT_MUTED, maxWidth: 760 }}>
          Parent-friendly view of linked device status, recent learning activity, spoken words, emotions, storybook events, and saved colouring work.
        </p>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <a href="/children" style={{ color: BRAND, fontWeight: 600 }}>Back to Children</a>
          <a href="/dashboard" style={{ color: BRAND, fontWeight: 600 }}>Dashboard</a>
          <button onClick={load} style={buttonStyle}>Refresh Child</button>
        </div>
      </div>

      {loading ? <p>Loading child detail…</p> : null}
      {error ? <p style={{ color: "crimson" }}>{error}</p> : null}

      {data && child ? (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
            <div style={card}><div style={{ color: TEXT_MUTED }}>Age</div><div style={statValue}>{child.age ?? "—"}</div></div>
            <div style={card}><div style={{ color: TEXT_MUTED }}>Events</div><div style={statValue}>{child.totalEvents}</div></div>
            <div style={card}><div style={{ color: TEXT_MUTED }}>Latest Emotion</div><div style={{ ...statValue, fontSize: 24 }}>{child.latestEmotion ? humanizeLabel(child.latestEmotion) : "—"}</div></div>
            <div style={card}><div style={{ color: TEXT_MUTED }}>Latest Spoken Word</div><div style={{ ...statValue, fontSize: 24 }}>{latestRealWord ?? "—"}</div><div style={{ color: TEXT_MUTED, marginTop: 8, fontSize: 13 }}>System test words are hidden</div></div>
            <div style={card}><div style={{ color: TEXT_MUTED }}>Colouring Saves</div><div style={statValue}>{data.summary.coloringSaveCount}</div></div>
            <div style={card}>
              <div style={{ color: TEXT_MUTED }}>Linked Device</div>
              <div style={{ fontSize: 20, fontWeight: 800, marginTop: 10 }}>{child.linkedDevice?.device_name ?? "Not linked"}</div>
              <div style={{ marginTop: 10, display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 10px", borderRadius: 999, background: deviceOnline ? "#ecfdf3" : "#fef3f2", color: deviceOnline ? "#027a48" : "#b42318", fontWeight: 700, fontSize: 13 }}>
                <span style={{ width: 8, height: 8, borderRadius: 999, background: deviceOnline ? "#12b76a" : "#f04438", display: "inline-block" }} />
                {deviceOnline ? "Online" : "Offline"}
              </div>
              <div style={{ color: TEXT_MUTED, marginTop: 8, fontSize: 13 }}>Last seen {formatRelative(lastSeen)} · {formatDateTime(lastSeen)}</div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.35fr) minmax(320px, 0.95fr)", gap: 16, alignItems: "start" }}>
            <div style={card}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                <h2 style={{ marginTop: 0, marginBottom: 0 }}>Recent Child Activity</h2>
                <span style={{ color: TEXT_MUTED, fontSize: 13 }}>{data.recentActivity.length} recent events</span>
              </div>

              {data.recentActivity.length === 0 ? (
                <p>No activity for this child yet.</p>
              ) : (
                <div style={{ display: "grid", gap: 12, marginTop: 14 }}>
                  {data.recentActivity.map((event) => (
                    <div key={event.id} style={{ borderTop: "1px solid #eef2f7", paddingTop: 12 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
                        <div>
                          <div style={{ display: "inline-flex", padding: "4px 10px", borderRadius: 999, background: eventTone(event.eventType), fontSize: 12, fontWeight: 700, color: TEXT }}>
                            {humanizeLabel(event.eventType)}
                          </div>
                          <div style={{ marginTop: 8, fontWeight: 700, color: TEXT }}>{summarizeEvent(event.eventType, event.payload, child.name)}</div>
                        </div>
                        <span style={{ color: TEXT_MUTED, fontSize: 13, whiteSpace: "nowrap" }}>{formatDateTime(event.createdAt ?? event.occurredAt)}</span>
                      </div>
                      <pre style={{ marginTop: 10, padding: 12, background: "#f8fafc", borderRadius: 12, whiteSpace: "pre-wrap", overflowX: "auto", fontSize: 12, color: "#344054" }}>
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
                {filteredWords.length === 0 ? (
                  <p>No spoken words yet.</p>
                ) : (
                  <ul style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 8 }}>
                    {filteredWords.slice(0, 12).map((item) => (
                      <li key={item.id}>
                        <strong>{item.word ?? "unknown"}</strong> <span style={{ color: TEXT_MUTED }}>· {formatDateTime(item.createdAt)}</span>
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
                  <ul style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 8 }}>
                    {data.deepDive.emotions.slice(0, 12).map((item) => (
                      <li key={item.id}>
                        <strong>{humanizeLabel(item.emotion)}</strong> <span style={{ color: TEXT_MUTED }}>· {formatDateTime(item.createdAt)}</span>
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
                  <div style={{ display: "grid", gap: 12 }}>
                    {data.deepDive.savedArtwork.slice(0, 8).map((art) => (
                      <div key={art.id} style={{ paddingBottom: 10, borderBottom: "1px solid #eef2f7" }}>
                        <strong>{art.title ?? art.page ?? "Saved artwork"}</strong>
                        <div style={{ color: TEXT_MUTED, fontSize: 13, marginTop: 4 }}>Saved {formatDateTime(art.createdAt)}</div>
                        <div style={{ color: TEXT_MUTED, fontSize: 13 }}>Image: {art.imageUrl ?? "No image reference yet"}</div>
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
