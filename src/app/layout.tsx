import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kèo Vãng Lai Đà Nẵng — tìm kèo cầu lông, pass sân",
  description: "Tổng hợp bài pass sân và tuyển vãng lai cầu lông từ các nhóm Facebook ở Đà Nẵng.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="vi" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
