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

export const PostTypeSchema = z.enum(["pass_san", "tuyen_vang_lai", "other"]);
export type PostType = z.infer<typeof PostTypeSchema>;

/** What the extractor (AI or heuristic) pulls out of a post. */
export const ExtractionSchema = z.object({
  type: PostTypeSchema.describe(
    "pass_san = nhượng/pass lại sân đã đặt; tuyen_vang_lai = tìm/tuyển người chơi vãng lai; other = không liên quan",
  ),
  venueName: z.string().nullable().describe("Tên sân cầu lông, ví dụ 'Sân Tiên Sơn'"),
  address: z.string().nullable().describe("Địa chỉ sân càng đầy đủ càng tốt, kèm quận/phường nếu có"),
  priceText: z.string().nullable().describe("Giá nguyên văn trong bài, ví dụ '50k/nam, 40k/nữ'"),
  priceVnd: z.number().int().nullable().describe("Giá thấp nhất quy ra VND cho 1 người (vãng lai) hoặc cho cả sân (pass sân)"),
  playDate: z.string().nullable().describe("Ngày chơi nguyên văn, ví dụ 'Thứ 7 16/11' hoặc 'tối nay'"),
  playTime: z.string().nullable().describe("Khung giờ, ví dụ '19h-21h'"),
  slotsTotal: z.number().int().nullable().describe("Tổng số người cần tuyển (chỉ với tuyen_vang_lai)"),
  slotsMale: z.number().int().nullable().describe("Số nam cần tuyển"),
  slotsFemale: z.number().int().nullable().describe("Số nữ cần tuyển"),
  level: z.string().nullable().describe("Trình độ yêu cầu, ví dụ 'TB', 'TB+', 'khá'"),
  phone: z.string().nullable().describe("Số điện thoại/Zalo liên hệ nếu có"),
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
  extractor: string;
  created_at: string;
  updated_at: string;
}
