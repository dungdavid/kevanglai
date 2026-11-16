import type { PostRow } from "@/lib/types";

const vnd = (n: number) => (n >= 1_000_000 ? `${(n / 1_000_000).toLocaleString("vi-VN")}tr` : `${Math.round(n / 1000)}k`);

function timeAgo(iso: string | null, now: number) {
  if (!iso) return null;
  const m = Math.max(0, Math.round((now - new Date(iso).getTime()) / 60000));
  if (m < 60) return `${m} phút trước`;
  if (m < 1440) return `${Math.round(m / 60)} giờ trước`;
  return `${Math.round(m / 1440)} ngày trước`;
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  if (children === null || children === undefined || children === "") return null;
  return (
    <div className="flex gap-2 text-sm">
      <dt className="w-20 shrink-0 text-muted">{label}</dt>
      <dd className="min-w-0 break-words">{children}</dd>
    </div>
  );
}

export function PostCard({ post, now }: { post: PostRow; now: number }) {
  const isPass = post.type === "pass_san";
  const slots =
    post.slots_total || post.slots_male || post.slots_female
      ? [
          post.slots_total ? `${post.slots_total} người` : null,
          post.slots_male ? `${post.slots_male} nam` : null,
          post.slots_female ? `${post.slots_female} nữ` : null,
        ]
          .filter(Boolean)
          .join(" · ")
      : null;

  return (
    <article className="flex flex-col rounded-2xl border border-line bg-card p-4 shadow-sm">
      <header className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <span
            className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${
              isPass ? "bg-shuttle/30 text-amber-900 dark:text-shuttle" : "bg-court/15 text-court"
            }`}
          >
            {isPass ? "Pass sân" : "Tuyển vãng lai"}
          </span>
          <h3 className="mt-1.5 truncate text-base font-semibold">{post.venue_name || post.address || "Chưa rõ sân"}</h3>
          <p className="truncate text-xs text-muted">
            {post.group_name} {timeAgo(post.posted_at ?? post.created_at, now) && `· ${timeAgo(post.posted_at ?? post.created_at, now)}`}
          </p>
        </div>
        {post.price_vnd ? (
          <div className="shrink-0 text-right">
            <div className="text-lg font-bold text-court">{vnd(post.price_vnd)}</div>
            <div className="text-[11px] text-muted">{isPass ? "giá sân" : "/người"}</div>
          </div>
        ) : null}
      </header>

      <dl className="space-y-1">
        {!isPass && <Row label="Cần">{slots}</Row>}
        <Row label="Thời gian">{[post.play_date, post.play_time].filter(Boolean).join(" · ") || null}</Row>
        <Row label="Giá">{post.price_text}</Row>
        <Row label="Trình độ">{post.level}</Row>
        <Row label="Địa chỉ">{post.address}</Row>
        <Row label="Liên hệ">{post.phone}</Row>
        <Row label="Người đăng">
          {post.author_url ? (
            <a href={post.author_url} target="_blank" rel="noopener noreferrer" className="font-medium text-court hover:underline">
              {post.author_name || "Facebook"}
            </a>
          ) : (
            post.author_name
          )}
          <span className="ml-2 text-xs text-muted" title="Điểm tương tác = cảm xúc + 2×bình luận + 3×chia sẻ">
            ★ {post.engagement_score} điểm ({post.reactions} 👍 · {post.comments} 💬)
          </span>
        </Row>
      </dl>

      <details className="mt-3 text-sm text-muted">
        <summary className="cursor-pointer select-none">Nội dung bài viết</summary>
        <p className="mt-2 whitespace-pre-line text-foreground/90">{post.raw_text}</p>
      </details>

      <footer className="mt-auto flex gap-2 pt-4">
        <a
          href={post.post_url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 rounded-lg bg-court px-3 py-2 text-center text-sm font-semibold text-white hover:bg-court-dark"
        >
          Xem bài Facebook
        </a>
        {post.maps_url && (
          <a
            href={post.maps_url}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg border border-line px-3 py-2 text-sm font-semibold hover:border-court hover:text-court"
          >
            Google Maps
          </a>
        )}
      </footer>
    </article>
  );
}
