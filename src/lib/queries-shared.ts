import { bucketOf, vnDayStart, vnParts } from "./vn-time";
import type { Filters } from "./filters";
import type { PostRow } from "./types";

export const HOUR = 3_600_000;

/** Time window [from, to) implied by the date tab. Undated posts only appear under "Sắp tới". */
export function dateWindow(f: Filters, now: number): { from: number; to: number | null } {
  if (f.date === "today") return { from: vnDayStart(now), to: vnDayStart(now, 1) };
  if (f.date === "tomorrow") return { from: vnDayStart(now, 1), to: vnDayStart(now, 2) };
  return { from: now - 2 * HOUR, to: null }; // still playing or upcoming
}

/** Filters that need a computed value (time of day, "within 3 hours") are applied in memory. */
export function applyMemoryFilters(rows: PostRow[], f: Filters, now: number): PostRow[] {
  let out = rows;
  if (f.time === "soon") {
    out = out.filter((r) => {
      const s = r.play_start ? Date.parse(r.play_start) : NaN;
      return s >= now - 30 * 60_000 && s <= now + 3 * HOUR;
    });
  } else if (f.time) {
    out = out.filter((r) => {
      if (!r.play_start) return false;
      const p = vnParts(Date.parse(r.play_start));
      // date-only posts are stored at 00:00 — they have no time of day to match
      return !(p.hour === 0 && p.minute === 0) && bucketOf(p.hour) === f.time;
    });
  }
  if (f.sort === "soon") {
    const key = (r: PostRow) => (r.play_start ? Date.parse(r.play_start) : Number.MAX_SAFE_INTEGER);
    out = [...out].sort((a, b) => key(a) - key(b));
  }
  return out;
}
