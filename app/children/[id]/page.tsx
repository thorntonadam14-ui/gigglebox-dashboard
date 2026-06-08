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
const BRAND_DARK = "#5925dc";
const BG = "#fbf8f3";
const SOFT_BLUE = "#eef4ff";
const SOFT_PURPLE = "#f4f0ff";
const SOFT_YELLOW = "#fff7d6";

const card: React.CSSProperties = {
  border: `1px solid ${BORDER}`,
  borderRadius: 24,
  padding: 22,
  background: SURFACE,
  boxShadow: "0 18px 45px rgba(49, 46, 129, 0.08)"
};

const statValue: React.CSSProperties = {
  fontSize: 32,
  fontWeight: 900,
  marginTop: 10,
  color: TEXT,
  lineHeight: 1.05
};

const buttonStyle: React.CSSProperties = {
  border: `1px solid ${BORDER}`,
  background: SURFACE,
  borderRadius: 999,
  padding: "10px 16px",
  fontWeight: 800,
  color: TEXT,
  cursor: "pointer",
  boxShadow: "0 8px 20px rgba(15, 23, 42, 0.05)"
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

function getEmotionMeta(value: string | null | undefined) {
  const emotion = (value || "unknown").trim().toLowerCase();

  if (emotion.includes("happy") || emotion.includes("joy") || emotion.includes("excited")) {
    return { label: "Happy", icon: "😊", bg: "#fff7d6", border: "#f7d774", color: "#8a5a00" };
  }
  if (emotion.includes("sad") || emotion.includes("upset")) {
    return { label: "Sad", icon: "😢", bg: "#eef4ff", border: "#b2ccff", color: "#1849a9" };
  }
  if (emotion.includes("angry") || emotion.includes("mad") || emotion.includes("frustrated")) {
    return { label: "Angry", icon: "😠", bg: "#fff1f3", border: "#fecdd6", color: "#c01048" };
  }
  if (emotion.includes("calm") || emotion.includes("relaxed")) {
    return { label: "Calm", icon: "😌", bg: "#ecfdf3", border: "#abefc6", color: "#067647" };
  }
  if (emotion.includes("scared") || emotion.includes("fear") || emotion.includes("worried")) {
    return { label: "Worried", icon: "😟", bg: "#f4f0ff", border: "#d9d6fe", color: "#5925dc" };
  }
  if (emotion.includes("surprised")) {
    return { label: "Surprised", icon: "😮", bg: "#fff6ed", border: "#fedf89", color: "#b93815" };
  }

  return { label: humanizeLabel(value), icon: "🙂", bg: "#f8fafc", border: BORDER, color: TEXT_MUTED };
}

function eventTone(eventType: string) {
  if (eventType.includes("emotion")) return "#fff7d6";
  if (eventType.includes("word")) return "#eef4ff";
  if (eventType.includes("storybook")) return "#f4f0ff";
  if (eventType.includes("MONSTERCHEF")) return "#fff6ed";
  if (eventType.includes("coloring")) return "#ecfdf3";
  return "#f8fafc";
}

function eventIcon(eventType: string) {
  if (eventType.includes("emotion")) return "😊";
  if (eventType.includes("word")) return "💬";
  if (eventType.includes("storybook")) return "📖";
  if (eventType.includes("MONSTERCHEF")) return "🍳";
  if (eventType.includes("coloring")) return "🎨";
  return "✨";
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
      return emotion ? `${safeName} chose ${humanizeLabel(emotion)}.` : `${safeName} shared how they felt.`;
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
      return `${safeName} played with ${humanizeLabel(eventType)}.`;
  }
}

function chunkWords<T>(items: T[], size: number) {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
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

  const wordPages = useMemo(() => chunkWords(filteredWords.slice(0, 40), 20), [filteredWords]);
  const latestRealWord = filteredWords[0]?.word ?? null;
  const latestEmotion = child?.latestEmotion ?? data?.summary?.latestEmotion ?? null;
  const latestEmotionMeta = getEmotionMeta(latestEmotion);
  const lastSeen = child?.lastActivityAt ?? data?.summary?.lastActivityAt ?? null;
  const deviceOnline = Boolean(lastSeen && Date.now() - new Date(lastSeen).getTime() < 1000 * 60 * 10);

  return (
    <div style={{ padding: 24, background: BG, minHeight: "100vh", fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif" }}>
      <div style={{ maxWidth: 1240, margin: "0 auto", display: "grid", gap: 20 }}>
        <div
          style={{
            borderRadius: 32,
            padding: 28,
            background: "linear-gradient(135deg, #ffffff 0%, #f4f0ff 48%, #eef4ff 100%)",
            border: `1px solid ${BORDER}`,
            boxShadow: "0 24px 60px rgba(49, 46, 129, 0.10)",
            position: "relative",
            overflow: "hidden"
          }}
        >
          <div style={{ position: "absolute", right: -24, top: -30, fontSize: 120, opacity: 0.14 }}>📖</div>
          <div style={{ color: BRAND_DARK, fontWeight: 900, marginBottom: 8, letterSpacing: 0.2 }}>GiggleBox Report</div>
          <h1 style={{ margin: 0, color: TEXT, fontSize: "clamp(32px, 5vw, 56px)", lineHeight: 1 }}>{child?.name ?? "Child"}</h1>
          <p style={{ margin: "14px 0 0", color: TEXT_MUTED, maxWidth: 760, fontSize: 17, lineHeight: 1.55 }}>
            A clean parent view of spoken words, emotions, story moments, device status and creative play.
          </p>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center", marginTop: 20 }}>
            <a href="/children" style={{ ...buttonStyle, color: BRAND_DARK, textDecoration: "none" }}>← Back to Children</a>
            <a href="/dashboard" style={{ ...buttonStyle, color: BRAND_DARK, textDecoration: "none" }}>Dashboard</a>
            <button onClick={load} style={buttonStyle}>Refresh Report</button>
          </div>
        </div>

        {loading ? <div style={card}>Loading child report…</div> : null}
        {error ? <div style={{ ...card, color: "crimson" }}>{error}</div> : null}

        {data && child ? (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
              <div style={card}><div style={{ color: TEXT_MUTED, fontWeight: 800 }}>Age</div><div style={statValue}>{child.age ?? "—"}</div></div>
              <div style={card}><div style={{ color: TEXT_MUTED, fontWeight: 800 }}>Play Moments</div><div style={statValue}>{child.totalEvents}</div></div>
              <div style={{ ...card, background: latestEmotionMeta.bg, border: `2px solid ${latestEmotionMeta.border}` }}>
                <div style={{ color: latestEmotionMeta.color, fontWeight: 900 }}>Current Feeling</div>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 12 }}>
                  <div style={{ width: 58, height: 58, borderRadius: 20, background: "rgba(255,255,255,0.75)", display: "grid", placeItems: "center", fontSize: 34, boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.9)" }}>{latestEmotionMeta.icon}</div>
                  <div style={{ fontSize: 26, fontWeight: 900, color: latestEmotionMeta.color }}>{latestEmotion ? latestEmotionMeta.label : "—"}</div>
                </div>
              </div>
              <div style={card}><div style={{ color: TEXT_MUTED, fontWeight: 800 }}>Latest Word</div><div style={{ ...statValue, fontSize: 28 }}>{latestRealWord ?? "—"}</div><div style={{ color: TEXT_MUTED, marginTop: 8, fontSize: 13 }}>System test words are hidden</div></div>
              <div style={card}><div style={{ color: TEXT_MUTED, fontWeight: 800 }}>Artwork Saves</div><div style={statValue}>{data.summary.coloringSaveCount}</div></div>
              <div style={card}>
                <div style={{ color: TEXT_MUTED, fontWeight: 800 }}>Linked Device</div>
                <div style={{ fontSize: 20, fontWeight: 900, marginTop: 10 }}>{child.linkedDevice?.device_name ?? "Not linked"}</div>
                <div style={{ marginTop: 10, display: "inline-flex", alignItems: "center", gap: 8, padding: "7px 12px", borderRadius: 999, background: deviceOnline ? "#ecfdf3" : "#fff1f3", color: deviceOnline ? "#027a48" : "#c01048", fontWeight: 900, fontSize: 13 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 999, background: deviceOnline ? "#12b76a" : "#f04438", display: "inline-block" }} />
                  {deviceOnline ? "Online" : "Offline"}
                </div>
                <div style={{ color: TEXT_MUTED, marginTop: 8, fontSize: 13 }}>Last seen {formatRelative(lastSeen)} · {formatDateTime(lastSeen)}</div>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.45fr) minmax(320px, 0.9fr)", gap: 16, alignItems: "start" }}>
              <div style={card}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
                  <div>
                    <div style={{ color: BRAND_DARK, fontWeight: 900, marginBottom: 6 }}>Speech Book</div>
                    <h2 style={{ margin: 0, fontSize: 30 }}>Words Spoken</h2>
                    <p style={{ margin: "8px 0 0", color: TEXT_MUTED }}>Words are grouped into friendly book pages so the report stays tidy even after lots of play.</p>
                  </div>
                  <span style={{ padding: "8px 12px", borderRadius: 999, background: SOFT_BLUE, color: BRAND_DARK, fontWeight: 900, fontSize: 13 }}>{filteredWords.length} words</span>
                </div>

                {filteredWords.length === 0 ? (
                  <div style={{ marginTop: 18, padding: 22, borderRadius: 22, background: "#f8fafc", color: TEXT_MUTED }}>No spoken words yet.</div>
                ) : (
                  <div style={{ marginTop: 18, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16 }}>
                    {wordPages.slice(0, 2).map((page, pageIndex) => (
                      <div
                        key={`word-page-${pageIndex}`}
                        style={{
                          minHeight: 300,
                          borderRadius: 26,
                          padding: 22,
                          background: pageIndex % 2 === 0 ? "#fffdf7" : "#fffaf0",
                          border: "1px solid #f1dfb8",
                          boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.8), 0 14px 30px rgba(122, 92, 38, 0.08)",
                          position: "relative"
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", color: "#9a6b1d", fontWeight: 900, marginBottom: 16 }}>
                          <span>Page {pageIndex + 1}</span>
                          <span>📖</span>
                        </div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                          {page.map((item) => (
                            <div key={item.id} title={formatDateTime(item.createdAt)} style={{ padding: "10px 13px", borderRadius: 999, background: "#ffffff", border: "1px solid #f1dfb8", fontWeight: 900, color: TEXT, boxShadow: "0 6px 14px rgba(122, 92, 38, 0.06)" }}>
                              {item.word ?? "unknown"}
                            </div>
                          ))}
                        </div>
                        <div style={{ position: "absolute", bottom: 16, right: 20, color: "#b08a48", fontSize: 12, fontWeight: 800 }}>Latest words first</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ display: "grid", gap: 16 }}>
                <div style={card}>
                  <div style={{ color: BRAND_DARK, fontWeight: 900, marginBottom: 6 }}>Emotion Check-in</div>
                  <h2 style={{ margin: 0, fontSize: 28 }}>Feelings</h2>
                  <p style={{ margin: "8px 0 14px", color: TEXT_MUTED }}>The selected feeling is highlighted with a friendly face icon.</p>
                  {data.deepDive.emotions.length === 0 ? (
                    <p>No emotion signals yet.</p>
                  ) : (
                    <div style={{ display: "grid", gap: 10 }}>
                      {data.deepDive.emotions.slice(0, 8).map((item, index) => {
                        const meta = getEmotionMeta(item.emotion);
                        const selected = index === 0 || item.emotion === latestEmotion;
                        return (
                          <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: 12, borderRadius: 20, background: selected ? meta.bg : "#f8fafc", border: selected ? `2px solid ${meta.border}` : `1px solid ${BORDER}` }}>
                            <div style={{ width: 44, height: 44, borderRadius: 16, display: "grid", placeItems: "center", background: "#fff", fontSize: 26 }}>{meta.icon}</div>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontWeight: 900, color: selected ? meta.color : TEXT }}>{meta.label}</div>
                              <div style={{ color: TEXT_MUTED, fontSize: 13 }}>{formatDateTime(item.createdAt)}</div>
                            </div>
                            {selected ? <div style={{ color: meta.color, fontWeight: 900, fontSize: 12 }}>Selected</div> : null}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div style={card}>
                  <div style={{ color: BRAND_DARK, fontWeight: 900, marginBottom: 6 }}>Creative Play</div>
                  <h2 style={{ margin: 0, fontSize: 28 }}>Saved Artwork</h2>
                  {data.deepDive.savedArtwork.length === 0 ? (
                    <p style={{ color: TEXT_MUTED }}>No saved artwork yet.</p>
                  ) : (
                    <div style={{ display: "grid", gap: 12, marginTop: 14 }}>
                      {data.deepDive.savedArtwork.slice(0, 6).map((art) => (
                        <div key={art.id} style={{ padding: 14, borderRadius: 18, background: SOFT_PURPLE, border: `1px solid ${BORDER}` }}>
                          <strong>{art.title ?? art.page ?? "Saved artwork"}</strong>
                          <div style={{ color: TEXT_MUTED, fontSize: 13, marginTop: 4 }}>Saved {formatDateTime(art.createdAt)}</div>
                          {art.imageUrl ? <div style={{ color: TEXT_MUTED, fontSize: 13, marginTop: 4 }}>Image saved</div> : null}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div style={card}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
                <div>
                  <div style={{ color: BRAND_DARK, fontWeight: 900, marginBottom: 6 }}>Timeline</div>
                  <h2 style={{ margin: 0, fontSize: 30 }}>Recent Activity</h2>
                  <p style={{ margin: "8px 0 0", color: TEXT_MUTED }}>A simplified activity stream for parents. Raw data is hidden so it does not feel like a developer console.</p>
                </div>
                <span style={{ color: TEXT_MUTED, fontSize: 13 }}>{data.recentActivity.length} recent events</span>
              </div>

              {data.recentActivity.length === 0 ? (
                <p>No activity for this child yet.</p>
              ) : (
                <div style={{ display: "grid", gap: 12, marginTop: 18 }}>
                  {data.recentActivity.slice(0, 12).map((event) => (
                    <div key={event.id} style={{ display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 14, alignItems: "center", padding: 14, borderRadius: 20, background: eventTone(event.eventType), border: `1px solid ${BORDER}` }}>
                      <div style={{ width: 46, height: 46, borderRadius: 16, background: "#fff", display: "grid", placeItems: "center", fontSize: 24 }}>{eventIcon(event.eventType)}</div>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 900, color: BRAND_DARK, textTransform: "uppercase", letterSpacing: 0.4 }}>{humanizeLabel(event.eventType)}</div>
                        <div style={{ marginTop: 4, fontWeight: 800, color: TEXT }}>{summarizeEvent(event.eventType, event.payload, child.name)}</div>
                      </div>
                      <span style={{ color: TEXT_MUTED, fontSize: 13, whiteSpace: "nowrap" }}>{formatDateTime(event.createdAt ?? event.occurredAt)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
