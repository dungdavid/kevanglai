import "server-only";
import { getReadClient } from "./supabase";
import type { PostRow, PostType } from "./types";

export interface PostFilters {
  type?: PostType;
  need?: "nam" | "nu";
  maxPrice?: number;
  q?: string;
  sort?: "new" | "hot";
  days?: number;
}

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export function parseFilters(sp: Record<string, string | string[] | undefined>): PostFilters {
  const type = one(sp.type);
  const need = one(sp.need);
  const sort = one(sp.sort);
  const maxPrice = Number(one(sp.maxPrice));
  const days = Number(one(sp.days));
  return {
    type: type === "pass_san" || type === "tuyen_vang_lai" ? type : undefined,
    need: need === "nam" || need === "nu" ? need : undefined,
    maxPrice: Number.isFinite(maxPrice) && maxPrice > 0 ? maxPrice : undefined,
    q: one(sp.q)?.trim().slice(0, 60) || undefined,
    sort: sort === "hot" ? "hot" : "new",
    days: Number.isFinite(days) && days > 0 ? Math.min(days, 30) : 3,
  };
}

export async function listPosts(f: PostFilters): Promise<PostRow[]> {
  let q = getReadClient()
    .from("posts")
    .select("*")
    .neq("type", "other")
    .gte("created_at", new Date(Date.now() - (f.days ?? 3) * 86_400_000).toISOString())
    .limit(120);

  if (f.type) q = q.eq("type", f.type);
  if (f.need === "nam") q = q.gt("slots_male", 0);
  if (f.need === "nu") q = q.gt("slots_female", 0);
  if (f.maxPrice) q = q.lte("price_vnd", f.maxPrice);
  if (f.q) {
    const term = f.q.replace(/[%,()]/g, " ");
    q = q.or(`venue_name.ilike.%${term}%,address.ilike.%${term}%,raw_text.ilike.%${term}%`);
  }
  q = f.sort === "hot"
    ? q.order("engagement_score", { ascending: false })
    : q.order("posted_at", { ascending: false, nullsFirst: false }).order("created_at", { ascending: false });

  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []) as PostRow[];
}
