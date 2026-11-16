import "dotenv/config";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, type BrowserContext, type Page } from "playwright";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const PROFILE_DIR = path.join(root, ".fb-profile");

export const config = {
  apiBase: (process.env.API_BASE ?? "http://localhost:3000").replace(/\/$/, ""),
  secret: process.env.INGEST_SECRET ?? "",
  maxGroups: Number(process.env.MAX_GROUPS_PER_RUN ?? 8),
  scrolls: Number(process.env.SCROLLS_PER_GROUP ?? 6),
  watchMinutes: Number(process.env.WATCH_INTERVAL_MINUTES ?? 30),
  headless: process.env.HEADLESS === "true",
};

/** Persistent Chromium profile so you only log in to Facebook once. */
export async function openBrowser(headless = config.headless): Promise<BrowserContext> {
  return chromium.launchPersistentContext(PROFILE_DIR, {
    headless,
    viewport: { width: 1280, height: 900 },
    locale: "vi-VN",
    timezoneId: "Asia/Ho_Chi_Minh",
  });
}

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
/** Human-ish random delay between min and max ms. */
export const jitter = (min: number, max: number) => sleep(min + Math.random() * (max - min));

export async function ensureLoggedIn(page: Page) {
  await page.goto("https://www.facebook.com/", { waitUntil: "domcontentloaded" });
  await jitter(1500, 2500);
  const loginForm = await page.locator('input[name="email"], form[action*="login"]').count();
  if (loginForm > 0 || page.url().includes("/login") || page.url().includes("checkpoint")) {
    throw new Error("Chưa đăng nhập Facebook (hoặc bị checkpoint). Chạy `npm run login` trước.");
  }
}

export async function api<T>(method: "GET" | "POST", route: string, body?: unknown): Promise<T> {
  if (!config.secret) throw new Error("Thiếu INGEST_SECRET trong scraper/.env");
  const res = await fetch(`${config.apiBase}${route}`, {
    method,
    headers: { "content-type": "application/json", authorization: `Bearer ${config.secret}` },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = (await res.json().catch(() => ({}))) as T & { error?: unknown };
  if (!res.ok) throw new Error(`${method} ${route} → ${res.status}: ${JSON.stringify(json.error ?? json)}`);
  return json;
}

/** "1,2K" → 1200, "15" → 15, "2 N" → 2000 */
export function parseCount(s: string | null | undefined): number {
  if (!s) return 0;
  const m = s.replace(/\s/g, "").match(/([\d.,]+)\s*(K|N|nghìn|M|Tr|triệu)?/i);
  if (!m) return 0;
  const n = Number(m[1].replace(/\.(?=\d{3}\b)/g, "").replace(",", "."));
  const unit = (m[2] ?? "").toLowerCase();
  const mult = unit === "k" || unit === "n" || unit === "nghìn" ? 1000 : unit === "m" || unit === "tr" || unit === "triệu" ? 1_000_000 : 1;
  return Number.isFinite(n) ? Math.round(n * mult) : 0;
}
