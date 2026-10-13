export function cairoDateToUtc(input: string, endOfDay: boolean): Date {
  if (input.includes("T")) return new Date(input);
  const base = new Date(input + (endOfDay ? "T23:59:59Z" : "T00:00:00Z"));
  const p = new Intl.DateTimeFormat("en-US", {
    timeZone: "Africa/Cairo",
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(base);
  const g = (t: string) => Number(p.find((x) => x.type === t)?.value);
  const asUtc = Date.UTC(g("year"), g("month") - 1, g("day"), g("hour"), g("minute"), g("second"));
  return new Date(base.getTime() - (asUtc - base.getTime()));
}
