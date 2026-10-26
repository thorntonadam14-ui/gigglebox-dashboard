// Interpret the existing Unity reporter payload; no new event fields or types.
export function routingFlag(payload: Record<string, unknown>, key: string): boolean {
  const value = payload[key];
  if (typeof value === "boolean") return value;
  if (typeof value === "string" && /^(true|false|yes|no|1|0)$/i.test(value.trim()))
    return /^(true|yes|1)$/i.test(value.trim());
  const note = typeof payload.note === "string" ? payload.note : "";
  return note.split(";").some(part => {
    const [name, value] = part.trim().split("=");
    return name === key && /^(true|yes|1)$/i.test((value ?? "").trim());
  });
}

export function routingName(payload: Record<string, unknown>): string {
  if (typeof payload.route === "string" && payload.route.trim()) return payload.route.trim();
  const note = typeof payload.note === "string" ? payload.note : "";
  const route = note.split(";").find(part => part.trim().startsWith("route="));
  if (route) return route.trim().slice(6).trim();
  return typeof payload.signalSource === "string" ? payload.signalSource.trim() : "";
}

export function storyMakerRoute(eventType: string, payload: Record<string, unknown>): string | null {
  const route = routingName(payload) || eventType;
  return route === "story_maker" || route === "story_maker_complete" ? route : null;
}

// Live Bop result payloads use the existing generic telemetry storage/sync.
export type LiveBopGameTotals = {
  answers: number; questionsAnswered: number; correct: number; incorrect: number;
  rounds: number; successfulDetections: number; completed: number; interrupted: number;
  latestScore: string | null;
};
type GameEvent = { event_type: string; payload: Record<string, unknown> };
export function isLiveBopResult(event: GameEvent) {
  return event.event_type === "game_result" && event.payload.source === "Live Bop" &&
    ["Maths", "Peekaboo"].includes(String(event.payload.gameName)) &&
    typeof event.payload.eventId === "string" && typeof event.payload.sessionId === "string";
}
export function deduplicateGameResults<T extends GameEvent>(events: T[]): T[] {
  const seen = new Set<string>();
  return events.filter(event => {
    if (!isLiveBopResult(event)) return true;
    const key = `${event.payload.gameName}:${event.payload.sessionId}:${event.payload.eventId}`;
    if (seen.has(key)) return false;
    seen.add(key); return true;
  });
}
export function liveBopGameResults(events: GameEvent[]): Record<string, LiveBopGameTotals> {
  const results: Record<string, LiveBopGameTotals> = {};
  for (const event of deduplicateGameResults(events)) {
    if (!isLiveBopResult(event)) continue;
    const p = event.payload;
    const name = String(p.gameName);
    const r = results[name] ?? (results[name] = { answers: 0, questionsAnswered: 0,
      correct: 0, incorrect: 0, rounds: 0, successfulDetections: 0, completed: 0,
      interrupted: 0, latestScore: null });
    if (name === "Maths" && p.stage === "answer") {
      r.answers++;
      if (p.questionsAnswered === 1) r.questionsAnswered++;
      if (p.correct === 1) r.correct++;
      else if (p.incorrect === 1) r.incorrect++;
    }
    if (name === "Peekaboo" && p.stage === "round") {
      r.rounds++;
      if (p.successfulDetections === 1) r.successfulDetections++;
    }
    // End snapshots describe the session, not extra answers/rounds.
    if (p.stage === "complete" && p.completed === true) r.completed++;
    if (p.stage === "interrupted") r.interrupted++;
    if (name === "Maths" && r.latestScore === null &&
        ["complete", "interrupted"].includes(String(p.stage)) &&
        typeof p.score === "number" && typeof p.questionsAnswered === "number")
      r.latestScore = `${p.score}/${p.questionsAnswered}`;
  }
  return results;
}
export function liveBopResultSummary(name: string, r: LiveBopGameTotals): string {
  const activity = name === "Maths"
    ? `${r.questionsAnswered} questions answered · ${r.answers} attempts · ${r.correct} correct · ${r.incorrect} incorrect${r.latestScore !== null ? ` · latest ended session score ${r.latestScore}` : ""}`
    : `${r.rounds} rounds · ${r.successfulDetections} successful return detections`;
  return `Live Bop · ${activity} · ${r.completed} completed sessions${r.interrupted ? ` · ${r.interrupted} interrupted` : ""}`;
}
