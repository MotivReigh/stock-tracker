/**
 * Market session helpers. Times are evaluated in America/New_York.
 *
 * Trading hours: 9:30 AM – 4:00 PM ET, Mon–Fri.
 * Doesn't account for early-close holidays (July 3 half-day, Black Friday,
 * Christmas Eve) — that's fine for cache TTLs and refresh cadence; we use
 * the open/closed state only as a hint, not as an authoritative guard.
 */

const NY_TZ = "America/New_York";

function nyParts(date: Date): { hour: number; minute: number; weekday: number } {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: NY_TZ,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = formatter.formatToParts(date);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const weekdayMap: Record<string, number> = {
    Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
  };
  return {
    hour: parseInt(get("hour"), 10),
    minute: parseInt(get("minute"), 10),
    weekday: weekdayMap[get("weekday")] ?? 0,
  };
}

export function isMarketOpen(now: Date = new Date()): boolean {
  const { hour, minute, weekday } = nyParts(now);
  if (weekday === 0 || weekday === 6) return false;
  const totalMinutes = hour * 60 + minute;
  const open = 9 * 60 + 30;
  const close = 16 * 60;
  return totalMinutes >= open && totalMinutes < close;
}

export type MarketSession = "pre" | "regular" | "after" | "closed";

export function marketSession(now: Date = new Date()): MarketSession {
  const { hour, minute, weekday } = nyParts(now);
  if (weekday === 0 || weekday === 6) return "closed";
  const totalMinutes = hour * 60 + minute;
  const preOpen = 4 * 60;
  const regOpen = 9 * 60 + 30;
  const regClose = 16 * 60;
  const afterClose = 20 * 60;
  if (totalMinutes >= regOpen && totalMinutes < regClose) return "regular";
  if (totalMinutes >= preOpen && totalMinutes < regOpen) return "pre";
  if (totalMinutes >= regClose && totalMinutes < afterClose) return "after";
  return "closed";
}
