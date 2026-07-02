import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
}

function getSupabaseAdmin() {
  return createClient(
    getEnv("NEXT_PUBLIC_SUPABASE_URL"),
    getEnv("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}

type TelemetryRow = {
  id: string;
  device_id: string;
  event_type: string;
  payload: Record<string, unknown>;
  occurred_at: string | null;
  created_at: string | null;
};

type RawTelemetryRow = Omit<TelemetryRow, "payload"> & { payload: unknown };

type ChildRow = {
  id: string;
  name: string;
  age: number | null;
  created_at: string | null;
};

type DeviceRow = {
  id: string;
  serial_number: string;
  device_name: string | null;
  created_at: string | null;
};

type LinkRow = {
  id: string;
  child_id: string;
  device_id: string;
  created_at: string | null;
};

type AlertRow = {
  id: string;
  child_id: string | null;
  alert_type: string | null;
  message: string | null;
  created_at: string | null;
};

const topicKeywordMap: Record<string, string[]> = {
  school: ["school", "teacher", "class", "maths", "math", "homework", "lesson", "playtime"],
  family: ["mum", "mom", "dad", "parent", "grandma", "grandad", "brother", "sister", "family"],
  friends: ["friend", "friends", "best friend", "played with"],
  pets: ["dog", "cat", "pet", "hamster", "rabbit", "puppy", "kitten"],
  football: ["football", "soccer", "arsenal", "goal", "scored", "match", "team"],
  dinosaurs: ["dinosaur", "t rex", "trex", "spinosaurus", "triceratops"],
  stories: ["story", "book", "adventure", "dragon", "pirate", "knight"],
  wellbeing: ["sad", "worried", "scared", "hurt", "lonely", "angry", "upset", "poorly", "sick"],
  games: ["game", "play a game", "guessing", "quiz", "round", "turn"],
  jokes: ["joke", "funny", "laugh", "riddle"]
};

const emotionKeywordMap: Record<string, string[]> = {
  happy: ["happy", "good", "great", "excited", "proud", "fun", "laugh", "laughing"],
  sad: ["sad", "down", "unhappy", "upset", "cry", "crying"],
  worried: ["worried", "worry", "nervous", "anxious", "concerned", "concern"],
  angry: ["angry", "cross", "mad", "annoyed", "frustrated"],
  scared: ["scared", "frightened", "afraid"],
  tired: ["tired", "sleepy"]
};

const wellbeingWords = [
  "hurt", "hurts", "fell", "fall", "bumped", "pain", "poorly", "sick", "sad", "down", "worried",
  "scared", "lonely", "upset", "crying", "angry", "bully", "bullied", "unsafe",
  "concerned", "concern", "not okay", "not ok", "not good", "feeling down", "feel down",
  "feel sad", "i am sad", "i'm sad", "i am worried", "i'm worried", "i am scared", "i'm scared"
];

function isEmotionEvent(type: string) {
  return ["emotion_state", "emotion_selected", "emotion_detected"].includes(type);
}

function isColoringEvent(type: string) {
  return ["coloring_saved", "coloring_book_saved", "coloring_save"].includes(type);
}

function coercePayload(payload: unknown): Record<string, unknown> {
  if (!payload) return {};
  if (typeof payload === "object" && !Array.isArray(payload)) {
    return payload as Record<string, unknown>;
  }
  if (typeof payload === "string") {
    const trimmed = payload.trim();
    if (!trimmed) return {};
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
      return { raw: payload };
    } catch {
      return { raw: payload };
    }
  }
  return { raw: String(payload) };
}

function stringValue(payload: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = payload[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

function booleanValue(payload: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = payload[key];
    if (typeof value === "boolean") return value;
    if (typeof value === "string") {
      const normalized = value.trim().toLowerCase();
      if (["true", "yes", "1"].includes(normalized)) return true;
      if (["false", "no", "0"].includes(normalized)) return false;
    }
  }
  return false;
}

function stringList(payload: Record<string, unknown>, keys: string[]) {
  const results: string[] = [];
  for (const key of keys) {
    const value = payload[key];
    if (Array.isArray(value)) {
      for (const item of value) {
        if (typeof item === "string" && item.trim()) results.push(item.trim());
      }
    } else if (typeof value === "string" && value.trim()) {
      results.push(...value.split(/[|,]/).map((item) => item.trim()).filter(Boolean));
    }
  }
  return results;
}

function extractEmotion(payload: Record<string, unknown>) {
  return stringValue(payload, ["emotion", "mood", "detectedEmotion", "currentEmotion"]);
}

function extractWord(payload: Record<string, unknown>) {
  return stringValue(payload, ["word", "text", "utterance", "childText", "message"]);
}

function extractActiveChildId(payload: Record<string, unknown>) {
  return stringValue(payload, ["activeChildId", "childId", "child_id"]);
}

function extractTranscriptText(event: TelemetryRow) {
  return stringValue(event.payload, [
    "transcript", "utterance", "childText", "child_text", "message", "text", "question", "word",
    "response", "responseText", "bopResponse", "bop_response", "reply"
  ]);
}

function extractSpeaker(event: TelemetryRow, childName: string) {
  const explicit = stringValue(event.payload, ["speaker", "role", "source"]);
  if (explicit) {
    const normalized = explicit.toLowerCase();
    if (normalized.includes("bop") || normalized.includes("assistant") || normalized.includes("character")) return "Bop";
    if (normalized.includes("child") || normalized.includes("user")) return childName;
    return explicit;
  }
  if (event.event_type.toLowerCase().includes("response") || event.event_type.toLowerCase().includes("bop")) return "Bop";
  return childName;
}

function labelFromValue(value: string) {
  return value
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function inferTopics(event: TelemetryRow) {
  const explicit = [
    ...stringList(event.payload, ["topics", "topic_list", "conversationTopics"]),
    ...[stringValue(event.payload, ["topic", "currentTopic", "topicMentioned", "category"])].filter(Boolean) as string[]
  ];
  const text = `${extractTranscriptText(event) ?? ""} ${event.event_type}`.toLowerCase();
  const inferred = Object.entries(topicKeywordMap)
    .filter(([, keywords]) => keywords.some((keyword) => text.includes(keyword)))
    .map(([topic]) => topic);
  return Array.from(new Set([...explicit, ...inferred].map((topic) => topic.toLowerCase())));
}

function inferEmotion(event: TelemetryRow) {
  const explicit = extractEmotion(event.payload);
  if (explicit) return explicit.toLowerCase();
  const text = `${extractTranscriptText(event) ?? ""} ${event.event_type}`.toLowerCase();
  const match = Object.entries(emotionKeywordMap).find(([, keywords]) => keywords.some((keyword) => text.includes(keyword)));
  return match?.[0] ?? null;
}

function hasWellbeingConcern(event: TelemetryRow) {
  if (booleanValue(event.payload, ["wellbeing", "wellbeingFlag", "wellbeingConcern", "safetyTriggered", "safety", "sensitive"])) return true;
  const safetyLevel = stringValue(event.payload, ["safetyLevel", "conversationSafetyLevel"]);
  if (safetyLevel && safetyLevel.toLowerCase() !== "safe") return true;

  const emotion = inferEmotion(event);
  if (emotion && ["sad", "worried", "angry", "scared"].includes(emotion.toLowerCase())) return true;

  const rawEmotion = extractEmotion(event.payload);
  if (rawEmotion && ["sad", "worried", "concerned", "upset", "crying", "scared", "angry"].includes(rawEmotion.toLowerCase())) return true;

  const text = `${extractTranscriptText(event) ?? ""} ${stringValue(event.payload, ["insight", "summary", "message", "reason"]) ?? ""} ${event.event_type}`.toLowerCase();
  return wellbeingWords.some((word) => text.includes(word));
}

function isUnknownQuestion(event: TelemetryRow) {
  if (booleanValue(event.payload, ["unknownQuestion", "unknown", "noAnswer", "fallbackUsed", "aiNeeded", "ai_needed", "needsAi"])) return true;
  return event.event_type.toLowerCase().includes("unknown") || event.event_type.toLowerCase().includes("fallback");
}

function isAiNeeded(event: TelemetryRow) {
  if (booleanValue(event.payload, ["aiNeeded", "ai_needed", "aiFallbackNeeded", "needsAi"])) return true;
  const type = event.event_type.toLowerCase();
  return type.includes("ai_needed") || type.includes("ai_fallback") || type.includes("gigglebrain_ai_needed");
}


function getGameName(event: TelemetryRow) {
  const explicit = stringValue(event.payload, ["gameName", "game_name", "game", "gameKey", "game_key", "activity", "source"]);
  if (explicit) return labelFromValue(explicit);
  const type = event.event_type.toLowerCase();
  if (type.includes("monsterchef") || type.includes("monster_chef")) return "Monster Chef";
  if (type.includes("tictactoe") || type.includes("tic_tac_toe")) return "Tic Tac Toe";
  if (type.includes("storybook") || type.includes("story")) return "Story Spinners";
  if (type.includes("coloring") || type.includes("colouring")) return "Colouring";
  if (type.includes("askme") || type.includes("ask_me") || type.includes("conversation")) return "Ask Me";
  if (type.includes("game")) return labelFromValue(event.event_type);
  return null;
}

function isGameLikeEvent(event: TelemetryRow) {
  return Boolean(getGameName(event));
}

function buildGameActivity(events: TelemetryRow[]) {
  const games = new Map<string, { name: string; playCount: number; lastPlayedAt: string | null; words: Set<string>; eventTypes: Set<string> }>();

  for (const event of events) {
    const gameName = getGameName(event);
    const word = extractWord(event.payload);
    const explicitGameForWord = stringValue(event.payload, ["gameName", "game_name", "game", "gameKey", "game_key", "activity", "source"]);

    if (!gameName && !(event.event_type === "word_spoken" && explicitGameForWord)) continue;

    const name = gameName ?? labelFromValue(explicitGameForWord ?? "Ask Me");
    const current = games.get(name) ?? {
      name,
      playCount: 0,
      lastPlayedAt: null,
      words: new Set<string>(),
      eventTypes: new Set<string>()
    };

    if (isGameLikeEvent(event)) {
      current.playCount += 1;
      current.eventTypes.add(event.event_type);
    }

    if (word && !["ble_test", "hello"].includes(word.toLowerCase())) {
      current.words.add(word);
    }

    const eventTime = event.created_at ?? event.occurred_at;
    if (!current.lastPlayedAt || getTimestamp(eventTime) > getTimestamp(current.lastPlayedAt)) {
      current.lastPlayedAt = eventTime;
    }

    games.set(name, current);
  }

  return Array.from(games.values())
    .map((game) => ({
      name: game.name,
      playCount: game.playCount,
      lastPlayedAt: game.lastPlayedAt,
      words: Array.from(game.words).slice(0, 10),
      eventTypes: Array.from(game.eventTypes).slice(0, 8)
    }))
    .sort((a, b) => getTimestamp(b.lastPlayedAt) - getTimestamp(a.lastPlayedAt))
    .slice(0, 8);
}

function getTimestamp(value: string | null) {
  if (!value) return 0;
  const ms = Date.parse(value);
  return Number.isNaN(ms) ? 0 : ms;
}

function sortNewestFirst<T extends { created_at?: string | null; createdAt?: string | null; occurred_at?: string | null; occurredAt?: string | null }>(rows: T[]) {
  return [...rows].sort((a, b) => {
    const aTime = getTimestamp(a.created_at ?? a.createdAt ?? a.occurred_at ?? a.occurredAt ?? null);
    const bTime = getTimestamp(b.created_at ?? b.createdAt ?? b.occurred_at ?? b.occurredAt ?? null);
    return bTime - aTime;
  });
}

function increment(map: Record<string, number>, key: string | null | undefined) {
  if (!key) return;
  map[key] = (map[key] ?? 0) + 1;
}

function topEntries(map: Record<string, number>, limit = 8) {
  return Object.entries(map)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([label, count]) => ({ label, count }));
}


function scoreLabel(score: number) {
  if (score >= 4) return "Very strong";
  if (score >= 3) return "Growing";
  if (score >= 2) return "Emerging";
  return "Building up";
}

function buildParentIntelligence(params: {
  childName: string;
  events: TelemetryRow[];
  topTopics: Array<{ label: string; count: number }>;
  topEmotions: Array<{ label: string; count: number }>;
  wellbeingSignals: Array<{ id: string; text: string; topic: string | null; emotion: string | null; createdAt: string | null }>;
  unknownQuestions: Array<{ id: string; question: string; topic: string | null; createdAt: string | null }>;
  transcript: Array<{ id: string; speaker: string; text: string; eventType: string; createdAt: string | null }>;
}) {
  const { childName, events, topTopics, topEmotions, wellbeingSignals, unknownQuestions, transcript } = params;
  const topicNames = topTopics.slice(0, 4).map((item) => labelFromValue(item.label).toLowerCase());
  const topicText = topicNames.length ? topicNames.join(", ") : "play, conversation and discovery";
  const strongestEmotion = topEmotions[0]?.label ? labelFromValue(topEmotions[0].label).toLowerCase() : "settled";
  const questionText = transcript.map((line) => line.text).join(" ").toLowerCase();
  const whyHowCount = (questionText.match(/(why|how|what|where|when|who)/g) ?? []).length;
  const childLines = transcript.filter((line) => line.speaker !== "Bop").length;
  const bopLines = transcript.filter((line) => line.speaker === "Bop").length;
  const curiosityScore = Math.min(5, Math.max(1, Math.round((whyHowCount + unknownQuestions.length + topTopics.length) / 2)));
  const communicationScore = Math.min(5, Math.max(1, Math.round((childLines + topTopics.length) / 4)));
  const confidenceScore = Math.min(5, Math.max(1, wellbeingSignals.length ? 2 : Math.round((childLines + topEmotions.length + events.length / 10) / 3)));

  const todaysStory = `${childName} spent time with GiggleBox exploring ${topicText}. The strongest mood signal was ${strongestEmotion}. ${unknownQuestions.length ? `${childName} asked ${unknownQuestions.length} question${unknownQuestions.length === 1 ? "" : "s"} that could be helped by GiggleBrain AI.` : "Bop was able to support the latest activity with the current offline system."}${wellbeingSignals.length ? " There was a gentle wellbeing signal worth checking in on." : ""}`;

  const parentIdeas: string[] = [];
  if (topTopics.some((item) => item.label === "dinosaurs")) parentIdeas.push("Ask which dinosaur was most interesting today, then look up a picture or book together.");
  if (topTopics.some((item) => item.label === "football")) parentIdeas.push("Use football as a positive conversation starter: “What was your favourite moment playing today?”");
  if (topTopics.some((item) => item.label === "school")) parentIdeas.push("Try a gentle school check-in: “What was the best part of school today?”");
  if (topTopics.some((item) => item.label === "stories")) parentIdeas.push("Continue the story thread at bedtime by asking what should happen next.");
  if (unknownQuestions.length) parentIdeas.push("Pick one unknown question and explore it together. These are useful moments for the GiggleBrain AI knowledge layer.");
  if (wellbeingSignals.length) parentIdeas.push("Offer a calm check-in and remind them they can always talk to a trusted grown-up.");
  if (!parentIdeas.length) parentIdeas.push("Ask one open question about today and let the child lead the conversation.");

  const weekSignals = [
    topicNames.length ? `Most visible interest: ${labelFromValue(topTopics[0].label)}.` : "Interests are still building up.",
    `${childName} showed ${scoreLabel(curiosityScore).toLowerCase()} curiosity in this report.`,
    `${childName} used ${childLines || events.length} child-led moment${(childLines || events.length) === 1 ? "" : "s"}.`
  ];

  if (wellbeingSignals.length) weekSignals.push("A wellbeing mention appeared; treat it as a gentle check-in prompt, not an alarm.");

  const nextBestQuestions = [
    topTopics[0] ? `What made ${labelFromValue(topTopics[0].label).toLowerCase()} interesting today?` : "What was your favourite thing you did with Bop today?",
    unknownQuestions[0]?.question ? `Do you still want to know about: “${unknownQuestions[0].question}”?` : "Is there anything you want Bop to learn about next?",
    "What should Bop remember for next time?"
  ];

  return {
    todaysStory,
    parentHeadline: `${childName} was mainly exploring ${topicText}.`,
    childProfile: `Current session profile: ${scoreLabel(curiosityScore).toLowerCase()} curiosity, ${scoreLabel(communicationScore).toLowerCase()} communication and ${scoreLabel(confidenceScore).toLowerCase()} confidence signals.`,
    curiosityLevel: {
      label: scoreLabel(curiosityScore),
      detail: whyHowCount || unknownQuestions.length ? `${childName} asked curiosity-style questions and showed interest in learning more.` : "Curiosity signals will become clearer as more questions are asked.",
      score: curiosityScore
    },
    communicationLevel: {
      label: scoreLabel(communicationScore),
      detail: childLines ? `${childName} contributed ${childLines} transcript line${childLines === 1 ? "" : "s"}.` : "More Ask Me transcript lines will help build a clearer picture.",
      score: communicationScore
    },
    confidenceLevel: {
      label: scoreLabel(confidenceScore),
      detail: wellbeingSignals.length ? "There was a wellbeing signal, so the focus is gentle reassurance rather than confidence scoring." : "Confidence is estimated from engagement, emotion signals and topic movement.",
      score: confidenceScore
    },
    learningStyle: unknownQuestions.length ? "Curious explorer: asks questions that can grow into learning moments." : "Play-led explorer: uses games, stories and conversation to build confidence.",
    parentIdeas: parentIdeas.slice(0, 5),
    weekSignals: weekSignals.slice(0, 5),
    nextBestQuestions: nextBestQuestions.slice(0, 4),
    demoSummary: `Parent Intelligence turns GiggleBrain signals into a parent-friendly story: topics, mood, curiosity, unknown questions and gentle next steps.`
  };
}

function buildParentInsights(events: TelemetryRow[], childName: string) {
  const topicCounts: Record<string, number> = {};
  const emotionCounts: Record<string, number> = {};
  const wellbeingSignals: Array<{ id: string; text: string; topic: string | null; emotion: string | null; createdAt: string | null }> = [];
  const unknownQuestions: Array<{ id: string; question: string; topic: string | null; createdAt: string | null }> = [];
  const aiNeeded: Array<{ id: string; question: string | null; createdAt: string | null }> = [];
  const highlights: Array<{ id: string; kind: string; title: string; detail: string; createdAt: string | null }> = [];

  const transcript = events
    .map((event) => {
      const text = extractTranscriptText(event);
      if (!text) return null;
      return {
        id: event.id,
        speaker: extractSpeaker(event, childName),
        text,
        eventType: event.event_type,
        createdAt: event.created_at ?? event.occurred_at
      };
    })
    .filter(Boolean) as Array<{ id: string; speaker: string; text: string; eventType: string; createdAt: string | null }>;

  for (const event of events) {
    const topics = inferTopics(event);
    const emotion = inferEmotion(event);
    for (const topic of topics) increment(topicCounts, topic);
    increment(emotionCounts, emotion);

    if (hasWellbeingConcern(event)) {
      const text = extractTranscriptText(event) ?? stringValue(event.payload, ["insight", "summary", "message"]) ?? "Wellbeing signal detected.";
      const signal = {
        id: event.id,
        text,
        topic: topics[0] ?? null,
        emotion,
        createdAt: event.created_at ?? event.occurred_at
      };
      wellbeingSignals.push(signal);
      highlights.push({
        id: `${event.id}-wellbeing`,
        kind: "Wellbeing",
        title: "Wellbeing moment",
        detail: text,
        createdAt: signal.createdAt
      });
    }

    if (isUnknownQuestion(event)) {
      const question = extractTranscriptText(event) ?? "Unknown question asked.";
      unknownQuestions.push({ id: event.id, question, topic: topics[0] ?? null, createdAt: event.created_at ?? event.occurred_at });
    }

    if (isAiNeeded(event)) {
      aiNeeded.push({ id: event.id, question: extractTranscriptText(event), createdAt: event.created_at ?? event.occurred_at });
    }
  }

  const topTopics = topEntries(topicCounts);
  const topEmotions = topEntries(emotionCounts);
  const firstEmotion = [...events].reverse().map(inferEmotion).find(Boolean) ?? null;
  const latestEmotion = events.map(inferEmotion).find(Boolean) ?? null;

  if (topTopics[0]) {
    highlights.push({
      id: "top-topic",
      kind: "Topic",
      title: `${labelFromValue(topTopics[0].label)} came up most`,
      detail: `${childName} mentioned ${labelFromValue(topTopics[0].label).toLowerCase()} ${topTopics[0].count} time${topTopics[0].count === 1 ? "" : "s"}.`,
      createdAt: events[0]?.created_at ?? events[0]?.occurred_at ?? null
    });
  }

  if (firstEmotion && latestEmotion && firstEmotion !== latestEmotion) {
    highlights.push({
      id: "emotion-shift",
      kind: "Emotion",
      title: "Mood changed during the session",
      detail: `${childName} moved from ${labelFromValue(firstEmotion).toLowerCase()} to ${labelFromValue(latestEmotion).toLowerCase()}.`,
      createdAt: events[0]?.created_at ?? events[0]?.occurred_at ?? null
    });
  }

  const notes: string[] = [];
  if (topTopics.length || topEmotions.length) {
    const topicText = topTopics.slice(0, 3).map((item) => labelFromValue(item.label).toLowerCase()).join(", ");
    const emotionText = topEmotions.slice(0, 2).map((item) => labelFromValue(item.label).toLowerCase()).join(" and ");
    notes.push(`${childName} had ${events.length} recent GiggleBox moments${topicText ? `, with conversation signals around ${topicText}` : ""}${emotionText ? ` and signs of feeling ${emotionText}` : ""}.`);
  } else {
    notes.push(`${childName} has recent GiggleBox activity. More Ask Me conversations will make the insights richer.`);
  }
  if (wellbeingSignals.length) {
    notes.push(`${childName} shared ${wellbeingSignals.length} wellbeing signal${wellbeingSignals.length === 1 ? "" : "s"}, such as sad, worried, hurt, scared, or concerned language. Treat this as a gentle prompt to check in, not an alarm.`);
  }
  if (unknownQuestions.length) {
    notes.push(`${unknownQuestions.length} question${unknownQuestions.length === 1 ? "" : "s"} may need better offline answers or future GiggleBrain AI support. These are useful partner-demo moments because they show where AI can extend Bop without replacing the offline safety layer.`);
    highlights.push({
      id: "gigglebrain-ai-opportunity",
      kind: "AI Brain",
      title: "GiggleBrain AI opportunity",
      detail: `${unknownQuestions.length} safe unknown question${unknownQuestions.length === 1 ? "" : "s"} could be routed to AI fallback later.`,
      createdAt: unknownQuestions[0]?.createdAt ?? events[0]?.created_at ?? events[0]?.occurred_at ?? null
    });
  }

  const coaching: string[] = [];
  if (wellbeingSignals.length) {
    coaching.push(`Gently ask ${childName} how they are feeling and whether there is anything they would like to tell you. If they mention being hurt, worried, scared, or upset, encourage them to speak to a trusted adult.`);
  }
  const schoolTopic = topTopics.find((item) => item.label === "school");
  if (schoolTopic) {
    coaching.push(`${childName} mentioned school. A simple follow-up could be: “What was the best part of school today?” or “Was anything tricky today?”`);
  }
  const footballTopic = topTopics.find((item) => item.label === "football");
  if (footballTopic) {
    coaching.push(`${childName} showed interest in football. This may be a useful way to start a positive conversation.`);
  }
  if (unknownQuestions.length) {
    coaching.push("Review the unknown questions to decide which answers should be added to the offline Conversation Bank and which safe questions are good candidates for GiggleBrain AI fallback.");
  }
  if (!coaching.length) {
    coaching.push("Use the transcript and highlights as a gentle conversation starter. Ask open questions and let the child lead where possible.");
  }

  const chronological = [...events].reverse();
  const chapters: Array<{ id: string; title: string; startAt: string | null; endAt: string | null; count: number; summary: string }> = [];
  let active: { topic: string; startAt: string | null; endAt: string | null; count: number } | null = null;
  for (const event of chronological) {
    const topic = inferTopics(event)[0] ?? (inferEmotion(event) ? "feelings" : event.event_type.includes("coloring") ? "creativity" : "activity");
    const time = event.created_at ?? event.occurred_at;
    if (!active || active.topic !== topic) {
      if (active) chapters.push({
        id: `${active.topic}-${chapters.length}`,
        title: labelFromValue(active.topic),
        startAt: active.startAt,
        endAt: active.endAt,
        count: active.count,
        summary: `${active.count} moment${active.count === 1 ? "" : "s"} connected to ${labelFromValue(active.topic).toLowerCase()}.`
      });
      active = { topic, startAt: time, endAt: time, count: 1 };
    } else {
      active.endAt = time;
      active.count += 1;
    }
  }
  if (active) chapters.push({
    id: `${active.topic}-${chapters.length}`,
    title: labelFromValue(active.topic),
    startAt: active.startAt,
    endAt: active.endAt,
    count: active.count,
    summary: `${active.count} moment${active.count === 1 ? "" : "s"} connected to ${labelFromValue(active.topic).toLowerCase()}.`
  });

  const parentIntelligence = buildParentIntelligence({
    childName,
    events,
    topTopics,
    topEmotions,
    wellbeingSignals,
    unknownQuestions,
    transcript
  });

  return {
    intelligence: parentIntelligence,
    notes,
    transcript: transcript.slice(0, 120),
    deepDive: {
      topicSummary: topTopics,
      emotionSummary: topEmotions,
      wellbeingSignals: wellbeingSignals.slice(0, 20),
      unknownQuestions: unknownQuestions.slice(0, 20),
      aiNeededCount: aiNeeded.length,
      conversationDurationMinutes: events.length > 1
        ? Math.max(1, Math.round((getTimestamp(events[0].created_at ?? events[0].occurred_at) - getTimestamp(events[events.length - 1].created_at ?? events[events.length - 1].occurred_at)) / 60000))
        : 0
    },
    coaching,
    highlights: highlights.slice(0, 20),
    chapters: chapters.slice(0, 20)
  };
}

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const childId = request.nextUrl.searchParams.get("childId");

    const [
      telemetryResult,
      childrenResult,
      devicesResult,
      linksResult,
      alertsResult
    ] = await Promise.all([
      supabase.from("telemetry_events").select("*").order("created_at", { ascending: false }).limit(700),
      supabase.from("children").select("id,name,age,created_at").order("created_at", { ascending: false }),
      supabase.from("devices").select("id,serial_number,device_name,created_at").order("created_at", { ascending: false }),
      supabase.from("child_device_links").select("id,child_id,device_id,created_at").order("created_at", { ascending: false }),
      supabase.from("alerts").select("id,child_id,alert_type,message,created_at").order("created_at", { ascending: false })
    ]);

    if (telemetryResult.error) throw telemetryResult.error;
    if (childrenResult.error) throw childrenResult.error;
    if (devicesResult.error) throw devicesResult.error;
    if (linksResult.error) throw linksResult.error;
    if (alertsResult.error) throw alertsResult.error;

    const telemetry = (telemetryResult.data ?? []) as RawTelemetryRow[];
    const normalizedTelemetry = telemetry.map((event) => ({
      ...event,
      payload: coercePayload(event.payload)
    })) as TelemetryRow[];
    const children = (childrenResult.data ?? []) as ChildRow[];
    const devices = (devicesResult.data ?? []) as DeviceRow[];
    const links = (linksResult.data ?? []) as LinkRow[];
    const alerts = (alertsResult.data ?? []) as AlertRow[];

    const childById = new Map(children.map((child) => [child.id, child]));
    const deviceById = new Map(devices.map((device) => [device.id, device]));

    const latestLinkByDevice = new Map<string, LinkRow>();
    for (const link of sortNewestFirst(links)) {
      if (!latestLinkByDevice.has(link.device_id)) {
        latestLinkByDevice.set(link.device_id, link);
      }
    }

    const deviceToChild = new Map(
      Array.from(latestLinkByDevice.values()).map((link) => [link.device_id, link.child_id] as const)
    );

    const resolveChildIdForEvent = (event: TelemetryRow) => {
      return extractActiveChildId(event.payload) ?? deviceToChild.get(event.device_id) ?? null;
    };

    const filteredTelemetry = childId
      ? normalizedTelemetry.filter((event) => resolveChildIdForEvent(event) === childId)
      : normalizedTelemetry;

    const filteredChildren = childId
      ? children.filter((child) => child.id === childId)
      : children;

    const filteredLinks = childId
      ? Array.from(latestLinkByDevice.values()).filter((link) => link.child_id === childId)
      : Array.from(latestLinkByDevice.values());

    const filteredDevices = childId
      ? devices.filter((device) => {
          const latestChild = deviceToChild.get(device.id);
          return latestChild === childId || filteredTelemetry.some((event) => event.device_id === device.id);
        })
      : devices;

    const filteredAlerts = childId
      ? alerts.filter((alert) => alert.child_id === childId)
      : alerts;

    const latestEvent = filteredTelemetry[0] ?? null;
    const latestWord =
      filteredTelemetry.map((event) => extractWord(event.payload)).find((value) => Boolean(value)) ?? null;

    const emotionEvents = filteredTelemetry.filter((event) => isEmotionEvent(event.event_type));
    const latestEmotion =
      emotionEvents.map((event) => extractEmotion(event.payload)).find((value) => Boolean(value)) ?? null;

    const coloringEvents = filteredTelemetry.filter((event) => isColoringEvent(event.event_type));

    const eventTypes = filteredTelemetry.reduce<Record<string, number>>((acc, event) => {
      acc[event.event_type] = (acc[event.event_type] ?? 0) + 1;
      return acc;
    }, {});

    const childCards = filteredChildren.map((child) => {
      const childLinks = Array.from(latestLinkByDevice.values()).filter((link) => link.child_id === child.id);
      const linkedDeviceIds = childLinks.map((link) => link.device_id);
      const childEvents = normalizedTelemetry.filter((event) => resolveChildIdForEvent(event) === child.id);
      const childLatestEvent = childEvents[0] ?? null;
      const latestEmotionForChild =
        childEvents
          .filter((event) => isEmotionEvent(event.event_type))
          .map((event) => extractEmotion(event.payload))
          .find((value) => Boolean(value)) ?? null;

      return {
        id: child.id,
        name: child.name,
        age: child.age,
        createdAt: child.created_at,
        linkedDevice: linkedDeviceIds.length ? deviceById.get(linkedDeviceIds[0]) ?? null : null,
        totalEvents: childEvents.length,
        latestEmotion: latestEmotionForChild,
        lastActivityAt: childLatestEvent?.created_at ?? childLatestEvent?.occurred_at ?? null
      };
    });

    const recentActivity = filteredTelemetry.slice(0, 30).map((event) => {
      const resolvedChildId = resolveChildIdForEvent(event);
      return {
        id: event.id,
        eventType: event.event_type,
        payload: event.payload ?? {},
        deviceId: event.device_id,
        childId: resolvedChildId,
        childName: resolvedChildId ? childById.get(resolvedChildId)?.name ?? null : null,
        occurredAt: event.occurred_at,
        createdAt: event.created_at
      };
    });

    const gameEvents = filteredTelemetry
      .filter((event) => isGameLikeEvent(event))
      .slice(0, 80)
      .map((event) => {
        const resolvedChildId = resolveChildIdForEvent(event);
        return {
          id: event.id,
          eventType: event.event_type,
          gameName: getGameName(event) ?? labelFromValue(event.event_type),
          payload: event.payload ?? {},
          deviceId: event.device_id,
          childId: resolvedChildId,
          childName: resolvedChildId ? childById.get(resolvedChildId)?.name ?? null : null,
          occurredAt: event.occurred_at,
          createdAt: event.created_at
        };
      });

    const words = filteredTelemetry
      .filter((event) => event.event_type === "word_spoken")
      .map((event) => {
        const resolvedChildId = resolveChildIdForEvent(event);
        return {
          id: event.id,
          word: extractWord(event.payload),
          childId: resolvedChildId,
          childName: resolvedChildId ? childById.get(resolvedChildId)?.name ?? null : null,
          createdAt: event.created_at
        };
      })
      .filter((item) => Boolean(item.word));

    const emotions = emotionEvents
      .map((event) => {
        const resolvedChildId = resolveChildIdForEvent(event);
        return {
          id: event.id,
          emotion: extractEmotion(event.payload),
          childId: resolvedChildId,
          childName: resolvedChildId ? childById.get(resolvedChildId)?.name ?? null : null,
          createdAt: event.created_at
        };
      })
      .filter((item) => Boolean(item.emotion));

    const savedArtwork = coloringEvents.map((event) => {
      const resolvedChildId = resolveChildIdForEvent(event);
      return {
        id: event.id,
        childId: resolvedChildId,
        childName: resolvedChildId ? childById.get(resolvedChildId)?.name ?? null : null,
        imageUrl: typeof event.payload?.imageUrl === "string" ? event.payload.imageUrl : null,
        page: typeof event.payload?.page === "string" ? event.payload.page : null,
        title: typeof event.payload?.title === "string" ? event.payload.title : null,
        payload: event.payload ?? {},
        createdAt: event.created_at
      };
    });

    const childNameForInsights = filteredChildren[0]?.name ?? "This child";
    const parentInsights = buildParentInsights(filteredTelemetry, childNameForInsights);
    const gameActivity = buildGameActivity(filteredTelemetry);

    return NextResponse.json({
      ok: true,
      filters: { childId },
      summary: {
        totalChildren: filteredChildren.length,
        totalDevices: filteredDevices.length,
        totalLinks: filteredLinks.length,
        totalEvents: filteredTelemetry.length,
        lastActivityAt: latestEvent?.created_at ?? latestEvent?.occurred_at ?? null,
        lastEventType: latestEvent?.event_type ?? null,
        latestWord,
        latestEmotion,
        coloringSaveCount: savedArtwork.length,
        openAlerts: filteredAlerts.length
      },
      children: childCards,
      recentActivity,
      parentInsights,
      deepDive: {
        words,
        emotions,
        savedArtwork,
        eventTypes,
        gameActivity,
        gameEvents
      },
      alerts: filteredAlerts
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
