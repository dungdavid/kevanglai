import { z } from "zod";

/** Raw post as collected by the local scraper (before AI extraction). */
export const RawPostSchema = z.object({
  fbPostId: z.string().min(1),
  postUrl: z.string().url(),
  groupId: z.string().min(1),
  groupName: z.string().optional().default(""),
  authorName: z.string().optional().default(""),
  authorUrl: z.string().optional().default(""),
  text: z.string().min(1),
  reactions: z.number().int().nonnegative().optional().default(0),
  comments: z.number().int().nonnegative().optional().default(0),
  shares: z.number().int().nonnegative().optional().default(0),
  postedAt: z.string().optional(), // ISO string if the scraper could resolve it
});
export type RawPost = z.infer<typeof RawPostSchema>;

export const IngestBodySchema = z.object({
  posts: z.array(RawPostSchema).max(200),
});

export const GroupSchema = z.object({
  id: z.string().min(1),
  name: z.string().default(""),
  url: z.string().url(),
  memberCount: z.number().int().nonnegative().optional(),
  privacy: z.enum(["public", "private", "unknown"]).optional().default("unknown"),
});
export type Group = z.infer<typeof GroupSchema>;

export const PostTypeSchema = z.enum(["tuyen_vang_lai", "pass_san", "tim_nhom", "tim_san", "other"]);
export type PostType = z.infer<typeof PostTypeSchema>;

/** What the extractor (AI or heuristic) pulls out of a post. */
export const ExtractionSchema = z.object({
  type: PostTypeSchema.describe(
    "tuyen_vang_lai = nhóm tuyển thêm người chơi vãng lai; pass_san = nhượng/pass lại sân đã đặt; tim_nhom = người chơi tìm nhóm/kèo để tham gia; tim_san = cần thuê/tìm sân trống; other = không liên quan (bán vợt, quảng cáo…)",
  ),
  venueName: z.string().nullable().describe("Tên sân cầu lông, ví dụ 'Sân Tiên Sơn'"),
  address: z.string().nullable().describe("Địa chỉ sân càng đầy đủ càng tốt, kèm quận/phường nếu có"),
  priceText: z.string().nullable().describe("Giá nguyên văn trong bài, ví dụ '50k/nam, 40k/nữ'"),
  priceVnd: z.number().int().nullable().describe("Giá thấp nhất quy ra VND cho 1 người (vãng lai) hoặc cho cả sân (pass sân)"),
  playDate: z.string().nullable().describe("Ngày chơi nguyên văn, ví dụ 'Thứ 7 16/11' hoặc 'tối nay'"),
  playTime: z.string().nullable().describe("Khung giờ nguyên văn, ví dụ '19h-21h'"),
  playDateISO: z.string().nullable().describe("Ngày chơi đã quy đổi dạng YYYY-MM-DD theo giờ Việt Nam, dựa vào ngày đăng bài; null nếu bài không nói ngày/giờ"),
  startTime: z.string().nullable().describe("Giờ bắt đầu dạng HH:MM (24h), ví dụ '19:00'"),
  endTime: z.string().nullable().describe("Giờ kết thúc dạng HH:MM (24h)"),
  district: z
    .enum(["hai_chau", "thanh_khe", "son_tra", "ngu_hanh_son", "lien_chieu", "cam_le", "hoa_vang"])
    .nullable()
    .describe("Quận/huyện của sân ở Đà Nẵng nếu xác định được"),
  slotsTotal: z.number().int().nullable().describe("Tổng số người cần tuyển (chỉ với tuyen_vang_lai)"),
  slotsMale: z.number().int().nullable().describe("Số nam cần tuyển"),
  slotsFemale: z.number().int().nullable().describe("Số nữ cần tuyển"),
  level: z.string().nullable().describe("Trình độ yêu cầu, ví dụ 'TB', 'TB+', 'khá'"),
  phone: z.string().nullable().describe("Số điện thoại liên hệ nếu có"),
  zalo: z.string().nullable().describe("Số hoặc link Zalo nếu bài ghi rõ là Zalo"),
});
export type Extraction = z.infer<typeof ExtractionSchema>;

/** Row in the `posts` table (snake_case, as stored in Supabase). */
export interface PostRow {
  id: string;
  fb_post_id: string;
  post_url: string;
  group_id: string;
  group_name: string | null;
  author_name: string | null;
  author_url: string | null;
  raw_text: string;
  reactions: number;
  comments: number;
  shares: number;
  engagement_score: number;
  posted_at: string | null;
  type: PostType;
  venue_name: string | null;
  address: string | null;
  maps_url: string | null;
  price_text: string | null;
  price_vnd: number | null;
  play_date: string | null;
  play_time: string | null;
  slots_total: number | null;
  slots_male: number | null;
  slots_female: number | null;
  level: string | null;
  phone: string | null;
  zalo: string | null;
  district: string | null;
  play_start: string | null;
  play_end: string | null;
  level_rank: number | null;
  extractor: string;
  created_at: string;
  updated_at: string;
}
