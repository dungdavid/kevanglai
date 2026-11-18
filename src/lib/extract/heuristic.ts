import type { Extraction, PostType } from "../types";
import { detectDistrict } from "./district";
import { strip } from "./text";

/**
 * Rule-based extractor for Vietnamese badminton posts.
 * Used as a fallback when no AI key is configured or the AI call fails.
 *
 * Two views of the text are used:
 *  - `lc`  lowercase WITH diacritics — needed where diacritics matter ("sân" court vs "sẵn" already-have)
 *  - `t`   lowercase WITHOUT diacritics — robust keyword matching for everything else
 */

const lower = (s: string) => s.normalize("NFC").toLowerCase();
const COURT = "sân(?![\\p{L}])"; // "sân" as a whole word, never "sẵn"

/** Offering a booked court: "pass sân", "nhượng lại 1 sân", "sân … pass lại". */
const COURT_PASS = new RegExp(
  `(?:pass|nhượng|thanh lý|dư|bán)\\s+(?:lại\\s+)?(?:\\d+\\s+)?(?:giờ\\s+|slot\\s+|ca\\s+)?${COURT}|${COURT}[^.\\n]{0,25}(?:pass|nhượng)(?![\\p{L}])`,
  "u",
);
/** Looking for a court (not shown on the site, but must not be mistaken for a pass). */
const FIND_COURT = new RegExp(
  `(?:tìm|cần|kiếm)\\s+(?:thuê\\s+)?${COURT}|thuê\\s+${COURT}|ai\\s+(?:có|dư)\\s+${COURT}[^.\\n]{0,25}(?:pass|nhượng|cho)|${COURT}\\s+nào\\s+(?:còn\\s+)?trống`,
  "u",
);
/** Buying / selling / passing gear: rackets, shoes, strings, bags… */
const GEAR_WORDS =
  "vot|giay|cuoc|balo|bao vot|tui vot|tui|ao|quan ao|tat|tour|arc ?\\d+|astrox|nanoflare|duora|voltric|thruster|kumpo|yonex|victor|lining|li ning|apacs|felet|vicleo|mizuno|motor|hs plus|\\d ?u\\b";
const GEAR_DEAL = new RegExp(
  `\\b(?:pass|ban|mua|tim|can|kiem|trade|tuyen|thanh ly|thue|order|fix)\\s+(?:\\S+\\s+){0,2}(?:${GEAR_WORDS})\\b|\\b(?:${GEAR_WORDS})\\b[^\\n]{0,40}\\b(?:99%|like new|fullbox|boc|con moi|ib bao gia|bao gia|fix|gia \\d)`,
);
/** Not a game at all: tournaments, shops, chit-chat. */
const OFF_TOPIC = /\bdang ky\b|\bbtc\b|giai dau|link dang ky|\bshop\b|nguoi yeu|co chong/;
/** A player asking to join someone else's game. */
const ASK_TO_JOIN =
  /co team nao|team nao (?:con |dang )?(?:thieu|tuyen|can|danh)|nhom (?:vang lai|vl) nao|cho (?:minh|em|toi|e) xin|xin (?:\d+|mot|hai) (?:sl|slot)|cuu mang|(?:tim|xin|kiem) (?:keo|team|nhom)\b|xin (?:ghep|vao)|ghep keo|\btim (?:vl|vang lai)\b/;
/** Signals that the poster already has a court/team and is the one recruiting. */
const HAS_GAME = /team minh|nhom minh|ben minh|san minh|can tuyen|tuyen them|\bsan\b.{0,3}\d|dia diem|dia chi|\bphi\b|\bsan [a-z]/;
/** Recruiting players into an existing game. */
const RECRUIT =
  /tuyen|vang lai|\bvl\b|giao luu|\bslot|\bsl\b|thieu (?:\d|mot|1)|can (?:them )?(?:\d+|mot|vai) ?(?:ban|nam|nu|slot|nguoi)|con (?:\d+ )?slot|team minh|nhom minh|ben minh|san minh|ai (?:di|danh|choi|tham gia|muon)|max san|gap \d+ ?(?:slot|nam|nu)/;

export function classify(text: string): PostType {
  const lc = lower(text);
  const t = strip(text);
  if (FIND_COURT.test(lc)) return "tim_san";
  if (COURT_PASS.test(lc)) return "pass_san";
  if (OFF_TOPIC.test(t)) return "other";
  if (GEAR_DEAL.test(t)) return "other";
  // "có team nào … cho mình xin" is always a player asking; "tìm vl" is a player only when there is no game info
  const asking = /co team nao|team nao|cho (?:minh|em|toi|e) xin|cuu mang|nhom (?:vang lai|vl) nao/.test(t);
  if (ASK_TO_JOIN.test(t) && (asking || !HAS_GAME.test(t))) return "tim_nhom";
  if (RECRUIT.test(t)) return "tuyen_vang_lai";
  return "other";
}

/** Parse prices → VND. "50k", "120.000đ", "1tr2", and bare "Nam 45 nữ 35" / "Phí: 45" (thousands). */
export function parsePrices(text: string): number[] {
  const t = strip(text);
  const out: number[] = [];
  const re = /(\d{1,3}(?:[.,]\d{3})+|\d+(?:[.,]\d+)?)\s*(k|nghin|ngan|tr|trieu|d|vnd|dong)?(\d)?/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(t))) {
    const [all, numRaw, unit, trailing] = m;
    const after = t.slice(m.index + all.length, m.index + all.length + 8);
    if (/^\s*(?:kg|ti\b|%|\/\s*1?\s*qua)/.test(after)) continue; // string tension, shuttle price
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
  // bare thousands after a fee label: "Phí: 45", "Nam 55", "Nữ 50", "Thiệt hại: 40"
  const bare = /\b(?:phi|nam|nu|gia|thiet hai|moi nguoi)\s*[:\-]?\s*(\d{2,3})(?![\d.,]*[ \t]*(?:k|h|g|:|nam|nu|ng\b|nguoi|ban|slot|\/|%|kg|ti\b|u\b|san))/g;
  while ((m = bare.exec(t))) {
    const n = Number(m[1]);
    if (n >= 15 && n <= 300) out.push(n * 1000);
  }
  return [...new Set(out)];
}

/** Remove "sẵn 4 nam 2 nữ", "đánh tổng 6 nam", "max sân 8" — people already there, not wanted. */
function dropAlreadyHave(lc: string): string {
  return lc.replace(
    /(?:sẵn|có sẵn|đã có|đang có|hiện (?:mới )?có|mới có|đánh tổng|tổng|max(?:\s*sân)?|tối đa)\s*(?:[^.\n,)(]{0,12}?)(?:\d+\s*(?:nam|nữ|ng(?![\p{L}])|người)[\s,&+/]*(?:và\s*)?)+/gu,
    " ",
  );
}

function countFor(t: string, word: "nam" | "nu"): number | null {
  const m = t.match(new RegExp(`(?<![\\d:h.,])(\\d{1,2})\\s*(?:ban\\s*)?${word}\\b`));
  const n = m ? Number(m[1]) : null;
  return n !== null && n >= 1 && n <= 8 ? n : null;
}

const VENUE_STOP =
  "nam|nữ|số|thứ|trống|nào|cho|lúc|tối|sáng|chiều|mai|hôm|ngày|giờ|ở|tại|này|đó|kia|ib|inbox|full|sẵn|đẹp|thảm|gỗ|max|mình|bạn|liền|nhé|nha|của|có|thì|là|và|đánh|chơi|\\d";

const titleCase = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Venue + address from labelled lines ("Địa điểm: …", "Sân: …") or an inline "sân Tên Sân". */
function venueAndAddress(text: string): { venue: string | null; address: string | null } {
  const src = text.normalize("NFC");
  const lc = src.toLowerCase();
  const label = (re: RegExp) => {
    const m = re.exec(lc);
    return m ? src.slice(m.index + m[0].length - m[1].length, m.index + m[0].length).trim() : null;
  };
  const placeLine = label(/(?:địa điểm|tọa độ|toạ độ|(?:^|\n)\s*sân)\s*:\s*([^\n]{3,80})/u);
  const addrLine = label(/(?:địa chỉ|đ\/c|(?:^|[^\p{L}])đc)\s*:\s*([^\n]{3,80})/u);

  let venue: string | null = null;
  let address: string | null = null;
  const splitPlace = (s: string) => {
    const [head, ...rest] = s.split(/\s+-\s+|\s*\(\s*|,\s*/);
    const tail = rest.join(", ").replace(/\s*\)\s*\.?$/, "").trim();
    return { head: head.replace(/[)\s.]+$/, "").trim(), rest: tail || null };
  };

  const inline = new RegExp(
    `(?:^|[^\\p{L}])(${COURT}\\s+(?!(?:${VENUE_STOP})(?![\\p{L}]))[^\\s,.\\n(:]+(?:\\s+(?!\\d|tầng|lúc|từ|ngày|tối|sáng|chiều|hôm|thứ|có|cho|nha|nhé|-)[^\\s,.\\n(:]+){0,3})`,
    "u",
  ).exec(lc);

  if (placeLine && !/^\d/.test(placeLine)) {
    const { head, rest } = splitPlace(placeLine);
    venue = head;
    address = rest;
  } else if (inline) {
    const start = inline.index + inline[0].length - inline[1].length;
    venue = src.slice(start, start + inline[1].length).replace(/-\S*$/, "").trim();
  }
  if (addrLine) {
    const { head, rest } = splitPlace(addrLine);
    if (/^sân/i.test(head)) {
      venue ??= head;
      address = rest;
    } else {
      address = addrLine.replace(/\s*\)\s*$/, "");
      venue ??= head;
    }
  }
  return { venue: venue ? titleCase(venue).slice(0, 60) : null, address: address ? address.slice(0, 120) : null };
}

export function heuristicExtract(text: string): Extraction {
  const lc = lower(text);
  const t = strip(text);
  const type = classify(text);
  const prices = parsePrices(text);
  const { venue, address } = venueAndAddress(text);

  const timeMatch = t.match(/(\d{1,2}\s*[h:]\s*\d{0,2}|\d{1,2})\s*(?:-|den|toi|->|~)\s*(\d{1,2}\s*[h:]\s*\d{0,2})/);
  const dateMatch = lc.match(
    /(?:thứ\s*[2-7]|t[2-7](?![\p{L}\d])|chủ nhật|cn(?![\p{L}])|hôm nay|tối nay|khuya nay|sáng nay|chiều nay|ngày mai|tối mai|sáng mai)(?:\s*\(?\d{1,2}\/\d{1,2}\)?)?|\d{1,2}\/\d{1,2}(?:\/\d{2,4})?/u,
  );
  const phoneMatch = text.match(/(?:\+?84|0)(?:[\s.]?\d){9}/);
  const phone = phoneMatch ? phoneMatch[0].replace(/[\s.]/g, "") : null;

  const wanted = strip(dropAlreadyHave(lc));
  const male = countFor(wanted, "nam");
  const female = countFor(wanted, "nu");
  const totalMatch = wanted.match(/(?<![\d:h.,])(\d{1,2})\s*(?:slot|sl\b|ban|nguoi|vl\b|vang lai)/);
  const totalRaw = totalMatch ? Number(totalMatch[1]) : null;
  const total =
    totalRaw && totalRaw <= 10 ? totalRaw : male !== null || female !== null ? (male ?? 0) + (female ?? 0) : null;
  const wantsPeople = type === "tuyen_vang_lai" || type === "tim_nhom";

  const levelMatch = t.match(
    /(?:trinh|tr)\s*(?:do)?\s*[:\-]?\s*(yeu|tb\s?(?:yeu|kha)|tb[+-]?|trung binh(?: kha| yeu)?|kha|gioi|y\+|tby[+-]?|tbk)(?=[\s,.;)/]|$)|\b(tb[+-]|tby[+-]?|tbk|y\+)(?=[\s,.;)/]|$)/,
  );

  return {
    type,
    venueName: venue,
    address,
    priceText: prices.length ? prices.map((p) => `${p / 1000}k`).join(", ") : null,
    priceVnd: prices.length ? Math.min(...prices) : null,
    playDate: dateMatch ? dateMatch[0] : null,
    playTime: timeMatch ? `${timeMatch[1].replace(/\s/g, "")}-${timeMatch[2].replace(/\s/g, "")}` : null,
    playDateISO: null, // resolved by resolveSchedule()
    startTime: null,
    endTime: null,
    district: detectDistrict(address, venue, text),
    slotsTotal: wantsPeople ? total : null,
    slotsMale: wantsPeople ? male : null,
    slotsFemale: wantsPeople ? female : null,
    level: levelMatch ? (levelMatch[1] ?? levelMatch[2]).toUpperCase() : null,
    phone,
    zalo: /zalo|\bzl\b/.test(t) && phone ? phone : null,
  };
}
