/**
 * Asia/Ho_Chi_Minh helpers. Vietnam has no DST, so a fixed +07:00 offset is exact.
 */
export const VN_OFFSET_MS = 7 * 3_600_000;

export interface VnParts {
  y: number;
  m: number; // 1-12
  d: number;
  hour: number;
  minute: number;
  weekday: number; // 0=Sunday … 6=Saturday
}

export function vnParts(ts: number | Date): VnParts {
  const t = new Date((typeof ts === "number" ? ts : ts.getTime()) + VN_OFFSET_MS);
  return {
    y: t.getUTCFullYear(),
    m: t.getUTCMonth() + 1,
    d: t.getUTCDate(),
    hour: t.getUTCHours(),
    minute: t.getUTCMinutes(),
    weekday: t.getUTCDay(),
  };
}

/** UTC timestamp for a Vietnam-local wall-clock time. Day overflow (d=32) rolls over like Date.UTC. */
export function vnTime(y: number, m: number, d: number, hour = 0, minute = 0): number {
  return Date.UTC(y, m - 1, d, hour, minute) - VN_OFFSET_MS;
}

/** Start of the Vietnam-local day containing `ts`, plus `addDays`. */
export function vnDayStart(ts: number, addDays = 0): number {
  const p = vnParts(ts);
  return vnTime(p.y, p.m, p.d + addDays);
}

const WEEKDAYS = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
const pad = (n: number) => String(n).padStart(2, "0");

export const hhmm = (ts: number) => {
  const p = vnParts(ts);
  return `${pad(p.hour)}:${pad(p.minute)}`;
};

/** "Hôm nay", "Ngày mai", or "T7 22/11", relative to `now`. */
export function dayLabel(ts: number, now: number): string {
  const diff = Math.round((vnDayStart(ts) - vnDayStart(now)) / 86_400_000);
  if (diff === 0) return "Hôm nay";
  if (diff === 1) return "Ngày mai";
  if (diff === -1) return "Hôm qua";
  const p = vnParts(ts);
  return `${WEEKDAYS[p.weekday]} ${pad(p.d)}/${pad(p.m)}`;
}

/** Part of day for an hour, matching the site's time filter buckets. */
export type TimeBucket = "morning" | "afternoon" | "late_afternoon" | "evening" | "night";
export function bucketOf(hour: number): TimeBucket {
  if (hour >= 5 && hour < 11) return "morning";
  if (hour >= 11 && hour < 16) return "afternoon";
  if (hour >= 16 && hour < 18) return "late_afternoon";
  if (hour >= 18 && hour < 21) return "evening";
  return "night";
}

/** "Tối nay · 19:00–21:00" style label. */
export function scheduleLabel(start: string | null, end: string | null, now: number): string | null {
  if (!start) return null;
  const s = new Date(start).getTime();
  const day = dayLabel(s, now);
  const h = vnParts(s).hour;
  const time = end ? `${hhmm(s)}–${hhmm(new Date(end).getTime())}` : hhmm(s);
  if (day === "Hôm nay") {
    const part = h >= 18 ? "Tối nay" : h >= 12 ? "Chiều nay" : h >= 5 ? "Sáng nay" : "Hôm nay";
    return `${part} · ${time}`;
  }
  if (day === "Ngày mai") {
    const part = h >= 18 ? "Tối mai" : h >= 12 ? "Chiều mai" : h >= 5 ? "Sáng mai" : "Ngày mai";
    return `${part} · ${time}`;
  }
  return `${day} · ${time}`;
}
