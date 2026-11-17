import Link from "next/link";
import { districtLabel, initials, postTags, priceUnit, TAG_TONE, timeAgo, typeMeta, vnd } from "@/lib/labels";
import type { PostRow } from "@/lib/types";
import { scheduleLabel } from "@/lib/vn-time";

export function PinIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z" />
      <circle cx="12" cy="9.5" r="2.5" />
    </svg>
  );
}

export function PostCard({ post, now }: { post: PostRow; now: number }) {
  const meta = typeMeta(post.type);
  const when = scheduleLabel(post.play_start, post.play_end, now) ?? (post.play_time || post.play_date || "Chưa rõ giờ");
  const place = [post.venue_name ?? (post.address ? null : "Chưa rõ sân"), districtLabel(post.district)].filter(Boolean).join(" · ");

  return (
    <article className="flex flex-col gap-3 rounded-[18px] border border-line bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <span className={`rounded-md px-2 py-1 text-[11px] font-bold ${meta.badge}`}>{meta.label}</span>
            <span className="text-xs text-muted">{timeAgo(post.posted_at ?? post.created_at, now)}</span>
          </div>
          <h3 className="text-[17px] font-bold leading-tight">{when}</h3>
          <p className="flex items-center gap-1.5 text-sm text-foreground/80">
            <PinIcon className="shrink-0 text-muted" />
            <span className="truncate">{place || post.address}</span>
          </p>
        </div>
        {post.price_vnd ? (
          <div className="shrink-0 text-right">
            <div className="text-[22px] font-extrabold tracking-tight text-court">{vnd(post.price_vnd)}</div>
            <div className="text-xs text-muted">{priceUnit(post)}</div>
          </div>
        ) : null}
      </div>

      {postTags(post).length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {postTags(post).map((t) => (
            <span key={t.label} className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${TAG_TONE[t.tone]}`}>{t.label}</span>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between gap-3 border-t border-line/70 pt-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-court/15 text-[13px] font-bold text-court">
            {initials(post.author_name)}
          </span>
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-[13px] font-semibold">{post.author_name || "Thành viên nhóm"}</span>
            <span className="truncate text-xs text-muted" title="Điểm tương tác = cảm xúc + 2×bình luận + 3×chia sẻ">
              ★ {post.engagement_score} điểm · {post.group_name}
            </span>
          </div>
        </div>
        <Link
          href={`/p/${post.id}`}
          className="flex h-10 shrink-0 items-center rounded-xl bg-court px-3.5 text-[13px] font-bold text-white hover:bg-court-dark"
        >
          Xem kèo
        </Link>
      </div>
    </article>
  );
}
