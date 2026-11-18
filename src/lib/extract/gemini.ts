import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import { ExtractionSchema, type Extraction } from "../types";
import { vnParts } from "../vn-time";

const SYSTEM_PROMPT = `Bạn là bộ trích xuất dữ liệu cho bài đăng trong các nhóm Facebook cầu lông ở Đà Nẵng.
Phân loại bài viết (type):
- "tuyen_vang_lai": nhóm/người đăng đã có sân, tuyển thêm người chơi vãng lai (giao lưu).
- "pass_san": người đăng nhượng/pass lại sân (hoặc giờ sân) đã đặt.
- "tim_nhom": người chơi (1 người hoặc vài người) đang tìm kèo/nhóm để xin vào chơi cùng.
- "tim_san": người đăng cần thuê/tìm một sân trống (kể cả hỏi "ai có sân pass lại cho mình").
- "other": mọi thứ khác — đặc biệt bài pass/bán/mua/tìm/trade VỢT, GIÀY, CƯỚC, ÁO, BALO, đồ dùng (kể cả có chữ "pass" hay "tuyển"), giải đấu, quảng cáo, tâm sự, hỏi đáp.
Lưu ý: chỉ là "pass_san" khi thứ được pass là SÂN/GIỜ SÂN. "Pass arc 11", "pass 700 tour", "tuyển giày size 40" là "other".
Quy tắc:
- Chỉ dùng thông tin có trong bài; không bịa. Trường nào không có thì để null.
- "k" = nghìn đồng (50k = 50000). "1tr2" = 1.200.000.
- slotsTotal/slotsMale/slotsFemale: với tuyen_vang_lai là số người CÒN CẦN THÊM; "sẵn 4 nam 2 nữ", "đánh tổng 6 nam", "max sân 8" là người đã có, KHÔNG tính. Với tim_nhom là số người của nhóm đang đi tìm.
- "sẵn" (đã có) khác "sân" (court). Tên sân là cụm sau chữ "sân"/"Địa điểm:", ví dụ "Sân Phúc Đăng", "Sân ForFun Badminton".
- Giá ghi trơn như "Nam 55 nữ 45", "Phí: 45" là nghìn đồng (55000). Giá cầu "27k/quả" không phải giá chơi.
- playDateISO: quy đổi "tối nay", "mai", "thứ 7", "CN", "16/11" thành YYYY-MM-DD dựa vào NGÀY ĐĂNG được cho trước (giờ Việt Nam). "Thứ X" là lần gần nhất tính từ ngày đăng (kể cả chính ngày đăng).
- startTime/endTime dạng HH:MM 24h; "7h-9h tối" = 19:00-21:00. Không có giờ kết thúc thì để null.
- district: chọn quận/huyện Đà Nẵng của sân nếu suy ra được chắc chắn từ tên sân/địa chỉ, ngược lại null.
- Địa chỉ: giữ nguyên văn, thêm "Đà Nẵng" nếu bài không ghi thành phố.`;

let client: GoogleGenAI | null = null;

export function geminiEnabled() {
  return Boolean(process.env.GEMINI_API_KEY);
}

const WD = ["Chủ nhật", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"];

export async function geminiExtract(text: string, postedAt: number): Promise<Extraction> {
  client ??= new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const p = vnParts(postedAt);
  const posted = `${p.y}-${String(p.m).padStart(2, "0")}-${String(p.d).padStart(2, "0")} ${String(p.hour).padStart(2, "0")}:${String(p.minute).padStart(2, "0")} (${WD[p.weekday]})`;
  const res = await client.models.generateContent({
    model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
    contents: `NGÀY ĐĂNG: ${posted}\n\nBÀI VIẾT:\n${text.slice(0, 4000)}`,
    config: {
      systemInstruction: SYSTEM_PROMPT,
      temperature: 0,
      responseMimeType: "application/json",
      responseJsonSchema: z.toJSONSchema(ExtractionSchema),
    },
  });
  return ExtractionSchema.parse(JSON.parse(res.text ?? "{}"));
}
