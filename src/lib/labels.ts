import { DISTRICTS, type District } from "./extract/district";
import type { PostRow, PostType } from "./types";

export const TYPE_META: Record<Exclude<PostType, "other">, { label: string; badge: string }> = {
  tuyen_vang_lai: { label: "Tuyển vãng lai", badge: "bg-[#E3F0E8] text-[#1F6F4A] dark:bg-[#1F6F4A]/30 dark:text-[#9fe0bd]" },
  pass_san: { label: "Pass sân", badge: "bg-[#FCEFC7] text-[#6E5100] dark:bg-[#6E5100]/40 dark:text-[#f2d47a]" },
  tim_nhom: { label: "Tìm nhóm", badge: "bg-[#E6EEFB] text-[#1D4F9C] dark:bg-[#1D4F9C]/35 dark:text-[#a9c6f5]" },
  tim_san: { label: "Tìm sân", badge: "bg-[#F1E8FB] text-[#5B2A8C] dark:bg-[#5B2A8C]/35 dark:text-[#d4b8f2]" },
};

export const typeMeta = (t: PostType) => TYPE_META[t as Exclude<PostType, "other">] ?? TYPE_META.tuyen_vang_lai;

export const districtLabel = (d: string | null) => (d && d in DISTRICTS ? DISTRICTS[d as District] : null);

export const vnd = (n: number) => (n >= 1_000_000 ? `${(n / 1_000_000).toLocaleString("vi-VN")}tr` : `${Math.round(n / 1000)}k`);

export function priceUnit(p: PostRow) {
  if (p.type === "pass_san" || p.type === "tim_san") return "giá sân";
  return "/ người";
}

export interface Tag {
  label: string;
  tone: "pink" | "blue" | "gray";
}

/** "Cần 3 nữ", "Cần 2 nam", "Trình TB-" chips. For tìm nhóm the counts are the poster's group. */
export function postTags(p: PostRow): Tag[] {
  const tags: Tag[] = [];
  const verb = p.type === "tim_nhom" ? "Nhóm" : "Cần";
  if (p.type === "tuyen_vang_lai" || p.type === "tim_nhom") {
    if (p.slots_female) tags.push({ label: `${verb} ${p.slots_female} nữ`, tone: "pink" });
    if (p.slots_male) tags.push({ label: `${verb} ${p.slots_male} nam`, tone: "blue" });
    if (!p.slots_female && !p.slots_male && p.slots_total) tags.push({ label: `${verb} ${p.slots_total} người`, tone: "gray" });
  }
  if (p.level) tags.push({ label: `Trình ${p.level}`, tone: "gray" });
  if (p.type === "pass_san") tags.push({ label: "Nhượng lại sân", tone: "gray" });
  return tags;
}

export const TAG_TONE: Record<Tag["tone"], string> = {
  pink: "bg-[#FDE8EF] text-[#9C1F4B] dark:bg-[#9C1F4B]/30 dark:text-[#f5b3c9]",
  blue: "bg-[#E6EEFB] text-[#1D4F9C] dark:bg-[#1D4F9C]/35 dark:text-[#a9c6f5]",
  gray: "bg-[#F0F2EF] text-[#3C4A42] dark:bg-white/10 dark:text-[#c9d4cd]",
};

export function timeAgo(iso: string | null, now: number) {
  if (!iso) return null;
  const m = Math.max(0, Math.round((now - Date.parse(iso)) / 60000));
  if (m < 60) return `${m} phút trước`;
  if (m < 1440) return `${Math.round(m / 60)} giờ trước`;
  return `${Math.round(m / 1440)} ngày trước`;
}

export const initials = (name: string | null) =>
  (name ?? "?")
    .split(/\s+/)
    .filter(Boolean)
    .slice(-2)
    .map((w) => w[0]?.toUpperCase())
    .join("") || "?";

export function zaloUrl(p: PostRow) {
  const n = (p.zalo ?? p.phone)?.replace(/\D/g, "");
  return n ? `https://zalo.me/${n.replace(/^84/, "0")}` : null;
}
