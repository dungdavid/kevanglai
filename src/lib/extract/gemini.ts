import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import { ExtractionSchema, type Extraction } from "../types";

const SYSTEM_PROMPT = `Bạn là bộ trích xuất dữ liệu cho bài đăng trong các nhóm Facebook cầu lông ở Đà Nẵng.
Phân loại bài viết:
- "pass_san": người đăng nhượng/pass lại sân (hoặc giờ sân) đã đặt cho người khác.
- "tuyen_vang_lai": người đăng tìm/tuyển thêm người chơi vãng lai (giao lưu) vào nhóm của họ.
- "other": bán vợt, quảng cáo, hỏi đáp, tìm sân... không thuộc 2 loại trên.
Quy tắc:
- Chỉ dùng thông tin có trong bài; không bịa. Trường nào không có thì để null.
- "k" = nghìn đồng (50k = 50000). "1tr2" = 1.200.000.
- slotsTotal = tổng số người cần; nếu chỉ ghi số nam và nữ thì cộng lại.
- Địa chỉ: giữ nguyên văn, thêm "Đà Nẵng" nếu bài không ghi thành phố.`;

let client: GoogleGenAI | null = null;

export function geminiEnabled() {
  return Boolean(process.env.GEMINI_API_KEY);
}

export async function geminiExtract(text: string): Promise<Extraction> {
  client ??= new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const res = await client.models.generateContent({
    model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
    contents: text.slice(0, 4000),
    config: {
      systemInstruction: SYSTEM_PROMPT,
      temperature: 0,
      responseMimeType: "application/json",
      responseJsonSchema: z.toJSONSchema(ExtractionSchema),
    },
  });
  return ExtractionSchema.parse(JSON.parse(res.text ?? "{}"));
}
