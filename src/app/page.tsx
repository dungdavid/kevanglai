import { Suspense } from "react";
import { Filters } from "@/components/Filters";
import { PostCard } from "@/components/PostCard";
import { demoPosts } from "@/lib/demo";
import { listPosts, parseFilters } from "@/lib/queries";
import { supabaseConfigured } from "@/lib/supabase";
import { requestTime } from "@/lib/time";
import { connection } from "next/server";

type SP = Record<string, string | string[] | undefined>;

async function Results({ searchParams }: { searchParams: Promise<SP> }) {
  const filters = parseFilters(await searchParams);

  await connection();
  const now = requestTime();
  let posts: Awaited<ReturnType<typeof listPosts>> = [];
  let error: string | null = null;
  if (supabaseConfigured) {
    try {
      posts = await listPosts(filters);
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    }
  } else {
    posts = demoPosts(filters, now);
  }

  return (
    <>
      {!supabaseConfigured && (
        <p className="mb-4 rounded-xl border border-shuttle/60 bg-shuttle/15 px-4 py-3 text-sm">
          Đang hiển thị <strong>dữ liệu mẫu</strong> — chưa cấu hình <code>SUPABASE_URL</code> / <code>SUPABASE_ANON_KEY</code>.
        </p>
      )}
      <Filters filters={filters} />
      <p className="mt-4 text-sm text-muted">{error ? `Lỗi tải dữ liệu: ${error}` : `${posts.length} kèo phù hợp`}</p>
      {posts.length === 0 && !error ? (
        <p className="mt-6 rounded-xl border border-dashed border-line p-10 text-center text-muted">
          Chưa có kèo nào khớp bộ lọc. Thử mở rộng thời gian hoặc bỏ bớt điều kiện.
        </p>
      ) : (
        <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((p) => (
            <PostCard key={p.id} post={p} now={now} />
          ))}
        </div>
      )}
    </>
  );
}

function ResultsSkeleton() {
  return (
    <div className="space-y-3">
      <div className="h-11 animate-pulse rounded-xl bg-card ring-1 ring-line" />
      <div className="h-16 animate-pulse rounded-xl bg-card/60" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="h-64 animate-pulse rounded-2xl bg-card ring-1 ring-line" />
        ))}
      </div>
    </div>
  );
}

export default function Home({ searchParams }: PageProps<"/">) {
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:py-10">
      <header className="mb-6">
        <p className="text-sm font-semibold uppercase tracking-wider text-court">🏸 Đà Nẵng</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">Kèo Vãng Lai</h1>
        <p className="mt-2 max-w-2xl text-muted">
          Tổng hợp bài <strong>tuyển vãng lai</strong> và <strong>pass sân</strong> cầu lông từ các nhóm Facebook ở Đà Nẵng —
          lọc theo giá, số nam/nữ còn thiếu và khu vực.
        </p>
      </header>
      <Suspense fallback={<ResultsSkeleton />}>
        <Results searchParams={searchParams} />
      </Suspense>
      <footer className="mt-12 border-t border-line pt-4 text-xs text-muted">
        Dữ liệu được trích xuất tự động từ bài đăng công khai trong nhóm — có thể sai sót, hãy kiểm tra bài gốc trước khi đi.
      </footer>
    </main>
  );
}
