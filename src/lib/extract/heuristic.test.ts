import { describe, expect, it } from "vitest";
import { classify, heuristicExtract, parsePrices } from "./heuristic";
import { engagementScore, mapsUrl } from "./index";

describe("classify", () => {
  it("detects pass sân", () => {
    expect(classify("Pass lại 1 sân Tiên Sơn 19h-21h tối nay, giá 120k")).toBe("pass_san");
    expect(classify("Nhượng sân thứ 7 tại sân Hòa Xuân")).toBe("pass_san");
  });
  it("detects tuyển vãng lai", () => {
    expect(classify("Tuyển 2 nam 1 nữ vãng lai trình TB, sân Đại học TDTT")).toBe("tuyen_vang_lai");
    expect(classify("Team cần thêm 3 bạn giao lưu tối nay")).toBe("tuyen_vang_lai");
  });
  it("other", () => {
    expect(classify("Bán vợt Yonex Astrox 88D like new")).toBe("other");
  });
});

describe("parsePrices", () => {
  it("parses common formats", () => {
    expect(parsePrices("50k/nam, 40k/nữ")).toEqual([50000, 40000]);
    expect(parsePrices("giá 120.000đ")).toEqual([120000]);
    expect(parsePrices("pass 1tr2 cả tháng")).toEqual([1200000]);
  });
  it("ignores times and counts", () => {
    expect(parsePrices("19h-21h, 2 nam")).toEqual([]);
  });
});

describe("heuristicExtract", () => {
  it("extracts recruit info", () => {
    const r = heuristicExtract("Tuyển 2 nam 1 nữ vãng lai, sân Tiên Sơn, 19h-21h thứ 5, 50k/nam 40k/nữ. LH 0905 123 456");
    expect(r.type).toBe("tuyen_vang_lai");
    expect(r.slotsMale).toBe(2);
    expect(r.slotsFemale).toBe(1);
    expect(r.slotsTotal).toBe(3);
    expect(r.priceVnd).toBe(40000);
    expect(r.playTime).toBe("19h-21h");
    expect(r.venueName).toBe("sân Tiên Sơn");
    expect(r.phone).toBe("0905123456");
  });
});

describe("helpers", () => {
  it("builds maps url with city", () => {
    expect(mapsUrl("Sân Tiên Sơn", null)).toContain(encodeURIComponent("Sân Tiên Sơn, Đà Nẵng"));
    expect(mapsUrl(null, null)).toBeNull();
  });
  it("engagement score", () => {
    expect(engagementScore(10, 2, 1)).toBe(17);
  });
});
