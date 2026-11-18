import { DISTRICT_IDS, type District } from "./extract/district";
import type { PostType } from "./types";
import type { TimeBucket } from "./vn-time";

/** URL-facing filter values (kept short and stable, like caulongdn.online's query string). */
export const TYPE_TABS = [
  { id: "all", label: "Tất cả", db: null },
  { id: "vl", label: "Tuyển VL", db: "tuyen_vang_lai" },
  { id: "pass", label: "Pass sân", db: "pass_san" },
] as const satisfies readonly { id: string; label: string; db: PostType | null }[];
export type TypeTab = (typeof TYPE_TABS)[number]["id"];

export const DATE_TABS = [
  { id: "upcoming", label: "Sắp tới" },
  { id: "today", label: "Hôm nay" },
  { id: "tomorrow", label: "Ngày mai" },
] as const;
export type DateTab = (typeof DATE_TABS)[number]["id"];

export const TIME_OPTIONS = [
  { id: "", label: "Mọi giờ" },
  { id: "soon", label: "Trong 3 giờ tới" },
  { id: "morning", label: "Sáng (5–11h)" },
  { id: "afternoon", label: "Trưa chiều (11–16h)" },
  { id: "late_afternoon", label: "Chiều tối (16–18h)" },
  { id: "evening", label: "Tối (18–21h)" },
  { id: "night", label: "Khuya (sau 21h)" },
] as const;
export type TimeFilter = "" | "soon" | TimeBucket;

export interface Filters {
  type: TypeTab;
  date: DateTab;
  time: TimeFilter;
  district: District | "";
  level: number | 0; // minimum rank, 0 = any
  sort: "new" | "soon" | "hot";
}

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export function parseFilters(sp: Record<string, string | string[] | undefined>): Filters {
  const type = one(sp.type);
  const date = one(sp.date);
  const time = one(sp.time);
  const district = one(sp.district);
  const level = Number(one(sp.level));
  const sort = one(sp.sort);
  return {
    type: (TYPE_TABS.some((t) => t.id === type) ? type : "all") as TypeTab,
    date: (DATE_TABS.some((t) => t.id === date) ? date : "upcoming") as DateTab,
    time: (TIME_OPTIONS.some((t) => t.id === time) ? time : "") as TimeFilter,
    district: (DISTRICT_IDS as string[]).includes(district) ? (district as District) : "",
    level: Number.isInteger(level) && level >= 1 && level <= 6 ? level : 0,
    sort: sort === "new" || sort === "hot" ? sort : "soon",
  };
}

const DEFAULTS: Filters = { type: "all", date: "upcoming", time: "", district: "", level: 0, sort: "soon" };

/** Build a "/?…" href with only non-default values. */
export function filterHref(f: Filters, patch: Partial<Filters> = {}): string {
  const merged = { ...f, ...patch };
  const sp = new URLSearchParams();
  for (const k of Object.keys(DEFAULTS) as (keyof Filters)[]) {
    if (merged[k] !== DEFAULTS[k]) sp.set(k, String(merged[k]));
  }
  const s = sp.toString();
  return s ? `/?${s}` : "/";
}

export const dbType = (tab: TypeTab) => TYPE_TABS.find((t) => t.id === tab)?.db ?? null;

/** Only these post types are shown on the site (tìm nhóm / tìm sân / gear are kept out). */
export const LISTED_TYPES = ["tuyen_vang_lai", "pass_san"] as const;
