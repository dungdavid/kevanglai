import { connection } from "next/server";
import { Suspense } from "react";
import { FilterBar } from "@/components/FilterBar";
import { PostCard } from "@/components/PostCard";
import { DateTabs, TypeTabs } from "@/components/Tabs";
import { demoPosts } from "@/lib/demo";
import { parseFilters, type Filters } from "@/lib/filters";
import { listPosts } from "@/lib/queries";
import { supabaseConfigured } from "@/lib/supabase";
import { requestTime } from "@/lib/time";

type SP = Record<string, string | string[] | undefined>;

async function Results({ searchParams }: { searchParams: Promise<SP> }) {
  const filters = parseFilters(await searchParams);
  await connection();
  const now = requestTime();

  let posts: Awaited<ReturnType<typeof listPosts>> = [];
  let error: string | null = null;
  if (supabaseConfigured) {
    try {
      posts = await listPosts(filters, now);
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    }
  } else {
    posts = demoPosts(filters, now);
  }

  return (
    <>
      <Controls filters={filters} />
      {!supabaseConfigured && (
        <p className="rounded-xl border border-shuttle/60 bg-shuttle/15 px-4 py-3 text-sm">
          Đang hiển thị <strong>dữ liệu mẫu</strong>: chưa cấu hình database.
        </p>
      )}
      <p className="text-sm text-muted" aria-live="polite">
        {error ? `Lỗi tải dữ liệu: ${error}` : `${posts.length} tin`}
      </p>
      {posts.length === 0 && !error ? (
        <div className="rounded-[18px] border border-dashed border-line px-6 py-12 text-center text-sm text-muted">
          Chưa có tin nào khớp bộ lọc. Thử chọn &ldquo;Sắp tới&rdquo; hoặc bỏ bớt bộ lọc.
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((p) => (
            <PostCard key={p.id} post={p} now={now} />
          ))}
        </div>
      )}
    </>
  );
}

function Controls({ filters }: { filters: Filters }) {
  return (
    <div className="flex min-w-0 flex-col gap-3">
      <TypeTabs filters={filters} />
      <DateTabs filters={filters} />
      <FilterBar filters={filters} />
    </div>
  );
}

function ResultsSkeleton() {
  return (
    <div className="flex flex-col gap-3" aria-hidden="true">
      <div className="h-10 animate-pulse rounded-full bg-card ring-1 ring-line" />
      <div className="h-12 animate-pulse rounded-2xl bg-card ring-1 ring-line" />
      <div className="h-10 animate-pulse rounded-full bg-card/60" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="h-48 animate-pulse rounded-[18px] bg-card ring-1 ring-line" />
        ))}
      </div>
    </div>
  );
}

export default function Home({ searchParams }: PageProps<"/">) {
  return (
    <main className="mx-auto flex w-full min-w-0 max-w-6xl flex-1 flex-col gap-4 px-4 pb-10 pt-5 sm:pt-8">
      <header className="flex flex-col gap-1">
        <p className="text-xs font-bold uppercase tracking-[0.08em] text-court">Đà Nẵng · tổng hợp tự động</p>
        <h1 className="text-[26px] font-extrabold tracking-tight sm:text-4xl">Kèo Vãng Lai</h1>
        <p className="max-w-2xl text-sm text-muted">
          Tuyển vãng lai, pass sân, tìm nhóm và tìm sân cầu lông từ các nhóm Facebook ở Đà Nẵng. Liên hệ trực tiếp
          người đăng qua Facebook, Zalo hoặc điện thoại.
        </p>
      </header>
      <Suspense fallback={<ResultsSkeleton />}>
        <Results searchParams={searchParams} />
      </Suspense>
      <footer className="mt-6 border-t border-line pt-4 text-xs text-muted">
        Dữ liệu được AI đọc tự động từ bài đăng trong nhóm, có thể sai sót. Hãy kiểm tra bài gốc trước khi đi. Tin cũ
        tự xoá sau khi qua giờ chơi.
      </footer>
    </main>
  );
}
