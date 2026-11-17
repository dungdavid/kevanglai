import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { PinIcon } from "@/components/PostCard";
import { getDemoPost } from "@/lib/demo";
import { districtLabel, initials, postTags, TAG_TONE, timeAgo, typeMeta, vnd, zaloUrl } from "@/lib/labels";
import { getPost } from "@/lib/queries";
import { supabaseConfigured } from "@/lib/supabase";
import { requestTime } from "@/lib/time";
import { scheduleLabel } from "@/lib/vn-time";

function Stat({ value, label, tone }: { value: string; label: string; tone: string }) {
  return (
    <div className={`flex flex-col gap-0.5 rounded-2xl p-3 ${tone}`}>
      <span className="text-[22px] font-extrabold leading-none">{value}</span>
      <span className="text-xs font-semibold">{label}</span>
    </div>
  );
}

async function Detail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await connection();
  const now = requestTime();
  const post = supabaseConfigured ? await getPost(id) : getDemoPost(id, now);
  if (!post) notFound();

  const meta = typeMeta(post.type);
  const when = scheduleLabel(post.play_start, post.play_end, now) ?? (post.play_time || post.play_date || "Chưa rõ giờ");
  const district = districtLabel(post.district);
  const zalo = zaloUrl(post);
  const wantsPeople = post.type === "tuyen_vang_lai" || post.type === "tim_nhom";
  const peopleVerb = post.type === "tim_nhom" ? "trong nhóm" : "cần thêm";

  return (
    <>
      <section className="flex flex-col gap-4 rounded-[20px] border border-line bg-card p-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`rounded-md px-2 py-1 text-[11px] font-bold ${meta.badge}`}>{meta.label}</span>
          <span className="text-xs text-muted">
            Đăng {timeAgo(post.posted_at ?? post.created_at, now)} · {post.group_name}
          </span>
        </div>
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-extrabold leading-tight tracking-tight">{when}</h1>
          <p className="text-[15px] text-foreground/80">{[post.venue_name, district].filter(Boolean).join(", ") || post.address || "Chưa rõ sân"}</p>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {wantsPeople && (
            <>
              <Stat value={String(post.slots_female ?? 0)} label={`nữ ${peopleVerb}`} tone={TAG_TONE.pink} />
              <Stat value={String(post.slots_male ?? 0)} label={`nam ${peopleVerb}`} tone={TAG_TONE.blue} />
            </>
          )}
          {post.price_vnd ? (
            <Stat value={vnd(post.price_vnd)} label={post.price_text ?? ""} tone="bg-court/15 text-court" />
          ) : null}
        </div>
        {postTags(post).filter((t) => t.tone === "gray").length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {postTags(post)
              .filter((t) => t.tone === "gray")
              .map((t) => (
                <span key={t.label} className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${TAG_TONE[t.tone]}`}>{t.label}</span>
              ))}
          </div>
        )}
      </section>

      {(post.venue_name || post.address) && (
        <section className="flex items-center justify-between gap-3 rounded-[20px] border border-line bg-card p-4">
          <div className="flex min-w-0 items-start gap-2">
            <PinIcon className="mt-1 shrink-0 text-court" />
            <div className="flex min-w-0 flex-col">
              <span className="font-bold">{post.venue_name ?? "Địa điểm"}</span>
              <span className="text-sm text-muted">{post.address ?? district ?? "Đà Nẵng"}</span>
            </div>
          </div>
          {post.maps_url && (
            <a
              href={post.maps_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-10 shrink-0 items-center rounded-xl border border-line px-3.5 text-[13px] font-bold hover:border-court hover:text-court"
            >
              Chỉ đường
            </a>
          )}
        </section>
      )}

      <section className="flex flex-col gap-3 rounded-[20px] border border-line bg-card p-4">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-court/15 font-bold text-court">
            {initials(post.author_name)}
          </span>
          <div className="flex min-w-0 flex-col">
            <span className="font-bold">{post.author_name || "Thành viên nhóm"}</span>
            <span className="text-xs text-muted">
              ★ {post.engagement_score} điểm tương tác · {post.reactions} cảm xúc · {post.comments} bình luận · {post.shares} chia sẻ
            </span>
          </div>
        </div>
        <p className="whitespace-pre-line text-sm leading-relaxed text-foreground/85">{post.raw_text}</p>
        <p className="text-xs text-muted">Thông tin được đọc tự động từ bài viết. Hãy kiểm tra bài gốc trước khi đi.</p>
      </section>

      <div className="sticky bottom-0 -mx-4 flex gap-2 border-t border-line bg-card/95 px-4 py-3 backdrop-blur">
        <a
          href={post.author_url || post.post_url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex h-12 flex-1 items-center justify-center rounded-2xl bg-court text-[15px] font-bold text-white hover:bg-court-dark"
        >
          Nhắn chủ kèo
        </a>
        {zalo && (
          <a href={zalo} target="_blank" rel="noopener noreferrer" className="flex h-12 items-center rounded-2xl border border-line px-4 text-sm font-bold">
            Zalo
          </a>
        )}
        {post.phone && (
          <a href={`tel:${post.phone}`} className="flex h-12 items-center rounded-2xl border border-line px-4 text-sm font-bold">
            Gọi
          </a>
        )}
        <a href={post.post_url} target="_blank" rel="noopener noreferrer" className="flex h-12 items-center rounded-2xl border border-line px-4 text-sm font-bold">
          Bài gốc
        </a>
      </div>
    </>
  );
}

export default function PostPage({ params }: PageProps<"/p/[id]">) {
  return (
    <main className="mx-auto flex w-full min-w-0 max-w-2xl flex-1 flex-col gap-3 px-4 pt-3">
      <nav className="flex h-12 items-center">
        <Link href="/" className="flex h-11 items-center gap-1 rounded-xl pr-3 text-sm font-semibold text-muted hover:text-foreground">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M15 18l-6-6 6-6" />
          </svg>
          Danh sách kèo
        </Link>
      </nav>
      <Suspense fallback={<div className="h-72 animate-pulse rounded-[20px] bg-card ring-1 ring-line" />}>
        <Detail params={params} />
      </Suspense>
    </main>
  );
}
