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
