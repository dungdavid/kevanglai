import { vnParts, vnTime } from "../vn-time";
import { strip } from "./text";

export interface Schedule {
  start: number | null; // UTC ms
  end: number | null;
}

const WEEKDAY: Record<string, number> = { cn: 0, "chu nhat": 0, "2": 1, "3": 2, "4": 3, "5": 4, "6": 5, "7": 6 };

/** Hour 1–11 written next to "tối/chiều/đêm" means PM. */
function toPm(hour: number, ctx: string): number {
  if (hour < 12 && /toi|chieu|dem|pm/.test(ctx)) return hour + 12;
  return hour;
}

function parseClock(raw: string): [number, number] | null {
  const m = raw.match(/(\d{1,2})\s*(?:h|g|:|gio)\s*(\d{1,2})?/);
  if (!m) return null;
  const h = Number(m[1]);
  const min = m[2] ? Number(m[2]) : 0;
  return h <= 24 && min < 60 ? [h, min] : null;
}

/**
 * Resolve the play day + time from Vietnamese free text, relative to when it was posted.
 * Understands: hôm nay / tối nay / mai / ngày kia / thứ 2–7 / CN / dd/mm, and ranges like 19h-21h, 19:30–21h, 7h-9h tối.
 */
export function resolveSchedule(text: string, postedAt: number): Schedule {
  const t = strip(text);
  const now = vnParts(postedAt);

  // --- day ---
  let dayOffset: number | null = null;
  let explicit: { y: number; m: number; d: number } | null = null;
  const dm = t.match(/\b(\d{1,2})\s*[/.-]\s*(\d{1,2})(?:\s*[/.-]\s*(\d{2,4}))?\b/);
  if (/\b(ngay kia|ngay mot|\bmot\b)/.test(t)) dayOffset = 2;
  else if (/\b(ngay mai|toi mai|sang mai|chieu mai|trua mai|\bmai\b)/.test(t)) dayOffset = 1;
  else if (/\b(hom nay|toi nay|khuya nay|sang nay|chieu nay|trua nay|dem nay|bay gio|luc nay)\b/.test(t)) dayOffset = 0;
  else {
    const wd = t.match(/\b(?:thu\s*([2-7])|(cn|chu nhat))\b/);
    if (wd) {
      const target = WEEKDAY[wd[1] ?? wd[2]];
      dayOffset = (target - now.weekday + 7) % 7;
    } else if (dm && Number(dm[2]) >= 1 && Number(dm[2]) <= 12 && Number(dm[1]) >= 1 && Number(dm[1]) <= 31) {
      const yy = dm[3] ? Number(dm[3].length === 2 ? `20${dm[3]}` : dm[3]) : now.y;
      explicit = { y: yy, m: Number(dm[2]), d: Number(dm[1]) };
      // "2/1" posted in December → next year
      if (!dm[3] && vnTime(explicit.y, explicit.m, explicit.d) < vnTime(now.y, now.m, now.d) - 30 * 86_400_000) explicit.y++;
    }
  }

  // --- time ---
  // "19h-21h", "19:30 - 21:30", "19-21h", "19h 21h", "7h-9h tối"
  const range =
    t.match(/(?<![\d/])(\d{1,2}\s*(?:h|g|:|gio)\s*\d{0,2})\s*(?:-|–|den|toi|->|~|\bto\b)\s*(\d{1,2}\s*(?:h|g|:|gio)?\s*\d{0,2})(\s*(?:toi|chieu|sang|dem|pm|am))?/) ??
    t.match(/(?<![\d/])(\d{1,2})\s*(?:-|–|den|->|~)\s*(\d{1,2}\s*(?:h|g|gio)\s*\d{0,2})(\s*(?:toi|chieu|sang|dem|pm|am))?/) ??
    t.match(/(?<![\d/])(\d{1,2}\s*h\s*\d{0,2})\s+(\d{1,2}\s*h\s*\d{0,2})(\s*(?:toi|chieu|sang|dem|pm|am))?/);
  let start: [number, number] | null = null;
  let end: [number, number] | null = null;
  if (range) {
    start = parseClock(/\d\s*(h|g|:|gio)/.test(range[1]) ? range[1] : `${range[1]}h`);
    end = parseClock(/\d\s*(h|g|:|gio)/.test(range[2]) ? range[2] : `${range[2]}h`);
  } else {
    const single = t.match(/(\d{1,2})\s*(?:h|g|gio)\s*(\d{1,2})?\b/) ?? t.match(/\b(\d{1,2}):(\d{2})\b/);
    if (single) start = [Number(single[1]), single[2] ? Number(single[2]) : 0];
  }
  if (start) {
    const ctx = range ? `${range[3] ?? ""} ${t}` : t;
    start = [toPm(start[0], ctx), start[1]];
    if (end) {
      end = [toPm(end[0], ctx), end[1]];
      if (end[0] < start[0]) end = [end[0] + 12 <= 24 ? end[0] + 12 : end[0], end[1]];
    }
    if (start[0] > 23) start = null;
  }

  if (dayOffset === null && !explicit && !start) return { start: null, end: null };
  if (dayOffset === null && !explicit) dayOffset = 0; // only a time → same day as the post

  const base = explicit ?? { y: now.y, m: now.m, d: now.d + (dayOffset ?? 0) };
  const sH = start?.[0] ?? 0;
  const sM = start?.[1] ?? 0;
  const s = vnTime(base.y, base.m, base.d, sH, sM);
  const e = end ? vnTime(base.y, base.m, base.d, end[0], end[1]) : start ? s + 2 * 3_600_000 : null;
  // No time given → keep the day, mark start at 00:00 and end of day so "today" filters still match.
  return { start: s, end: start ? e : vnTime(base.y, base.m, base.d, 23, 59) };
}
