import { engagementScore, mapsUrl } from "./extract";
import { heuristicExtract } from "./extract/heuristic";
import type { PostFilters } from "./queries";
import type { PostRow } from "./types";

/** Sample posts shown when Supabase isn't configured yet (preview / local dev). */
const SAMPLES = [
  { group: "Cầu Lông Đà Nẵng", author: "Minh Tuấn", r: 24, c: 11, s: 1, h: 1,
    text: "Tuyển 2 nam 1 nữ vãng lai trình TB, sân Tiên Sơn, 19h-21h thứ 5 này. 50k/nam 40k/nữ. LH 0905 123 456" },
  { group: "Cộng Đồng Cầu Lông Đà Nẵng", author: "Thu Hà", r: 8, c: 5, s: 0, h: 3,
    text: "Pass lại 1 sân Hòa Xuân 18h-20h tối nay, giá 120k. Ai cần ib mình nhé" },
  { group: "Giao Lưu Cầu Lông Đà Nẵng", author: "Quốc Bảo", r: 41, c: 19, s: 2, h: 6,
    text: "Team cần thêm 3 nữ giao lưu, sân Chi Lăng, 20h-22h thứ 7. Trình TB-, 35k/nữ. Đc: 1 Đường Chi Lăng, Hải Châu" },
  { group: "Cầu Lông Đà Nẵng", author: "Hoàng Long", r: 3, c: 2, s: 0, h: 9,
    text: "Nhượng sân Đại học TDTT 17h-19h chủ nhật, 2 sân giá 200k" },
];

export function demoPosts(f: PostFilters, now: number): PostRow[] {
  return SAMPLES.map((s, i): PostRow => {
    const x = heuristicExtract(s.text);
    const t = new Date(now - s.h * 3_600_000).toISOString();
    return {
      id: `demo-${i}`, fb_post_id: `demo-${i}`, post_url: "https://www.facebook.com/groups/", group_id: "demo",
      group_name: s.group, author_name: s.author, author_url: null, raw_text: s.text,
      reactions: s.r, comments: s.c, shares: s.s, engagement_score: engagementScore(s.r, s.c, s.s),
      posted_at: t, created_at: t, updated_at: t, type: x.type, venue_name: x.venueName, address: x.address,
      maps_url: mapsUrl(x.venueName, x.address), price_text: x.priceText, price_vnd: x.priceVnd,
      play_date: x.playDate, play_time: x.playTime, slots_total: x.slotsTotal, slots_male: x.slotsMale,
      slots_female: x.slotsFemale, level: x.level, phone: x.phone, extractor: "heuristic",
    };
  }).filter((p) =>
    (!f.type || p.type === f.type) &&
    (f.need !== "nam" || (p.slots_male ?? 0) > 0) &&
    (f.need !== "nu" || (p.slots_female ?? 0) > 0) &&
    (!f.maxPrice || (p.price_vnd ?? 0) <= f.maxPrice) &&
    (!f.q || p.raw_text.toLowerCase().includes(f.q.toLowerCase())),
  ).sort((a, b) => (f.sort === "hot" ? b.engagement_score - a.engagement_score : 0));
}
