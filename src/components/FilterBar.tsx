"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { DISTRICTS, LEVELS } from "@/lib/extract/district";
import { filterHref, TIME_OPTIONS, type Filters } from "@/lib/filters";

const selectCls =
  "h-10 shrink-0 appearance-none rounded-full border border-line bg-card pl-4 pr-9 text-[13px] font-semibold text-foreground " +
  "bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2212%22 height=%2212%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%235d6b63%22 stroke-width=%222.5%22><path d=%22M6 9l6 6 6-6%22/></svg>')] bg-[length:12px] bg-[right_12px_center] bg-no-repeat";
const activeCls = "border-foreground bg-foreground text-background";

/** District / time-of-day / level / sort selects. Each change navigates to the matching URL. */
export function FilterBar({ filters }: { filters: Filters }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const go = (patch: Partial<Filters>) => start(() => router.push(filterHref(filters, patch), { scroll: false }));

  return (
    <div className={`no-scrollbar -mx-4 flex min-w-0 gap-2 overflow-x-auto px-4 pb-1 ${pending ? "opacity-60" : ""}`} aria-busy={pending}>
      <label className="sr-only" htmlFor="f-district">Khu vực</label>
      <select
        id="f-district"
        value={filters.district}
        onChange={(e) => go({ district: e.target.value as Filters["district"] })}
        className={`${selectCls} ${filters.district ? activeCls : ""}`}
      >
        <option value="">Mọi quận</option>
        {Object.entries(DISTRICTS).map(([id, name]) => (
          <option key={id} value={id}>{name}</option>
        ))}
      </select>

      <label className="sr-only" htmlFor="f-time">Giờ chơi</label>
      <select
        id="f-time"
        value={filters.time}
        onChange={(e) => go({ time: e.target.value as Filters["time"] })}
        className={`${selectCls} ${filters.time ? activeCls : ""}`}
      >
        {TIME_OPTIONS.map((t) => (
          <option key={t.id} value={t.id}>{t.label}</option>
        ))}
      </select>

      <label className="sr-only" htmlFor="f-level">Trình độ của bạn</label>
      <select
        id="f-level"
        value={filters.level}
        onChange={(e) => go({ level: Number(e.target.value) })}
        className={`${selectCls} ${filters.level ? activeCls : ""}`}
      >
        <option value={0}>Mọi trình độ</option>
        {LEVELS.map((l) => (
          <option key={l.rank} value={l.rank}>Trình ≤ {l.label}</option>
        ))}
      </select>

      <label className="sr-only" htmlFor="f-sort">Sắp xếp</label>
      <select
        id="f-sort"
        value={filters.sort}
        onChange={(e) => go({ sort: e.target.value as Filters["sort"] })}
        className={selectCls}
      >
        <option value="soon">Sắp diễn ra</option>
        <option value="new">Mới đăng</option>
        <option value="hot">Tương tác cao</option>
      </select>
    </div>
  );
}
