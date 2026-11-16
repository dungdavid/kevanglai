import Link from "next/link";
import type { PostFilters } from "@/lib/queries";

const TABS = [
  { value: undefined, label: "Tất cả" },
  { value: "tuyen_vang_lai", label: "Tuyển vãng lai" },
  { value: "pass_san", label: "Pass sân" },
] as const;

function href(f: PostFilters, patch: Partial<PostFilters>) {
  const merged = { ...f, ...patch };
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(merged)) if (v !== undefined && v !== "") sp.set(k, String(v));
  const s = sp.toString();
  return s ? `/?${s}` : "/";
}

export function Filters({ filters }: { filters: PostFilters }) {
  return (
    <div className="space-y-3">
      <nav className="flex gap-1 rounded-xl bg-card p-1 shadow-sm ring-1 ring-line" aria-label="Loại bài">
        {TABS.map((t) => {
          const active = filters.type === t.value;
          return (
            <Link
              key={t.label}
              href={href(filters, { type: t.value, need: t.value === "pass_san" ? undefined : filters.need })}
              className={`flex-1 whitespace-nowrap rounded-lg px-2 py-2 text-center text-[13px] font-semibold transition sm:px-3 sm:text-sm ${
                active ? "bg-court text-white" : "text-muted hover:text-foreground"
              }`}
            >
              {t.label}
            </Link>
          );
        })}
      </nav>

      <form action="/" className="flex flex-wrap items-end gap-2 text-sm">
        {filters.type && <input type="hidden" name="type" value={filters.type} />}
        <label className="flex min-w-40 flex-1 flex-col gap-1">
          <span className="text-xs text-muted">Tìm sân / khu vực</span>
          <input
            name="q"
            defaultValue={filters.q}
            placeholder="Tiên Sơn, Hải Châu, Hòa Xuân…"
            className="rounded-lg border border-line bg-card px-3 py-2 outline-none focus:border-court"
          />
        </label>
        {filters.type !== "pass_san" && (
          <label className="flex flex-col gap-1">
            <span className="text-xs text-muted">Cần</span>
            <select name="need" defaultValue={filters.need ?? ""} className="rounded-lg border border-line bg-card px-3 py-2">
              <option value="">Nam hoặc nữ</option>
              <option value="nam">Cần nam</option>
              <option value="nu">Cần nữ</option>
            </select>
          </label>
        )}
        <label className="flex flex-col gap-1">
          <span className="text-xs text-muted">Giá tối đa</span>
          <select name="maxPrice" defaultValue={filters.maxPrice ?? ""} className="rounded-lg border border-line bg-card px-3 py-2">
            <option value="">Không giới hạn</option>
            <option value="40000">≤ 40k</option>
            <option value="60000">≤ 60k</option>
            <option value="100000">≤ 100k</option>
            <option value="200000">≤ 200k</option>
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-muted">Trong</span>
          <select name="days" defaultValue={filters.days ?? 3} className="rounded-lg border border-line bg-card px-3 py-2">
            <option value="1">24 giờ</option>
            <option value="3">3 ngày</option>
            <option value="7">7 ngày</option>
            <option value="30">30 ngày</option>
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-muted">Sắp xếp</span>
          <select name="sort" defaultValue={filters.sort} className="rounded-lg border border-line bg-card px-3 py-2">
            <option value="new">Mới nhất</option>
            <option value="hot">Tương tác cao</option>
          </select>
        </label>
        <button className="rounded-lg bg-foreground px-4 py-2 font-semibold text-background hover:opacity-90">Lọc</button>
      </form>
    </div>
  );
}
