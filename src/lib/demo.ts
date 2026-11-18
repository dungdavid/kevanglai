import { derivedFields, engagementScore } from "./extract";
import { heuristicExtract } from "./extract/heuristic";
import { dbType, LISTED_TYPES, type Filters } from "./filters";
import { applyMemoryFilters, dateWindow } from "./queries-shared";
import type { PostRow } from "./types";

/** Sample posts shown when Supabase isn't configured (local dev / preview without a DB). */
const SAMPLES = [
  { group: "Giao Lưu Cầu Lông Đà Nẵng", author: "Quốc Bảo", r: 41, c: 19, s: 1, h: 0.2,
    text: "Team cần thêm 3 nữ giao lưu tối nay 19h-21h, sân Chi Lăng, Hải Châu. Trình TB-, 35k/nữ, 50k/nam." },
  { group: "Cộng Đồng Cầu Lông Đà Nẵng", author: "Thu Hà", r: 8, c: 5, s: 0, h: 0.6,
    text: "Pass lại 1 sân Hòa Xuân 18h-20h tối nay, giá 120k. Ai cần ib mình nhé" },
  { group: "Cầu Lông Đà Nẵng", author: "Minh Tuấn", r: 24, c: 11, s: 1, h: 1,
    text: "Tuyển 2 nam 1 nữ vãng lai trình TB, sân Tiên Sơn, ngày mai 19h-21h. 50k/nam 40k/nữ. Zalo 0905 123 456" },
  { group: "Cầu Lông Đà Nẵng", author: "Ngọc Anh", r: 12, c: 9, s: 0, h: 2,
    text: "Mình nữ trình TB, tối mai 20h xin ghép kèo ở Thanh Khê hoặc Hải Châu ạ" },
  { group: "Cộng Đồng Cầu Lông Đà Nẵng", author: "Văn Khoa", r: 5, c: 7, s: 0, h: 3,
    text: "Cần thuê sân thứ 7 6h-8h sáng khu Sơn Trà, ai có sân pass lại cho mình với" },
  { group: "Cầu Lông Đà Nẵng", author: "Hoàng Long", r: 3, c: 2, s: 0, h: 5,
    text: "Nhượng sân Hòa Khánh 17h-19h chủ nhật, 2 sân giá 200k" },
];

export function demoPosts(f: Filters, now: number): PostRow[] {
  const rows = SAMPLES.map((s, i): PostRow => {
    const posted = now - s.h * 3_600_000;
    const x = heuristicExtract(s.text);
    const t = new Date(posted).toISOString();
    return {
      id: `00000000-0000-4000-8000-00000000000${i}`, fb_post_id: `demo-${i}`, post_url: "https://www.facebook.com/groups/",
      group_id: "demo", group_name: s.group, author_name: s.author, author_url: null, raw_text: s.text,
      reactions: s.r, comments: s.c, shares: s.s, engagement_score: engagementScore(s.r, s.c, s.s),
      posted_at: t, created_at: t, updated_at: t, type: x.type, venue_name: x.venueName, address: x.address,
      price_text: x.priceText, price_vnd: x.priceVnd, play_date: x.playDate, play_time: x.playTime,
      slots_total: x.slotsTotal, slots_male: x.slotsMale, slots_female: x.slotsFemale, level: x.level,
      phone: x.phone, zalo: x.zalo, extractor: "heuristic", ...derivedFields(x, s.text, posted),
    };
  });
  const { from, to } = dateWindow(f, now);
  const type = dbType(f.type);
  return applyMemoryFilters(
    rows.filter((p) => {
      if (!(LISTED_TYPES as readonly string[]).includes(p.type)) return false;
      if (type && p.type !== type) return false;
      if (f.district && p.district !== f.district) return false;
      if (f.level && p.level_rank && p.level_rank > f.level) return false;
      const end = p.play_end ? Date.parse(p.play_end) : null;
      const start = p.play_start ? Date.parse(p.play_start) : null;
      if (to) return end !== null && start !== null && end >= from && start < to;
      return end === null ? true : end >= from;
    }),
    f,
    now,
  );
}

export const getDemoPost = (id: string, now: number) =>
  demoPosts({ type: "all", date: "upcoming", time: "", district: "", level: 0, sort: "soon" }, now).find((p) => p.id === id) ?? null;
