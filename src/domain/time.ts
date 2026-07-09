import { addDays, format, startOfWeek } from "date-fns";

/** Parse "18:05" or "8:15" into minutes from midnight. */
export function parseTime(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

/** Minutes from midnight → "18:05". */
export function formatMin(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h}:${String(m).padStart(2, "0")}`;
}

export function formatRange(startMin: number, endMin: number): string {
  return `${formatMin(startMin)}–${formatMin(endMin)}`;
}

export function toIsoDate(d: Date): string {
  return format(d, "yyyy-MM-dd");
}

/** Monday of the week containing `d`. Weeks start Monday in this domain. */
export function mondayOf(d: Date): Date {
  return startOfWeek(d, { weekStartsOn: 1 });
}

/** The 7 ISO dates of the week containing `d`, Monday first. */
export function weekDates(d: Date): string[] {
  const mon = mondayOf(d);
  return Array.from({ length: 7 }, (_, i) => toIsoDate(addDays(mon, i)));
}

/** Minutes from midnight for `now`, or null if `now` is not on `isoDate`. */
export function nowMinOn(isoDate: string, now: Date): number | null {
  if (toIsoDate(now) !== isoDate) return null;
  return now.getHours() * 60 + now.getMinutes();
}

/** Drag interactions snap here; typed times may be exact. */
export const SNAP_MINUTES = 5;

export function snapMin(min: number): number {
  return Math.round(min / SNAP_MINUTES) * SNAP_MINUTES;
}
