import { describe, expect, it } from "vitest";
import { hhmm, vnParts, vnTime } from "../vn-time";
import { classify, heuristicExtract } from "./heuristic";
import { resolveSchedule } from "./schedule";

/** Real posts from "Cộng đồng cầu lông Đà Nẵng" (17/11/2026) that the first version got wrong. */
const CASES: [string, string][] = [
  // gear, not a court
  ["other", "Có ai pass arc 11 tour ko quan trọng ngoại hình hoặc trade với 11 pro cũ không ạ, em cảm ơn"],
  ["other", "em cần pass 700 tour lmt chỉ mới bóc cốt - chưa lên cước lần nào - giá bay 2tr6 có fix nhanh gọn cho anh em ạ"],
  ["other", "Pass cho ae trải nghiệm\nVicleo Power 900\nCước 65ti 10,5kg\nGiá 250k"],
  ["other", "Cần tuyền giày giá dưới 1 tr size 40,41\nAi có cứ cmt ảnh nha mk chủ động liên hệ"],
  ["other", "kumpo k520 pro 99% 300k tặng cước apavi"],
  ["other", "Cho em hỏi sân uk tôn thất đạm có cho thuê vợt đánh không ạ"],
  ["other", "**NSL BADMINTON 2026 – CHỈ CÒN 01 TUẦN ĐỂ ĐĂNG KÝ!**\nĐôi nam: TB- đến TB cứng\nHạn đăng ký: 22/11/2026\nHẸN GẶP BẠN TẠI SÂN!"],
  // court pass
  ["pass_san", "Pass sân thứ 6 (20/11)\nsân 3 trường Đại học Sư phạm ĐN : 17h30 - 19h30\nPhí sân: 120k"],
  // players asking to join (hidden from the site)
  ["tim_nhom", "2 nam trình y tìm vl tối 17/11 19-21h ạ"],
  ["tim_nhom", "Tối nay (17/11) có team nào còn tuyển vãng lai nữ tb không ạ"],
  ["tim_nhom", "Tối nay 17/11 có team Tby+ Tb- nào đánh khuya 21h không cho mình xin 1 sl Nam ạ"],
  ["tim_nhom", "Tìm kèo vãng lai 1 nữ Yếu+ Tby-\nSân Avo, Lê Văn Hiến, Alpha, Beta còn team nào thiếu kèo ko mn ơi =)))\nCưu mang e với"],
  // recruiting
  ["tuyen_vang_lai", "Vì có 1 bạn huỷ nên còn 1 slot ạ\nNgày 17/11\nĐịa điểm : sân aurora\nThời gian: 19h30-21h30\nTrình: nữ : tb-\nPhí: 45\nCầu prx"],
  ["tuyen_vang_lai", "Còn slot 1 nữ và 1 nam tb-, tb (17/11)\nSân ĐH TDTT tầng 2 - 19h30-21h30\nNữ 50 \n Nam 55"],
  ["tuyen_vang_lai", "Gấp 2 slot Nam\ntby++/tb-\n14:00-16:30\npinpon"],
  ["tuyen_vang_lai", "tối nay có ai muốn tập cầu ko\nbên mình có 1 nam 3 nữ\nNewbie mới biết luật sơ sơ\nai đánh ib sân 19h30-21h30\nở Dũng Sỹ Thanh Khê"],
  ["tuyen_vang_lai", "TUYỂN VÃNG LAI NAM NỮ HÔM NAY THỨ 3 NGÀY 17/11\nSân sẵn 4 nam 2 nữ\nThời gian: 19-21h\nĐịa chỉ : Beta Nguyễn Tri Phương\nTrình độ: Nam nữ TB-\nPhí : Nam 50k nữ 40k"],
  ["tuyen_vang_lai", "Sẵn 2 nữ 1 nam cần tìm vl ngày mai 18/11 7h30 - 9h \nsáng 18/11 Nam nữ : Newbie hoặc Y\nSân Bế Văn Đàn nha Phí chia đều cuối buổi"],
];

describe("classify real posts", () => {
  it.each(CASES)("%s ← %s", (expected, text) => {
    expect(classify(text)).toBe(expected);
  });
});

describe("details from real posts", () => {
  it("'sẵn' is not 'sân' and already-present players are not wanted", () => {
    const r = heuristicExtract("thiếu 1 bạn nữ tối nay 17/11 ( sẵn 4nam, 3nữ)\nthời gian: 19:30-21:30\nđịa điểm: index sports sân số 1 - 12 trịnh công sơn\ntrình: Y+, tby");
    expect(r.slotsFemale).toBe(1);
    expect(r.slotsMale).toBeNull();
    expect(r.venueName).toBe("Index sports sân số 1");
    expect(r.address).toBe("12 trịnh công sơn");
  });
  it("venue names and bare fees", () => {
    const r = heuristicExtract("Gấp !!!\nteam mình cần tuyển 1 nam Tb-, TB\n19h30-21h30 sân Phúc Đăng (39 thanh lương 19)\nHÔM NAYYYY. phí 45k , cầu Pro X.");
    expect(r.venueName).toBe("Sân Phúc Đăng");
    expect(r.slotsMale).toBe(1);
    expect(r.priceVnd).toBe(45000);
    const s = heuristicExtract("Còn slot 1 nữ và 1 nam tb-, tb (17/11)\nSân ĐH TDTT tầng 2 - 19h30-21h30\nNữ 50 \n Nam 55");
    expect(s.venueName).toBe("Sân ĐH TDTT");
    expect(s.priceVnd).toBe(50000);
    expect(s.slotsFemale).toBe(1);
    expect(s.slotsMale).toBe(1);
  });
  it("labelled venue line wins", () => {
    const r = heuristicExtract("TUYỂN VÃNG LAI NAM/ NỮ TỐI T3 NGÀY 17/11\n Địa chỉ: Sân ACE ( 2A Hoà Nam 6 )\n Thời gian: 19:30 - 21:30");
    expect(r.venueName).toBe("Sân ACE");
    expect(r.address).toBe("2A Hoà Nam 6");
  });
  it("ignores shuttle price and caps silly counts", () => {
    const r = heuristicExtract("Tuyển VL khuya nay ngày 17/11\nThời gian: 21h30-23h30\nSân ForFun Badminton - 102 Hoàng Văn Thái\nPhí 20k/slot cầu chia đều\nCầu : ProX,27k/quả");
    expect(r.priceVnd).toBe(20000);
    expect(r.venueName).toBe("Sân ForFun Badminton");
    const s = heuristicExtract("sân nam nữ. sẵn 3 nữ, thêm 1 nữ tby\nThứ 3. 19h 21h. Tuyển vãng lai.\n1 sân max 8. Nam 45 nữ 35.");
    expect(s.slotsFemale).toBe(1);
    expect(s.slotsMale).toBeNull();
    expect(s.priceVnd).toBe(35000);
  });
});

describe("time ranges from real posts", () => {
  const POSTED = vnTime(2026, 11, 17, 9, 0);
  const at = (ts: number | null) => (ts === null ? null : `${vnParts(ts).d}/${vnParts(ts).m} ${hhmm(ts)}`);
  it("19-21h", () => {
    const s = resolveSchedule("2 nam trình y tìm vl tối 17/11 19-21h ạ", POSTED);
    expect(at(s.start)).toBe("17/11 19:00");
    expect(at(s.end)).toBe("17/11 21:00");
  });
  it("19h 21h (space separated)", () => {
    const s = resolveSchedule("Thứ 3. 19h 21h. Tuyển vãng lai", POSTED);
    expect(at(s.start)).toBe("17/11 19:00");
    expect(at(s.end)).toBe("17/11 21:00");
  });
  it("14:00-16:30 and 7h30 - 9h sáng mai", () => {
    expect(at(resolveSchedule("Gấp 2 slot Nam 14:00-16:30 pinpon", POSTED).start)).toBe("17/11 14:00");
    const m = resolveSchedule("cần tìm vl ngày mai 18/11 7h30 - 9h sáng", POSTED);
    expect(at(m.start)).toBe("18/11 07:30");
    expect(at(m.end)).toBe("18/11 09:00");
  });
  it("khuya nay 21h30-23h30", () => {
    expect(at(resolveSchedule("Tuyển VL khuya nay ngày 17/11 21h30-23h30", POSTED).start)).toBe("17/11 21:30");
  });
});
