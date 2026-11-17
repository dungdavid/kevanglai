import type { Extraction, PostType } from "../types";
import { detectDistrict } from "./district";
import { originalSlice, strip } from "./text";

/**
 * Rule-based extractor for Vietnamese badminton posts.
 * Used as a fallback when no AI key is configured or the AI call fails.
 */

const PASS = [/\bpass\b/, /nhuong (lai )?san/, /nhuong lai/, /thanh ly san/, /\bdu \d* ?san\b/, /\bnhuong\b.*\bsan\b/];
const RECRUIT = [
  /vang lai/,
  /tuyen (them )?\d*\s*(nam|nu|nguoi|ban|vl|thanh vien)/,
  /(can|tim|thieu|bu) (them )?\d+\s*(nam|nu|nguoi|ban|vl|slot)/,
  /(can|tim) (them )?(nam|nu) /,
  /giao luu/,
  /\bgl\b/,
  /\bvl\b/,
  /\btuyen\b/,
];
const FIND_GROUP = [
  /(minh|em|toi|anh|chi|cap|nhom) .{0,30}(tim|xin|can) (keo|nhom|team|cho|ghep|choi ke)/,
  /(tim|xin) (keo|nhom|team) (choi|danh|giao luu|vang lai)?/,
  /(xin|cho) (ghep|vao) (keo|nhom|team)/,
  /ai (co|thieu) (keo|nguoi|slot).{0,20}(cho|xin) (minh|em|toi)/,
  /(minh|em) (\d+ )?(nam|nu)?.{0,20}(muon|can) (choi|danh) (ghep|vang lai|giao luu)/,
];
const FIND_COURT = [/(tim|can|thue|hoi|xin) (thue )?san( trong)?\b/, /ai (co|du) san.{0,20}(pass|nhuong|cho) (lai )?(minh|em|toi)/, /san nao (con )?trong/];

export function classify(text: string): PostType {
  const t = strip(text);
  const has = (ps: RegExp[]) => ps.some((p) => p.test(t));
  // "ai có sân pass lại cho mình" = looking for a court, not offering one
  if (has(FIND_COURT)) return "tim_san";
  if (has(FIND_GROUP) && !/\btuyen\b|can (them )?\d+ (nam|nu)/.test(t)) return "tim_nhom";
  const pass = has(PASS);
  const recruit = has(RECRUIT);
  if (pass && !/vang lai/.test(t)) return "pass_san";
  if (recruit) return "tuyen_vang_lai";
  if (pass) return "pass_san";
  return "other";
}

/** Parse "50k", "50.000đ", "1tr2", "120 nghìn" → VND. */
export function parsePrices(text: string): number[] {
  const t = strip(text);
  const out: number[] = [];
  const re = /(\d{1,3}(?:[.,]\d{3})+|\d+(?:[.,]\d+)?)\s*(k|nghin|ngan|tr|trieu|d|vnd|dong)?(\d)?/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(t))) {
    const [, numRaw, unit, trailing] = m;
    let value: number | null = null;
    if (/^\d{1,3}([.,]\d{3})+$/.test(numRaw)) {
      value = Number(numRaw.replace(/[.,]/g, ""));
      if (unit === "k") value *= 1000;
    } else {
      const n = Number(numRaw.replace(",", "."));
      if (unit === "k" || unit === "nghin" || unit === "ngan") value = n * 1000;
      else if (unit === "tr" || unit === "trieu") value = n * 1_000_000 + (trailing ? Number(trailing) * 100_000 : 0);
      else if ((unit === "d" || unit === "vnd" || unit === "dong") && n >= 1000) value = n;
    }
    if (value !== null && value >= 10_000 && value <= 5_000_000) out.push(Math.round(value));
  }
  return out;
}

function countFor(t: string, word: "nam" | "nu"): number | null {
  const m = t.match(new RegExp(`(\\d+)\\s*${word}\\b`)) ?? t.match(new RegExp(`\\b${word}\\s*(\\d+)\\b(?!\\s*(k|h|:))`));
  return m ? Number(m[1]) : null;
}

const VENUE_RE = /(san\s+(?:cau long\s+)?[a-z0-9][a-z0-9 ]{1,30}?)(?=[,.\-\n(]|\s+(?:luc|tu|gio|\d+h|toi|sang|chieu|ngay|thu|cn|hom)|$)/;

export function heuristicExtract(text: string): Extraction {
  const t = strip(text);
  const type = classify(text);
  const prices = parsePrices(text);

  const venueMatch = t.match(VENUE_RE);
  const venueRaw = venueMatch ? originalSlice(text, venueMatch) : null;
  // "sân thứ 7", "sân trống", "sân nào", "sân 19h" are not venue names
  const notVenue = venueMatch && /^san (thu|trong|nao|cho|luc|toi|sang|chieu|mai|hom|ngay|gio|o|tai|nay|do|kia|\d)\b/.test(venueMatch[1]);
  const venueName = venueRaw && !notVenue ? venueRaw.charAt(0).toUpperCase() + venueRaw.slice(1) : null;

  const addrMatch = t.match(/(?:^|[\s,.])(?:dia chi|dc)\s*[:\-]?\s*[^\n]{5,80}?(?=\.\s|\n|$)/);
  const address = addrMatch
    ? originalSlice(text, addrMatch).replace(/^[\s,.]*(địa chỉ|đc|dc)\s*[:\-]?\s*/i, "").trim()
    : null;

  const timeMatch = t.match(/(\d{1,2}\s*[h:]\s*\d{0,2})\s*(?:-|den|toi|->|~)\s*(\d{1,2}\s*[h:]\s*\d{0,2})/);
  const dateMatch = t.match(
    /(?:thu\s*[2-7]|chu nhat|\bcn\b|hom nay|toi nay|sang nay|chieu nay|ngay mai|toi mai)(?:\s+(?:nay|tuan nay|tuan sau|toi))?(?:\s*\(?\d{1,2}\/\d{1,2}\)?)?|\b\d{1,2}\/\d{1,2}(?:\/\d{2,4})?/,
  );
  const phoneMatch = text.match(/(?:\+?84|0)(?:[\s.]?\d){9}/);
  const phone = phoneMatch ? phoneMatch[0].replace(/[\s.]/g, "") : null;

  const male = countFor(t, "nam");
  const female = countFor(t, "nu");
  const totalMatch = t.match(/(\d+)\s*(?:nguoi|ban|slot|vl|vang lai)/);
  const total = totalMatch ? Number(totalMatch[1]) : male !== null || female !== null ? (male ?? 0) + (female ?? 0) : null;
  const wantsPeople = type === "tuyen_vang_lai" || type === "tim_nhom";

  const levelMatch = t.match(
    /(?:trinh|tr)\s*(?:do)?\s*[:\-]?\s*(yeu|tb\s?(?:yeu|kha)|tb[+-]?|trung binh(?: kha| yeu)?|kha|gioi|y\+|tby|tbk)(?=[\s,.;)]|$)|\b(tb[+-]|tby|tbk|y\+)(?=[\s,.;)]|$)/,
  );

  return {
    type,
    venueName,
    address,
    priceText: prices.length ? prices.map((p) => `${p / 1000}k`).join(", ") : null,
    priceVnd: prices.length ? Math.min(...prices) : null,
    playDate: dateMatch ? originalSlice(text, dateMatch) : null,
    playTime: timeMatch ? `${timeMatch[1].replace(/\s/g, "")}-${timeMatch[2].replace(/\s/g, "")}` : null,
    playDateISO: null, // resolved by resolveSchedule()
    startTime: null,
    endTime: null,
    district: detectDistrict(address, venueName, text),
    slotsTotal: wantsPeople ? total : null,
    slotsMale: wantsPeople ? male : null,
    slotsFemale: wantsPeople ? female : null,
    level: levelMatch ? (levelMatch[1] ?? levelMatch[2]).toUpperCase() : null,
    phone,
    zalo: /zalo|\bzl\b/.test(t) && phone ? phone : null,
  };
}
