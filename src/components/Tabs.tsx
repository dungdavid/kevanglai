import Link from "next/link";
import { DATE_TABS, filterHref, TYPE_TABS, type Filters } from "@/lib/filters";

export function TypeTabs({ filters }: { filters: Filters }) {
  return (
    <nav aria-label="Loại tin" className="no-scrollbar -mx-4 flex min-w-0 gap-2 overflow-x-auto px-4">
      {TYPE_TABS.map((t) => {
        const on = filters.type === t.id;
        return (
          <Link
            key={t.id}
            href={filterHref(filters, { type: t.id })}
            aria-current={on ? "page" : undefined}
            scroll={false}
            className={`flex h-10 shrink-0 items-center rounded-full px-4 text-[13px] font-bold transition ${
              on ? "bg-court text-white" : "border border-line bg-card text-muted hover:text-foreground"
            }`}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function DateTabs({ filters }: { filters: Filters }) {
  return (
    <nav aria-label="Ngày chơi" className="flex gap-1 rounded-2xl border border-line bg-card p-1">
      {DATE_TABS.map((t) => {
        const on = filters.date === t.id;
        return (
          <Link
            key={t.id}
            href={filterHref(filters, { date: t.id })}
            aria-current={on ? "page" : undefined}
            scroll={false}
            className={`flex h-10 flex-1 items-center justify-center rounded-xl text-[13px] font-bold transition ${
              on ? "bg-foreground text-background" : "text-muted hover:text-foreground"
            }`}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
