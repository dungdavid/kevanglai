import { describe, expect, it } from "vitest";
import { bucketOf, hhmm, scheduleLabel, vnParts, vnTime } from "../vn-time";
import { detectDistrict, levelRank } from "./district";
import { classify, heuristicExtract } from "./heuristic";
import { resolveSchedule } from "./schedule";

// Tuesday 17/11/2026 16:50 in Vietnam
const POSTED = vnTime(2026, 11, 17, 16, 50);
const at = (ts: number | null) => {
  if (ts === null) return null;
  const p = vnParts(ts);
  return `${p.d}/${p.m} ${hhmm(ts)}`;
};

describe("resolveSchedule", () => {
  it("tối nay 19h-21h", () => {
    const s = resolveSchedule("Tuyển 2 nữ tối nay 19h-21h sân Tiên Sơn", POSTED);
    expect(at(s.start)).toBe("17/11 19:00");
    expect(at(s.end)).toBe("17/11 21:00");
  });
  it("PM inference: 7h-9h tối", () => {
    const s = resolveSchedule("Mai 7h-9h tối cần 1 nam", POSTED);
    expect(at(s.start)).toBe("18/11 19:00");
    expect(at(s.end)).toBe("18/11 21:00");
  });
  it("weekday: thứ 7 (next Saturday)", () => {
    const s = resolveSchedule("Pass sân thứ 7 17:00-19:00", POSTED);
    expect(at(s.start)).toBe("21/11 17:00");
  });
  it("CN and explicit date", () => {
    expect(at(resolveSchedule("CN 6h-8h", POSTED).start)).toBe("22/11 06:00");
    expect(at(resolveSchedule("Ngày 25/11 lúc 19h30", POSTED).start)).toBe("25/11 19:30");
  });
  it("no date or time → null", () => {
    expect(resolveSchedule("Ai có vợt cũ bán không", POSTED).start).toBeNull();
  });
});

describe("classify 4 types", () => {
  it("tìm nhóm", () => expect(classify("Mình nữ trình TB, tối nay xin ghép kèo ở Hải Châu ạ")).toBe("tim_nhom"));
  it("tìm sân", () => expect(classify("Cần thuê sân tối mai 19h khu Thanh Khê, ai có sân pass lại cho mình")).toBe("tim_san"));
  it("tuyển vãng lai", () => expect(classify("Tuyển 2 nam 1 nữ vãng lai sân Chi Lăng")).toBe("tuyen_vang_lai"));
  it("pass sân", () => expect(classify("Pass 1 sân Hòa Xuân 18h-20h giá 120k")).toBe("pass_san"));
});

describe("venue names", () => {
  it("ignores 'sân thứ 7' / 'sân trống'", () => {
    expect(heuristicExtract("Cần thuê sân thứ 7 6h-8h sáng khu Sơn Trà").venueName).toBeNull();
    expect(heuristicExtract("Pass sân Hòa Xuân 18h").venueName).toBe("Sân Hòa Xuân");
  });
});

describe("district + level + labels", () => {
  it("detects district from area names", () => {
    expect(detectDistrict("Sân Hòa Xuân")).toBe("cam_le");
    expect(detectDistrict(null, "Sân Tiên Sơn")).toBe("hai_chau");
    expect(detectDistrict("123 Nguyễn Văn Linh, Thanh Khê")).toBe("thanh_khe");
    expect(detectDistrict("Sân ABC")).toBeNull();
  });
  it("ranks levels", () => {
    expect(levelRank("TB-")).toBe(2);
    expect(levelRank("TB")).toBe(3);
    expect(levelRank("TB+")).toBe(4);
    expect(levelRank("Khá")).toBe(5);
  });
  it("labels relative day and buckets", () => {
    const now = vnTime(2026, 11, 17, 10, 0);
    const s = new Date(vnTime(2026, 11, 17, 19, 0)).toISOString();
    const e = new Date(vnTime(2026, 11, 17, 21, 0)).toISOString();
    expect(scheduleLabel(s, e, now)).toBe("Tối nay · 19:00–21:00");
    expect(bucketOf(19)).toBe("evening");
    expect(bucketOf(6)).toBe("morning");
  });
});
