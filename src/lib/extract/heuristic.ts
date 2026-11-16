import type { Extraction, PostType } from "../types";

/**
 * Rule-based extractor for Vietnamese badminton posts.
 * Used as a fallback when no AI key is configured or the AI call fails.
 */

const strip = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase();

const PASS_PATTERNS = [/\bpass\b/, /nhuong (lai )?san/, /nhuong lai/, /thanh ly san/, /du san/, /\bdu \d+ san/];
const RECRUIT_PATTERNS = [
  /vang lai/,
  /tuyen (them )?\d*\s*(nam|nu|nguoi|ban|vl)/,
  /tim (them )?\d*\s*(nam|nu|nguoi|ban|vl|giao luu)/,
  /can (them )?\d*\s*(nam|nu|nguoi|ban|vl)/,
  /thieu \d*\s*(nam|nu|nguoi|ban)/,
  /giao luu/,
  /\bgl\b/,
  /\bvl\b/,
  /\btuyen\b/,
];

export function classify(text: string): PostType {
  const t = strip(text);
  const pass = PASS_PATTERNS.some((p) => p.test(t));
  const recruit = RECRUIT_PATTERNS.some((p) => p.test(t));
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

const VENUE_RE = /(san\s+(?:cau long\s+)?[a-z0-9][a-z0-9 ]{1,30}?)(?=[,.\-\n(]|\s+(?:luc|tu|gio|\d+h|toi|sang|chieu|ngay)|$)/;

function originalSlice(text: string, normalized: string, match: RegExpMatchArray): string {
  // strip() keeps string length for NFC Vietnamese after removing combining marks only when
  // text is NFD; map indices on the NFD-stripped version of the original instead.
  const nfd = text.normalize("NFD");
  const idx = match.index ?? 0;
  let count = -1;
  let start = -1;
  let end = nfd.length;
  for (let i = 0; i < nfd.length; i++) {
    if (/[̀-ͯ]/.test(nfd[i])) continue;
    count++;
    if (count === idx) start = i;
    if (count === idx + match[0].length) {
      end = i;
      break;
    }
  }
  void normalized;
  return start < 0 ? match[0] : nfd.slice(start, end).normalize("NFC").trim();
}

export function heuristicExtract(text: string): Extraction {
  const t = strip(text);
  const type = classify(text);
  const prices = parsePrices(text);

  const venueMatch = t.match(VENUE_RE);
  const venueRaw = venueMatch ? originalSlice(text, t, venueMatch) : null;
  const venueName = venueRaw ? venueRaw.charAt(0).toUpperCase() + venueRaw.slice(1) : null;

  const addrMatch = t.match(/(?:^|[\s,.])(?:dia chi|dc)\s*[:\-]?\s*[^\n]{5,80}?(?=\.\s|\n|$)/);
  const address = addrMatch
    ? originalSlice(text, t, addrMatch).replace(/^[\s,.]*(địa chỉ|đc|dc)\s*[:\-]?\s*/i, "").trim()
    : null;

  const timeMatch = t.match(/(\d{1,2}\s*[h:]\s*\d{0,2})\s*(?:-|den|toi|->|~)\s*(\d{1,2}\s*[h:]\s*\d{0,2})/);
  const dateMatch = t.match(
    /(?:thu\s*[2-7]|chu nhat|\bcn\b|hom nay|toi nay|sang nay|chieu nay|ngay mai|toi mai)(?:\s+(?:nay|tuan nay|tuan sau|toi))?(?:\s*\(?\d{1,2}\/\d{1,2}\)?)?|\b\d{1,2}\/\d{1,2}(?:\/\d{2,4})?/,
  );
  const phoneMatch = text.match(/(?:\+?84|0)(?:[\s.]?\d){9}/);

  const male = countFor(t, "nam");
  const female = countFor(t, "nu");
  const totalMatch = t.match(/(\d+)\s*(?:nguoi|ban|slot|vl|vang lai)/);
  const total = totalMatch ? Number(totalMatch[1]) : male !== null || female !== null ? (male ?? 0) + (female ?? 0) : null;

  const levelMatch = t.match(/(?:trinh|tr)\s*(?:do)?\s*[:\-]?\s*(yeu|tb\s?(?:yeu|kha)|tb[+-]?|trung binh(?: kha| yeu)?|kha|gioi|y\+|tby|tbk)(?=[\s,.;)]|$)|\b(tb[+-]|tby|tbk|y\+)(?=[\s,.;)]|$)/);

  return {
    type,
    venueName,
    address,
    priceText: prices.length ? prices.map((p) => `${p / 1000}k`).join(", ") : null,
    priceVnd: prices.length ? Math.min(...prices) : null,
    playDate: dateMatch ? originalSlice(text, t, dateMatch) : null,
    playTime: timeMatch ? `${timeMatch[1].replace(/\s/g, "")}-${timeMatch[2].replace(/\s/g, "")}` : null,
    slotsTotal: type === "tuyen_vang_lai" ? total : null,
    slotsMale: type === "tuyen_vang_lai" ? male : null,
    slotsFemale: type === "tuyen_vang_lai" ? female : null,
    level: levelMatch ? (levelMatch[1] ?? levelMatch[2]).toUpperCase() : null,
    phone: phoneMatch ? phoneMatch[0].replace(/[\s.]/g, "") : null,
  };
}
