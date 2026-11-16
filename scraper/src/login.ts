import { openBrowser } from "./common";

/**
 * Opens a visible browser with the scraper's own profile.
 * Log in to Facebook (preferably a secondary account), join the badminton groups,
 * then close the window. The session is saved in scraper/.fb-profile.
 */
const ctx = await openBrowser(false);
const page = ctx.pages()[0] ?? (await ctx.newPage());
await page.goto("https://www.facebook.com/");
console.log("👉 Đăng nhập Facebook trong cửa sổ vừa mở, tham gia các nhóm cầu lông, rồi ĐÓNG cửa sổ để lưu phiên.");
await new Promise<void>((resolve) => ctx.on("close", () => resolve()));
console.log("✅ Đã lưu phiên đăng nhập.");
