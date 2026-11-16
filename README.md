# 🏸 Kèo Vãng Lai Đà Nẵng

Tổng hợp bài **tuyển vãng lai** và **pass sân** cầu lông từ các nhóm Facebook ở Đà Nẵng.

- **Pass sân**: địa điểm, giá, tài khoản Facebook người đăng, link bài viết, điểm tương tác, link Google Maps
- **Tuyển vãng lai**: số người cần (bao nhiêu nam, bao nhiêu nữ), giá, địa chỉ sân, link bài viết, điểm tương tác, link Google Maps

> Điểm tương tác = cảm xúc + 2 × bình luận + 3 × chia sẻ của bài viết.

## Kiến trúc

```
 Máy của bạn                                   Vercel (Next.js)                Supabase
┌──────────────────────────┐   POST /api/ingest   ┌──────────────────────┐    ┌──────────┐
│ scraper/ (Playwright)    │ ───────────────────▶ │ Trích xuất bằng      │ ─▶ │ posts    │
│ - phiên FB đã đăng nhập   │   Bearer INGEST_SECRET│ Gemini (fallback     │    │ groups   │
│ - discover: tìm nhóm     │ ◀─────────────────── │ regex)               │    └────┬─────┘
│ - crawl: đọc bài mới     │   GET /api/groups    │ Trang danh sách + lọc│ ◀──────┘
└──────────────────────────┘                      └──────────────────────┘
```

Facebook không có API để đọc bài trong nhóm, và Vercel không thể chạy trình duyệt đăng nhập Facebook,
nên phần thu thập chạy trên máy của bạn rồi đẩy dữ liệu lên web.

## 1. Database (Supabase)

1. Tạo 2 project trên [supabase.com](https://supabase.com): `kevanglai-prod` và `kevanglai-dev` (hoặc dùng chung 1 project).
2. Mở **SQL Editor** → chạy `supabase/migrations/0001_init.sql`.
3. Lấy `Project URL`, `anon key`, `service_role key` trong **Project Settings → API**.

## 2. Chạy web local

```bash
cp .env.example .env.local   # điền Supabase, INGEST_SECRET, GEMINI_API_KEY
npm install
npm run dev                  # http://localhost:3000 (không có Supabase → hiển thị dữ liệu mẫu)
npm test                     # unit test bộ trích xuất
```

## 3. Deploy Vercel: production + dev

| Môi trường | Nhánh git | URL |
|---|---|---|
| Production | `main` | `https://<project>.vercel.app` |
| Dev (Preview) | `dev` | `https://<project>-git-dev-<team>.vercel.app` |

1. Vercel → **Add New Project** → import repo GitHub này (framework Next.js tự nhận).
2. **Settings → Environment Variables**: thêm các biến trong `.env.example`
   - tick **Production** với giá trị của Supabase prod
   - tick **Preview** (giới hạn nhánh `dev`) với giá trị của Supabase dev
3. Push lên `main` → production; push lên `dev` → bản dev.

## 4. Scraper trên máy bạn

Nên dùng **tài khoản Facebook phụ** — Facebook có thể checkpoint/khóa tài khoản khi phát hiện tự động hóa.

```bash
cd scraper
cp .env.example .env         # API_BASE = URL Vercel (dev hoặc prod), INGEST_SECRET giống trên Vercel
npm install
npm run setup                # tải Chromium cho Playwright
npm run login                # mở trình duyệt → đăng nhập FB, tham gia các nhóm → đóng cửa sổ
npm run discover             # tìm các nhóm cầu lông Đà Nẵng và lưu lên web
npm run crawl                # đọc bài mới của các nhóm (1 lần)
npm run watch                # chạy lặp lại mỗi WATCH_INTERVAL_MINUTES phút
```

Tắt bớt nhóm không liên quan: trong Supabase, đặt `groups.enabled = false`.

Chạy định kỳ thay vì `watch`:
- **macOS/Linux** (`crontab -e`): `*/30 7-22 * * * cd /đường/dẫn/scraper && npm run crawl >> crawl.log 2>&1`
- **Windows**: Task Scheduler → chạy `npm run crawl` trong thư mục `scraper` mỗi 30 phút.

### Lưu ý

- Giao diện Facebook thay đổi thường xuyên; nếu số bài lấy được về 0, cần cập nhật selector trong `scraper/src/crawl.ts`.
- Giữ `MAX_GROUPS_PER_RUN` và tần suất ở mức thấp để tránh bị giới hạn.
- Việc thu thập tự động trái với điều khoản của Facebook — dùng cho mục đích cá nhân, không bán/chia sẻ lại dữ liệu cá nhân.

## Cấu trúc

```
src/app/page.tsx            Trang danh sách kèo + bộ lọc
src/app/api/ingest          Nhận bài từ scraper, trích xuất, lưu DB
src/app/api/groups          Danh sách nhóm cần crawl / lưu nhóm tìm được
src/lib/extract             Gemini + bộ luật regex tiếng Việt
supabase/migrations         Schema SQL
scraper/                    Playwright scraper chạy trên máy bạn (không deploy lên Vercel)
```
