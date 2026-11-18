import "server-only";
import { dbType, LISTED_TYPES, type Filters } from "./filters";
import { applyMemoryFilters, dateWindow, HOUR } from "./queries-shared";
import { getReadClient } from "./supabase";
import type { PostRow } from "./types";

export async function listPosts(f: Filters, now: number): Promise<PostRow[]> {
  const { from, to } = dateWindow(f, now);
  let q = getReadClient().from("posts").select("*").in("type", [...LISTED_TYPES]).limit(300);

  const type = dbType(f.type);
  if (type) q = q.eq("type", type);
  if (f.district) q = q.eq("district", f.district);
  if (f.level) q = q.or(`level_rank.is.null,level_rank.lte.${f.level}`);

  const fromIso = new Date(from).toISOString();
  if (to) {
    q = q.gte("play_end", fromIso).lt("play_start", new Date(to).toISOString());
  } else {
    const fresh = new Date(now - 24 * HOUR).toISOString();
    q = q.or(`play_end.gte.${fromIso},and(play_start.is.null,created_at.gte.${fresh})`);
  }

  q = f.sort === "hot" ? q.order("engagement_score", { ascending: false }) : q.order("created_at", { ascending: false });

  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return applyMemoryFilters((data ?? []) as PostRow[], f, now);
}

export async function getPost(id: string): Promise<PostRow | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const { data, error } = await getReadClient().from("posts").select("*").eq("id", id).in("type", [...LISTED_TYPES]).maybeSingle();
  if (error) throw new Error(error.message);
  return (data as PostRow) ?? null;
}
