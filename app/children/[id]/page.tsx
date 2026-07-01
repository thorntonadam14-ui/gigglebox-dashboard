"use client";

import { useEffect, useMemo, useState } from "react";

type ParentInsights = {
  notes: string[];
  transcript: Array<{
    id: string;
    speaker: string;
    text: string;
    eventType: string;
    createdAt: string | null;
  }>;
  deepDive: {
    topicSummary: Array<{ label: string; count: number }>;
    emotionSummary: Array<{ label: string; count: number }>;
    wellbeingSignals: Array<{ id: string; text: string; topic: string | null; emotion: string | null; createdAt: string | null }>;
    unknownQuestions: Array<{ id: string; question: string; topic: string | null; createdAt: string | null }>;
    aiNeededCount: number;
    conversationDurationMinutes: number;
  };
  coaching: string[];
  highlights: Array<{ id: string; kind: string; title: string; detail: string; createdAt: string | null }>;
  chapters: Array<{ id: string; title: string; startAt: string | null; endAt: string | null; count: number; summary: string }>;
};

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
  parentInsights?: ParentInsights;
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

const emotionEmoji: Record<string, string> = {
  happy: "😊",
  laughing: "😄",
  neutral: "😐",
  concerned: "😟",
  sad: "😔",
  curious: "🤔",
  worried: "😟",
  angry: "😠",
  scared: "😧",
  tired: "😴"
};

const insightTabs = [
  { id: "notes", label: "Notes" },
  { id: "transcript", label: "Transcript" },
  { id: "deep-dive", label: "Deep Dive" },
  { id: "coaching", label: "Coaching" },
  { id: "highlights", label: "Highlights" },
  { id: "timeline", label: "Timeline" }
] as const;

type InsightTab = typeof insightTabs[number]["id"];

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

function formatTime(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit" }).format(date);
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

function summarizeEvent(eventType: string, payload: Record<string, unknown>, childName: string) {
  const safeName = childName || "This child";
  const word = typeof payload.word === "string" ? payload.word : null;
  const emotion = typeof payload.emotion === "string" ? payload.emotion : null;
  const topic = typeof payload.topic === "string" ? payload.topic : null;
  const insight = typeof payload.insight === "string" ? payload.insight : null;
  const choiceValue = typeof payload.value === "string" ? payload.value : null;
  const choiceLabel = typeof payload.choice_label === "string" ? payload.choice_label : null;
  const saveTitle = typeof payload.title === "string" ? payload.title : null;

  switch (eventType) {
    case "word_spoken":
      return word ? `${safeName} said “${word}”.` : `${safeName} practised speaking.`;
    case "emotion_state":
      return emotion ? `${safeName} checked in as ${humanizeLabel(emotion)}.` : `${safeName} shared an emotion.`;
    case "askme_parent_insight":
    case "askme_conversation_signal":
      return insight || `${safeName} shared a Parent Insights signal${topic ? ` about ${humanizeLabel(topic).toLowerCase()}` : ""}.`;
    case "askme_unknown_question":
      return word ? `${safeName} asked a question Bop could not answer yet: “${word}”.` : `${safeName} asked a question Bop could not answer yet.`;
    case "coloring_saved":
      return `${safeName} saved ${saveTitle || "a colouring page"}.`;
    case "MONSTERCHEF_START":
      return `${safeName} started Monster Chef.`;
    case "MONSTERCHEF_CHOICE":
      return `${safeName} picked ${choiceLabel || choiceValue || "an option"} in Monster Chef.`;
    case "SPEAKTO_STORYBOOK_PAGE":
      return `${safeName} opened a storybook page.`;
    case "SPEAKTO_STORYBOOK_CHOICE":
      return `${safeName} made a story choice.`;
    default:
      return `${safeName} had a ${humanizeLabel(eventType).toLowerCase()} moment.`;
  }
}

function getArtworkImageUrl(art: Overview["deepDive"]["savedArtwork"][number]) {
  if (art.imageUrl) return art.imageUrl;
  const possibleKeys = ["image_url", "imageURL", "url", "downloadUrl", "thumbnailUrl", "previewUrl", "dataUrl", "pngUrl"];
  for (const key of possibleKeys) {
    const value = art.payload?.[key];
    if (typeof value === "string" && value.length > 0) return value;
  }
  return null;
}

function categoryFor(eventType: string) {
  if (eventType.includes("parent_insight") || eventType.includes("conversation_signal")) return { label: "Insight", icon: "💡", className: "gb-report-purple" };
  if (eventType.includes("unknown") || eventType.includes("ai_needed")) return { label: "Learning Gap", icon: "❓", className: "gb-report-orange" };
  if (eventType.includes("word")) return { label: "Speaking", icon: "💬", className: "gb-report-blue" };
  if (eventType.includes("emotion")) return { label: "Emotion", icon: "😊", className: "gb-report-green" };
  if (eventType.includes("coloring")) return { label: "Creativity", icon: "🎨", className: "gb-report-pink" };
  if (eventType.includes("STORYBOOK")) return { label: "Story", icon: "📖", className: "gb-report-purple" };
  if (eventType.includes("MONSTERCHEF")) return { label: "Game", icon: "🎮", className: "gb-report-orange" };
  return { label: "Activity", icon: "✨", className: "gb-report-soft" };
}

function defaultParentInsights(childName: string): ParentInsights {
  return {
    notes: [`${childName} has activity in the report. Parent Insights will become richer as Ask Me sends more conversation signals.`],
    transcript: [],
    deepDive: {
      topicSummary: [],
      emotionSummary: [],
      wellbeingSignals: [],
      unknownQuestions: [],
      aiNeededCount: 0,
      conversationDurationMinutes: 0
    },
    coaching: ["Use the recent activity and transcript as a gentle conversation starter."],
    highlights: [],
    chapters: []
  };
}

export default function ChildDetailPage({ params }: { params: { id: string } }) {
  const [data, setData] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activityFilter, setActivityFilter] = useState("all");
  const [activeInsightTab, setActiveInsightTab] = useState<InsightTab>("notes");

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/dashboard/overview?childId=${params.id}`, { cache: "no-store" });
      const json = await response.json();
      if (!response.ok || !json.ok) throw new Error(json.error || "Failed to load child detail.");
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [params.id]);

  const child = data?.children?.[0] ?? null;
  const filteredWords = useMemo(() => (data?.deepDive.words ?? []).filter((item) => !isSystemWord(item.word)), [data]);
  const lastSeen = child?.lastActivityAt ?? data?.summary?.lastActivityAt ?? null;
  const deviceOnline = Boolean(lastSeen && Date.now() - new Date(lastSeen).getTime() < 1000 * 60 * 10);
  const latestEmotion = child?.latestEmotion ?? data?.summary.latestEmotion ?? null;
  const latestMood = humanizeLabel(latestEmotion);
  const moodEmoji = emotionEmoji[(latestEmotion ?? "").toLowerCase()] ?? "😊";
  const recentEmotionList = (data?.deepDive.emotions ?? []).slice(0, 7).reverse();
  const uniqueWords = Array.from(new Set(filteredWords.map((item) => item.word).filter(Boolean) as string[])).slice(0, 8);
  const filteredRecentActivity = useMemo(() => {
    const items = data?.recentActivity ?? [];
    if (activityFilter === "all") return items;
    return items.filter((event) => categoryFor(event.eventType).label.toLowerCase().replace(/\s+/g, "-") === activityFilter);
  }, [data, activityFilter]);
  const parentInsights = data?.parentInsights ?? defaultParentInsights(child?.name ?? "This child");

  return (
    <div className="gb-page">
      <header className="gb-nav">
        <div className="gb-container gb-nav-inner">
          <a className="gb-brand" href="/children">
            <img className="gb-logo" src="/gigglebox-logo.png" alt="GiggleBox" />
            <span><span className="gb-brand-kicker">Parent Insights</span><span className="gb-brand-title">{child?.name ?? "Child"}</span></span>
          </a>
          <nav className="gb-nav-links">
            <a className="gb-nav-link" href="/">Home</a>
            <a className="gb-nav-link" href="/children">Children</a>
            <a className="gb-button" href="/setup">Setup</a>
          </nav>
          <a className="gb-studio-mark" href="/" aria-label="Giggle Byte Studios">
            <img src="/gigglebyte-studios-logo.png" alt="Giggle Byte Studios" />
          </a>
        </div>
      </header>

      <main className="gb-main">
        <div className="gb-container gb-grid">
          {loading ? <div className="gb-card">Loading Parent Insights…</div> : null}
          {error ? <div className="gb-alert">{error}</div> : null}

          {data && child ? (
            <>
              <section className="gb-report-hero gb-parent-insights-hero">
                <div>
                  <div className="gb-eyebrow">Parent Insights</div>
                  <h1>{child.name}&apos;s Conversation Report</h1>
                  <p>Parent-friendly notes, transcript, topics, coaching and highlights from GiggleBox Ask Me conversations and play activity.</p>
                  <div className="gb-actions">
                    <a className="gb-button-secondary" href="/children">Back to Children</a>
                    <button className="gb-button" onClick={load}>Refresh Insights</button>
                  </div>
                </div>
                <div className="gb-mood-card">
                  <span>Current mood</span>
                  <strong>{latestMood}</strong>
                  <div className="gb-mood-emoji">{moodEmoji}</div>
                  <small>Checked {formatRelative(lastSeen)} · {formatDateTime(lastSeen)}</small>
                </div>
              </section>

              <section className="gb-report-stats">
                <div className="gb-report-stat"><span>Age</span><strong>{child.age ?? "—"}</strong></div>
                <div className="gb-report-stat"><span>Play moments</span><strong>{child.totalEvents}</strong></div>
                <div className="gb-report-stat"><span>Topics found</span><strong>{parentInsights.deepDive.topicSummary.length}</strong></div>
                <div className="gb-report-stat"><span>Wellbeing signals</span><strong>{parentInsights.deepDive.wellbeingSignals.length}</strong><small>Gentle check-in prompts</small></div>
                <div className="gb-report-stat"><span>Device</span><strong>{deviceOnline ? "Online" : "Offline"}</strong><small>{child.linkedDevice?.device_name ?? "Not linked"}</small></div>
              </section>

              <section className="gb-card gb-parent-insights-card">
                <div className="gb-insight-tabs" role="tablist" aria-label="Parent Insights sections">
                  {insightTabs.map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      role="tab"
                      aria-selected={activeInsightTab === tab.id}
                      className={activeInsightTab === tab.id ? "gb-insight-tab gb-insight-tab-active" : "gb-insight-tab"}
                      onClick={() => setActiveInsightTab(tab.id)}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                <div className="gb-insight-panel">
                  {activeInsightTab === "notes" ? (
                    <div className="gb-notes-list">
                      {parentInsights.notes.map((note, index) => <p key={index}>{note}</p>)}
                    </div>
                  ) : null}

                  {activeInsightTab === "transcript" ? (
                    parentInsights.transcript.length === 0 ? <p className="gb-muted">No Ask Me transcript lines have been received yet.</p> : (
                      <div className="gb-transcript-list">
                        {parentInsights.transcript.map((line) => (
                          <div className="gb-transcript-line" key={line.id}>
                            <span>{formatTime(line.createdAt)}</span>
                            <strong>{line.speaker}</strong>
                            <p>{line.text}</p>
                          </div>
                        ))}
                      </div>
                    )
                  ) : null}

                  {activeInsightTab === "deep-dive" ? (
                    <div className="gb-deep-dive-grid">
                      <div className="gb-insight-subcard">
                        <h3>Topics mentioned</h3>
                        {parentInsights.deepDive.topicSummary.length === 0 ? <p className="gb-muted">No topic signals yet.</p> : <div className="gb-chip-list">{parentInsights.deepDive.topicSummary.map((item) => <span key={item.label}>{humanizeLabel(item.label)} <b>{item.count}</b></span>)}</div>}
                      </div>
                      <div className="gb-insight-subcard">
                        <h3>Emotion signals</h3>
                        {parentInsights.deepDive.emotionSummary.length === 0 ? <p className="gb-muted">No emotion signals yet.</p> : <div className="gb-chip-list">{parentInsights.deepDive.emotionSummary.map((item) => <span key={item.label}>{emotionEmoji[item.label] ?? "😊"} {humanizeLabel(item.label)} <b>{item.count}</b></span>)}</div>}
                      </div>
                      <div className="gb-insight-subcard gb-insight-wide">
                        <h3>Questions Bop could not answer yet</h3>
                        {parentInsights.deepDive.unknownQuestions.length === 0 ? <p className="gb-muted">No unknown questions logged yet.</p> : parentInsights.deepDive.unknownQuestions.slice(0, 8).map((item) => <p key={item.id}><span className="gb-time-pill">{formatTime(item.createdAt)}</span> {item.question}</p>)}
                      </div>
                      <div className="gb-insight-subcard gb-insight-wide">
                        <h3>Wellbeing signals</h3>
                        {parentInsights.deepDive.wellbeingSignals.length === 0 ? <p className="gb-muted">No wellbeing signals logged yet.</p> : parentInsights.deepDive.wellbeingSignals.slice(0, 8).map((item) => <p key={item.id}><span className="gb-time-pill">{formatTime(item.createdAt)}</span> {item.text}</p>)}
                      </div>
                    </div>
                  ) : null}

                  {activeInsightTab === "coaching" ? (
                    <div className="gb-coaching-list">
                      {parentInsights.coaching.map((item, index) => <div className="gb-coaching-item" key={index}><span>💜</span><p>{item}</p></div>)}
                    </div>
                  ) : null}

                  {activeInsightTab === "highlights" ? (
                    parentInsights.highlights.length === 0 ? <p className="gb-muted">No highlights yet. They will appear as Ask Me logs topics, emotions and wellbeing moments.</p> : (
                      <div className="gb-highlight-list">
                        {parentInsights.highlights.map((item) => (
                          <div className="gb-highlight-item" key={item.id}>
                            <span className="gb-time-pill">{formatTime(item.createdAt)}</span>
                            <strong>{item.title}</strong>
                            <p>{item.detail}</p>
                          </div>
                        ))}
                      </div>
                    )
                  ) : null}

                  {activeInsightTab === "timeline" ? (
                    parentInsights.chapters.length === 0 ? <p className="gb-muted">No timeline chapters yet.</p> : (
                      <div className="gb-chapter-list">
                        {parentInsights.chapters.map((chapter) => (
                          <div className="gb-chapter-item" key={chapter.id}>
                            <span className="gb-time-pill">{formatTime(chapter.startAt)}{chapter.endAt && chapter.endAt !== chapter.startAt ? ` – ${formatTime(chapter.endAt)}` : ""}</span>
                            <strong>{chapter.title}</strong>
                            <p>{chapter.summary}</p>
                          </div>
                        ))}
                      </div>
                    )
                  ) : null}
                </div>
              </section>

              <section className="gb-report-layout">
                <div className="gb-card gb-report-card-large">
                  <div className="gb-report-card-head">
                    <div><span className="gb-pill">Mood trend</span><h2>Emotions over recent play</h2></div>
                    <span className={deviceOnline ? "gb-status-online" : "gb-status-offline"}>{deviceOnline ? "Live" : "Offline"}</span>
                  </div>
                  {recentEmotionList.length === 0 ? (
                    <p className="gb-muted">No emotion check-ins yet.</p>
                  ) : (
                    <div className="gb-mood-trend">
                      {recentEmotionList.map((item, index) => {
                        const key = (item.emotion ?? "").toLowerCase();
                        return <div key={item.id} className="gb-mood-point" style={{ transform: `translateY(${index % 3 === 0 ? 12 : index % 3 === 1 ? -8 : 2}px)` }}><span>{emotionEmoji[key] ?? "😊"}</span><small>{formatDateTime(item.createdAt)}</small></div>;
                      })}
                    </div>
                  )}
                </div>

                <div className="gb-card gb-report-card-large">
                  <div className="gb-report-card-head"><div><span className="gb-pill">Words spoken</span><h2>Language practice</h2></div></div>
                  {uniqueWords.length === 0 ? <p className="gb-muted">No spoken words yet.</p> : <div className="gb-word-cloud">{uniqueWords.map((word) => <span key={word}>{word}</span>)}</div>}
                </div>
              </section>

              <section className="gb-report-layout">
                <div className="gb-card">
                  <div className="gb-report-card-head gb-report-card-head-select">
                    <div><span className="gb-pill">Recent activity</span><h2>What happened lately</h2></div>
                    <div className="gb-report-filter">
                      <small>{filteredRecentActivity.length} shown</small>
                      <select className="gb-select" value={activityFilter} onChange={(event) => setActivityFilter(event.target.value)} aria-label="Filter recent activity">
                        <option value="all">All activity</option>
                        <option value="speaking">Speaking</option>
                        <option value="emotion">Emotions</option>
                        <option value="insight">Insights</option>
                        <option value="learning-gap">Learning gaps</option>
                        <option value="creativity">Creative work</option>
                        <option value="story">Stories</option>
                        <option value="game">Games</option>
                      </select>
                    </div>
                  </div>
                  {filteredRecentActivity.length === 0 ? <p className="gb-muted">No activity matches this filter yet.</p> : (
                    <div className="gb-timeline">
                      {filteredRecentActivity.slice(0, 10).map((event) => {
                        const category = categoryFor(event.eventType);
                        return (
                          <div className="gb-timeline-item" key={event.id}>
                            <div className={`gb-timeline-icon ${category.className}`}>{category.icon}</div>
                            <div>
                              <div className="gb-timeline-top"><strong>{category.label}</strong><span>{formatDateTime(event.createdAt ?? event.occurredAt)}</span></div>
                              <p>{summarizeEvent(event.eventType, event.payload, child.name)}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="gb-card">
                  <div className="gb-report-card-head"><div><span className="gb-pill">Creative work</span><h2>Saved artwork</h2></div></div>
                  {data.deepDive.savedArtwork.length === 0 ? <p className="gb-muted">No saved artwork yet.</p> : (
                    <div className="gb-art-list">
                      {data.deepDive.savedArtwork.slice(0, 6).map((art) => {
                        const artworkImage = getArtworkImageUrl(art);
                        return (
                          <div className="gb-art-item" key={art.id}>
                            {artworkImage ? (
                              <a className="gb-art-thumb gb-art-thumb-image" href={artworkImage} target="_blank" rel="noreferrer" aria-label="Open saved artwork">
                                <img src={artworkImage} alt={art.title ?? art.page ?? "Saved artwork"} />
                              </a>
                            ) : (
                              <div className="gb-art-thumb">🎨</div>
                            )}
                            <div>
                              <strong>{art.title ?? art.page ?? "Saved artwork"}</strong>
                              <small>Saved {formatDateTime(art.createdAt)}</small>
                              {artworkImage ? <a className="gb-small-link" href={artworkImage} target="_blank" rel="noreferrer">View image</a> : <small>Image file not stored with this save yet</small>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </section>
            </>
          ) : null}
        </div>
      </main>
    </div>
  );
}
