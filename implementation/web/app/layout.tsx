import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = { title: "MindCraft", description: "로컬 AI 작업실" };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ko"><body>{children}</body></html>;
}
