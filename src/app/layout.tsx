import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Quản lý công việc hôm nay",
  description: "Ứng dụng quản lý danh sách công việc hàng ngày",
};

import Chatbot from "@/components/Chatbot";

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        {children}
        <Chatbot />
      </body>
    </html>
  );
}
