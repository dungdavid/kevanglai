/** Lowercase, remove Vietnamese diacritics (đ → d). Keeps a 1:1 char mapping for NFC input letters. */
export const strip = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase();

/** Map a match found in strip(text) back to the original (accented) substring. */
export function originalSlice(text: string, match: RegExpMatchArray): string {
  const nfd = text.normalize("NFD");
  const idx = match.index ?? 0;
  let count = -1;
  let start = -1;
  let end = nfd.length;
  for (let i = 0; i < nfd.length; i++) {
    if (/[̀-ͯ]/.test(nfd[i])) continue;
    count++;
    if (count === idx) start = i;
    if (count === idx + match[0].length) {
      end = i;
      break;
    }
  }
  return start < 0 ? match[0] : nfd.slice(start, end).normalize("NFC").trim();
}
