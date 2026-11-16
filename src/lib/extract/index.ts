import type { Extraction } from "../types";
import { geminiEnabled, geminiExtract } from "./gemini";
import { heuristicExtract } from "./heuristic";

export async function extract(text: string): Promise<{ data: Extraction; extractor: string }> {
  if (geminiEnabled()) {
    try {
      return { data: await geminiExtract(text), extractor: "gemini" };
    } catch (err) {
      console.error("[extract] Gemini failed, falling back to heuristic:", err);
    }
  }
  return { data: heuristicExtract(text), extractor: "heuristic" };
}

/** Google Maps search link for an address/venue in Da Nang. */
export function mapsUrl(venue: string | null, address: string | null): string | null {
  const q = [venue, address].filter(Boolean).join(", ");
  if (!q) return null;
  const withCity = /đà nẵng|da nang/i.test(q) ? q : `${q}, Đà Nẵng`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(withCity)}`;
}

/** "Điểm tương tác" of a post: reactions + 2×comments + 3×shares. */
export function engagementScore(reactions: number, comments: number, shares: number) {
  return reactions + comments * 2 + shares * 3;
}
