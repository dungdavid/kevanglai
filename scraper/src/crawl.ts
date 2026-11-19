import type { Locator, Page } from "playwright";
import { api, config, ensureLoggedIn, jitter, openBrowser, parseCount, sleep } from "./common";

interface RawPost {
  fbPostId: string;
  postUrl: string;
  groupId: string;
  groupName: string;
  authorName: string;
  authorUrl: string;
  text: string;
  reactions: number;
  comments: number;
  shares: number;
}

interface GroupRow {
  id: string;
  name: string;
  url: string;
}

const POST_LINK = /\/groups\/([^/?#]+)\/(?:posts|permalink)\/(\d+)/;
const TIME_TEXT = /^(\d+\s*(giây|phút|giờ|ngày|tuần|năm|s|m|h|d|w|y)|vừa xong|hôm qua|just now|yesterday|\d{1,2}\s+tháng\s+\d{1,2})/i;

/** Facebook only fills the permalink on the timestamp link after hover — hover to reveal it. */
async function revealPermalink(unit: Locator): Promise<string | null> {
  const direct = await unit
    .locator('a[href*="/posts/"], a[href*="/permalink/"]')
    .first()
    .getAttribute("href", { timeout: 500 })
    .catch(() => null);
  if (direct && POST_LINK.test(direct)) return direct;
  const links = unit.locator('a[role="link"]');
  const n = Math.min(await links.count(), 12);
  let tried = 0;
  for (let i = 0; i < n && tried < 2; i++) {
    const a = links.nth(i);
    const text = ((await a.innerText({ timeout: 500 }).catch(() => "")) || (await a.getAttribute("aria-label", { timeout: 500 }).catch(() => "")) || "").trim();
    if (!TIME_TEXT.test(text)) continue;
    tried++;
    await a.hover({ timeout: 1000 }).catch(() => {});
    await sleep(300);
    const href = await a.getAttribute("href", { timeout: 500 }).catch(() => null);
    if (href && POST_LINK.test(href)) return href;
  }
  return null;
}

async function expandSeeMore(unit: Locator) {
  const btn = unit.getByRole("button", { name: /^(Xem thêm|See more)$/ }).first();
  if (await btn.count()) await btn.click({ timeout: 1000 }).catch(() => {});
}

function normalizeAuthorUrl(href: string | null): string {
  if (!href) return "";
  const u = new URL(href, "https://www.facebook.com");
  const groupUser = u.pathname.match(/\/groups\/[^/]+\/user\/(\d+)/);
  if (groupUser) return `https://www.facebook.com/profile.php?id=${groupUser[1]}`;
  if (u.pathname === "/profile.php") return `https://www.facebook.com/profile.php?id=${u.searchParams.get("id")}`;
  return `https://www.facebook.com${u.pathname.replace(/\/$/, "")}`;
}

/** Give up on a single feed unit after `ms` so one odd post can't stall the whole run. */
function withBudget<T>(ms: number, work: Promise<T>): Promise<T> {
  return Promise.race([work, new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`quá ${ms / 1000}s`)), ms))]);
}

async function scrapeGroup(page: Page, group: GroupRow): Promise<RawPost[]> {
  await page.goto(`${group.url.replace(/\/$/, "")}/?sorting_setting=CHRONOLOGICAL`, { waitUntil: "domcontentloaded" });
  await jitter(3000, 5000);
  const groupName = group.name || (await page.locator("h1").first().innerText().catch(() => "")) || group.id;

  for (let i = 0; i < config.scrolls; i++) {
    await page.mouse.wheel(0, 2200 + Math.random() * 800);
    await jitter(1500, 3000);
  }

  const units = page.locator('div[role="feed"] > div');
  const total = await units.count();
  const posts = new Map<string, RawPost>();

  for (let i = 0; i < total; i++) {
    const unit = units.nth(i);
    try {
      const href = await withBudget(
        8000,
        (async () => {
          await unit.scrollIntoViewIfNeeded({ timeout: 2000 });
          await expandSeeMore(unit);
          return revealPermalink(unit);
        })(),
      );
      const m = href?.match(POST_LINK);
      if (!m) continue;
      const fbPostId = m[2];
      if (posts.has(fbPostId)) continue;

      const data = await unit.evaluate((el) => {
        const msg =
          el.querySelector<HTMLElement>('[data-ad-preview="message"], [data-ad-comet-preview="message"]') ??
          [...el.querySelectorAll<HTMLElement>('div[dir="auto"]')].sort((a, b) => b.innerText.length - a.innerText.length)[0];
        const authorA = el.querySelector<HTMLAnchorElement>("h2 a, h3 a, h4 a, strong a");
        const root = el as HTMLElement;
        const all = root.innerText;
        const reactLabel = [...el.querySelectorAll<HTMLElement>("[aria-label]")]
          .map((n) => n.getAttribute("aria-label") ?? "")
          .find((l) => /cảm xúc|reactions?/i.test(l));
        return {
          text: msg?.innerText.trim() ?? "",
          authorName: authorA?.innerText.trim() ?? "",
          authorHref: authorA?.getAttribute("href") ?? null,
          reactLabel: reactLabel ?? "",
          reactText: all.match(/(?:Tất cả cảm xúc|All reactions):?\s*\n?\s*([\d.,]+\s*[KN]?)/i)?.[1] ?? "",
          comments: all.match(/([\d.,]+\s*[KN]?)\s*(?:bình luận|comments?)/i)?.[1] ?? "",
          shares: all.match(/([\d.,]+\s*[KN]?)\s*(?:lượt chia sẻ|shares?)/i)?.[1] ?? "",
        };
      });
      if (data.text.length < 15) continue;

      posts.set(fbPostId, {
        fbPostId,
        postUrl: `https://www.facebook.com/groups/${m[1]}/posts/${fbPostId}/`,
        groupId: group.id,
        groupName,
        authorName: data.authorName,
        authorUrl: normalizeAuthorUrl(data.authorHref),
        text: data.text.slice(0, 5000),
        reactions: parseCount(data.reactText || data.reactLabel.match(/[\d.,]+\s*[KN]?/)?.[0]),
        comments: parseCount(data.comments),
        shares: parseCount(data.shares),
      });
    } catch (err) {
      console.warn(`  ⚠️ bỏ qua 1 bài: ${(err as Error).message.split("\n")[0]}`);
    }
  }
  console.log(`   ${posts.size}/${total} bài đọc được`);
  return [...posts.values()];
}

async function runOnce() {
  const { groups } = await api<{ groups: GroupRow[] }>("GET", "/api/groups");
  if (!groups.length) {
    console.log("Chưa có nhóm nào. Chạy `npm run discover` trước.");
    return;
  }
  const batch = groups.slice(0, config.maxGroups);
  const ctx = await openBrowser();
  const page = ctx.pages()[0] ?? (await ctx.newPage());
  try {
    await ensureLoggedIn(page);
    for (const g of batch) {
      console.log(`📥 ${g.name || g.id}`);
      const posts = await scrapeGroup(page, g);
      for (let i = 0; i < posts.length; i += 25) {
        const r = await api<{ inserted: number; updated: number; errors: string[] }>("POST", "/api/ingest", {
          posts: posts.slice(i, i + 25),
        });
        console.log(`   +${r.inserted} mới, ${r.updated} cập nhật${r.errors.length ? `, ${r.errors.length} lỗi` : ""}`);
      }
      await api("POST", "/api/groups", { crawled: [g.id] });
      if (g !== batch[batch.length - 1]) await jitter(8000, 15000); // pause between groups
    }
  } finally {
    await ctx.close();
  }
}

if (process.argv.includes("--watch")) {
  for (;;) {
    const started = Date.now();
    await runOnce().catch((e) => console.error("❌", e.message));
    const wait = Math.max(0, config.watchMinutes * 60_000 - (Date.now() - started));
    console.log(`⏳ Lần chạy tiếp theo sau ${Math.round(wait / 60000)} phút`);
    await sleep(wait);
  }
} else {
  await runOnce();
}
