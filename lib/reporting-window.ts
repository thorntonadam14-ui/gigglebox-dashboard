// Receipt timestamps are stored as UTC; boundaries follow the UK calendar,
// including 23-hour and 25-hour daylight-saving transition days.
export function londonReceiptDay(now = new Date()) {
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23"
  });
  function parts(date: Date) {
    return Object.fromEntries(formatter.formatToParts(date).map(p => [p.type, p.value]));
  }
  const p = parts(now);
  const midnight = Date.UTC(Number(p.year), Number(p.month) - 1, Number(p.day));
  function utcBoundary(wallTime: number) {
    let utc = wallTime;
    for (let i = 0; i < 3; i++) {
      const local = parts(new Date(utc));
      const represented = Date.UTC(Number(local.year), Number(local.month) - 1,
        Number(local.day), Number(local.hour), Number(local.minute), Number(local.second));
      utc += wallTime - represented;
    }
    return new Date(utc).toISOString();
  }
  return { start: utcBoundary(midnight), end: utcBoundary(midnight + 86400000),
    date: `${p.year}-${p.month}-${p.day}` };
}
