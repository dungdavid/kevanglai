import type { Extraction } from "../types";
import { vnTime } from "../vn-time";
import { asDistrict, detectDistrict, levelRank } from "./district";
import { geminiEnabled, geminiExtract } from "./gemini";
import { heuristicExtract } from "./heuristic";
import { resolveSchedule } from "./schedule";

export async function extract(text: string, postedAt: number): Promise<{ data: Extraction; extractor: string }> {
  if (geminiEnabled()) {
    try {
      return { data: await geminiExtract(text, postedAt), extractor: "gemini" };
    } catch (err) {
      console.error("[extract] Gemini failed, falling back to heuristic:", err);
    }
  }
  return { data: heuristicExtract(text), extractor: "heuristic" };
}

/** Google Maps search link for an address/venue in Da Nang. */
export function mapsUrl(venue: string | null, address: string | null): string | null {
  const q = [venue, address].filter(Boolean).join(", ");
  if (!q) return null;
  const withCity = /đà nẵng|da nang/i.test(q) ? q : `${q}, Đà Nẵng`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(withCity)}`;
}

/** "Điểm tương tác" of a post: reactions + 2×comments + 3×shares. */
export function engagementScore(reactions: number, comments: number, shares: number) {
  return reactions + comments * 2 + shares * 3;
}

const clock = (s: string | null): [number, number] | null => {
  const m = s?.match(/^(\d{1,2}):(\d{2})$/);
  return m ? [Number(m[1]), Number(m[2])] : null;
};

/** Normalized columns derived from an extraction: play_start/end, district, level rank, maps link. */
export function derivedFields(x: Extraction, text: string, postedAt: number) {
  let start: number | null = null;
  let end: number | null = null;
  const iso = x.playDateISO?.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const s = clock(x.startTime);
  if (iso) {
    const [y, m, d] = [Number(iso[1]), Number(iso[2]), Number(iso[3])];
    const e = clock(x.endTime);
    start = vnTime(y, m, d, s?.[0] ?? 0, s?.[1] ?? 0);
    end = e ? vnTime(y, m, d, e[0], e[1]) : s ? start + 2 * 3_600_000 : vnTime(y, m, d, 23, 59);
    if (end < start) end += 86_400_000;
  } else {
    ({ start, end } = resolveSchedule(text, postedAt));
  }
  return {
    play_start: start ? new Date(start).toISOString() : null,
    play_end: end ? new Date(end).toISOString() : null,
    district: asDistrict(x.district) ?? detectDistrict(x.address, x.venueName, text),
    level_rank: levelRank(x.level),
    maps_url: mapsUrl(x.venueName, x.address),
  };
}
