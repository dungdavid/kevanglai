import { api, ensureLoggedIn, jitter, openBrowser, parseCount } from "./common";

/** Search Facebook for badminton groups in Da Nang and register them with the web app. */
const KEYWORDS = [
  "cầu lông đà nẵng",
  "cộng đồng cầu lông đà nẵng",
  "giao lưu cầu lông đà nẵng",
  "vãng lai cầu lông đà nẵng",
  "pass sân cầu lông đà nẵng",
  "badminton đà nẵng",
  "cầu lông hải châu",
  "cầu lông sơn trà",
  "cầu lông liên chiểu",
  "cầu lông ngũ hành sơn",
  "cầu lông cẩm lệ",
  "cầu lông thanh khê",
];

const isRelevant = (name: string) => {
  const n = name.toLowerCase();
  const sport = /cầu lông|cau long|badminton|\bcl\b/.test(n);
  const place = /đà nẵng|da nang|danang|đn\b|hải châu|sơn trà|liên chiểu|ngũ hành sơn|cẩm lệ|thanh khê|hòa vang|hòa xuân/.test(n);
  // buy/sell, tournaments and coaching groups never have pass-sân / vãng lai posts
  const offTopic = /chợ|cho cau long|thanh lý|thanh ly|vợt cũ|vot cu|các giải|cac giai|lớp học|lop hoc/.test(n);
  return sport && place && !offTopic;
};

interface Found {
  id: string;
  name: string;
  url: string;
  memberCount?: number;
  privacy: "public" | "private" | "unknown";
}

const ctx = await openBrowser();
const page = ctx.pages()[0] ?? (await ctx.newPage());
await ensureLoggedIn(page);

const found = new Map<string, Found>();
for (const kw of KEYWORDS) {
  await page.goto(`https://www.facebook.com/search/groups/?q=${encodeURIComponent(kw)}`, { waitUntil: "domcontentloaded" });
  await jitter(2500, 4000);
  for (let i = 0; i < 4; i++) {
    await page.mouse.wheel(0, 2500);
    await jitter(1200, 2200);
  }
  const results = await page.evaluate(() => {
    const out: { id: string; name: string; context: string }[] = [];
    document.querySelectorAll<HTMLAnchorElement>('div[role="feed"] a[href*="/groups/"], div[role="main"] a[href*="/groups/"]').forEach((a) => {
      const m = a.href.match(/facebook\.com\/groups\/([^/?#]+)\/?(?:[?#]|$)/);
      const name = a.innerText.trim();
      if (!m || !name || name.length > 120) return;
      // climb to the result card to read "X thành viên · Công khai"
      let card: HTMLElement | null = a;
      for (let i = 0; i < 8 && card && card.innerText.length < 80; i++) card = card.parentElement;
      out.push({ id: m[1], name, context: card?.innerText ?? "" });
    });
    return out;
  });
  for (const r of results) {
    if (!isRelevant(r.name) || found.has(r.id)) continue;
    const members = r.context.match(/([\d.,]+\s*[KN]?)\s*(thành viên|members)/i);
    const privacy = /riêng tư|private/i.test(r.context) ? "private" : /công khai|public/i.test(r.context) ? "public" : "unknown";
    found.set(r.id, {
      id: r.id,
      name: r.name,
      url: `https://www.facebook.com/groups/${r.id}`,
      memberCount: members ? parseCount(members[1]) : undefined,
      privacy,
    });
  }
  console.log(`🔎 "${kw}": tổng ${found.size} nhóm`);
}

await ctx.close();

const groups = [...found.values()].sort((a, b) => (b.memberCount ?? 0) - (a.memberCount ?? 0));
console.table(groups.map((g) => ({ name: g.name, members: g.memberCount, privacy: g.privacy, url: g.url })));
const res = await api<{ upserted: number }>("POST", "/api/groups", { groups });
console.log(`✅ Đã lưu ${res.upserted} nhóm (nhóm mới mặc định TẮT — bật cột groups.enabled trong Supabase để crawl).`);
