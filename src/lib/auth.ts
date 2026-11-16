import "server-only";
import { timingSafeEqual } from "node:crypto";

/** Checks `Authorization: Bearer <INGEST_SECRET>` from the local scraper. */
export function isAuthorized(req: Request): boolean {
  const secret = process.env.INGEST_SECRET;
  if (!secret) return false;
  const header = req.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  const a = Buffer.from(token);
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}
