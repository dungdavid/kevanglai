import { NextResponse } from "next/server";
import { z } from "zod";
import { isAuthorized } from "@/lib/auth";
import { getAdminClient } from "@/lib/supabase";
import { GroupSchema } from "@/lib/types";

/** GET /api/groups — enabled groups the scraper should crawl (auth required). */
export async function GET(req: Request) {
  if (!isAuthorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { data, error } = await getAdminClient()
    .from("groups")
    .select("id, name, url, last_crawled_at")
    .eq("enabled", true)
    .order("last_crawled_at", { ascending: true, nullsFirst: true })
    .order("member_count", { ascending: false, nullsFirst: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ groups: data });
}

const Body = z.object({
  groups: z.array(GroupSchema).max(500).optional(),
  crawled: z.array(z.string()).max(500).optional(), // group ids just crawled
});

/** POST /api/groups — upsert discovered groups and/or mark groups as crawled. */
export async function POST(req: Request) {
  if (!isAuthorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const db = getAdminClient();
  const { groups = [], crawled = [] } = parsed.data;

  if (groups.length) {
    const { error } = await db.from("groups").upsert(
      groups.map((g) => ({ id: g.id, name: g.name, url: g.url, member_count: g.memberCount ?? null, privacy: g.privacy })),
      { onConflict: "id" },
    );
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (crawled.length) {
    const { error } = await db.from("groups").update({ last_crawled_at: new Date().toISOString() }).in("id", crawled);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ upserted: groups.length, crawled: crawled.length });
}
