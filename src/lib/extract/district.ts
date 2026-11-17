import { strip } from "./text";

export const DISTRICTS = {
  hai_chau: "Hải Châu",
  thanh_khe: "Thanh Khê",
  son_tra: "Sơn Trà",
  ngu_hanh_son: "Ngũ Hành Sơn",
  lien_chieu: "Liên Chiểu",
  cam_le: "Cẩm Lệ",
  hoa_vang: "Hòa Vang",
} as const;
export type District = keyof typeof DISTRICTS;
export const DISTRICT_IDS = Object.keys(DISTRICTS) as District[];

/** District names first (most reliable), then well-known wards/areas inside each district. */
const RULES: [District, RegExp][] = [
  ["hai_chau", /hai chau/],
  ["thanh_khe", /thanh khe/],
  ["son_tra", /son tra/],
  ["ngu_hanh_son", /ngu hanh son|\bnhs\b/],
  ["lien_chieu", /lien chieu/],
  ["cam_le", /cam le/],
  ["hoa_vang", /hoa vang/],
  // wards / areas
  ["hai_chau", /tien son|hoa cuong|binh hien|binh thuan|thach thang|phuoc ninh|hai chau [12]|nam duong|thuan phuoc/],
  ["thanh_khe", /an khe|chinh gian|tam thuan|thac gian|xuan ha|vinh trung|thanh khe (dong|tay)/],
  ["son_tra", /an hai|phuoc my|man thai|nai hien|tho quang/],
  ["ngu_hanh_son", /my an|khue my|hoa hai|hoa quy/],
  ["lien_chieu", /hoa khanh|hoa minh|hoa hiep/],
  ["cam_le", /hoa xuan|khue trung|hoa tho|hoa an|hoa phat/],
  ["hoa_vang", /hoa tien|hoa phong|hoa chau|hoa nhon/],
];

export function detectDistrict(...texts: (string | null | undefined)[]): District | null {
  const t = strip(texts.filter(Boolean).join(" "));
  for (const [id, re] of RULES) if (re.test(t)) return id;
  return null;
}

export function asDistrict(v: unknown): District | null {
  return typeof v === "string" && v in DISTRICTS ? (v as District) : null;
}

/** Badminton level → rank for filtering: 1 Yếu … 6 Giỏi. */
export const LEVELS = [
  { rank: 1, label: "Yếu / mới chơi" },
  { rank: 2, label: "TB Yếu" },
  { rank: 3, label: "Trung bình" },
  { rank: 4, label: "TB+" },
  { rank: 5, label: "Khá" },
  { rank: 6, label: "Giỏi" },
] as const;

export function levelRank(level: string | null | undefined): number | null {
  if (!level) return null;
  const t = strip(level).replace(/\s+/g, "");
  if (/gioi|pro/.test(t)) return 6;
  if (/kha|tbk/.test(t)) return 5;
  if (/tb\+|trungbinh\+|tbkha/.test(t)) return 4;
  if (/tby|tb-|tbyeu|y\+/.test(t)) return 2;
  if (/tb|trungbinh/.test(t)) return 3;
  if (/yeu|moi|newbie/.test(t)) return 1;
  return null;
}
