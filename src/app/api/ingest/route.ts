import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { isAuthorized } from "@/lib/auth";
import { derivedFields, engagementScore, extract, EXTRACTOR_VERSION } from "@/lib/extract";
import { getAdminClient } from "@/lib/supabase";
import { IngestBodySchema } from "@/lib/types";

export const maxDuration = 60;

/**
 * POST /api/ingest — receives raw posts from the local scraper,
 * extracts structured info (Gemini → heuristic fallback) and upserts them.
 */
export async function POST(req: Request) {
  if (!isAuthorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const parsed = IngestBodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const db = getAdminClient();
  const posts = parsed.data.posts;

  // Skip AI work for posts whose text hasn't changed; only refresh counters.
  const { data: existing } = await db
    .from("posts")
    .select("fb_post_id, text_hash, extractor")
    .in("fb_post_id", posts.map((p) => p.fbPostId));
  // key = text hash + extractor version: re-extract when either the post or the rules changed
  const known = new Map(
    (existing ?? []).map((r) => [r.fb_post_id as string, `${r.text_hash}|${String(r.extractor).split("-").pop()}`]),
  );

  // Make sure every referenced group exists (FK).
  const groups = [...new Map(posts.map((p) => [p.groupId, p])).values()].map((p) => ({
    id: p.groupId,
    name: p.groupName,
    url: `https://www.facebook.com/groups/${p.groupId}`,
  }));
  await db.from("groups").upsert(groups, { onConflict: "id", ignoreDuplicates: true });

  let inserted = 0;
  let updated = 0;
  const errors: string[] = [];

  for (const p of posts) {
    const hash = createHash("sha256").update(p.text).digest("hex");
    const counters = {
      reactions: p.reactions,
      comments: p.comments,
      shares: p.shares,
      engagement_score: engagementScore(p.reactions, p.comments, p.shares),
      updated_at: new Date().toISOString(),
    };

    if (known.get(p.fbPostId) === `${hash}|${EXTRACTOR_VERSION}`) {
      const { error } = await db.from("posts").update(counters).eq("fb_post_id", p.fbPostId);
      if (error) errors.push(`${p.fbPostId}: ${error.message}`);
      else updated++;
      continue;
    }

    // Scraper may not resolve the post time; "now" is a close upper bound for freshly crawled posts.
    const postedAt = (p.postedAt && Date.parse(p.postedAt)) || Date.now();
    const { data: x, extractor } = await extract(p.text, postedAt);
    const { error } = await db.from("posts").upsert(
      {
        fb_post_id: p.fbPostId,
        post_url: p.postUrl,
        group_id: p.groupId,
        group_name: p.groupName,
        author_name: p.authorName,
        author_url: p.authorUrl,
        raw_text: p.text,
        text_hash: hash,
        posted_at: new Date(postedAt).toISOString(),
        ...counters,
        type: x.type,
        venue_name: x.venueName,
        address: x.address,
        ...derivedFields(x, p.text, postedAt),
        price_text: x.priceText,
        price_vnd: x.priceVnd,
        play_date: x.playDate,
        play_time: x.playTime,
        slots_total: x.slotsTotal,
        slots_male: x.slotsMale,
        slots_female: x.slotsFemale,
        level: x.level,
        phone: x.phone,
        zalo: x.zalo,
        extractor,
      },
      { onConflict: "fb_post_id" },
    );
    if (error) errors.push(`${p.fbPostId}: ${error.message}`);
    else if (known.has(p.fbPostId)) updated++;
    else inserted++;
  }

  return NextResponse.json({ inserted, updated, errors });
}
