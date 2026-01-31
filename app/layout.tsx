import type { Metadata } from "next";
import { Bebas_Neue } from "next/font/google";
import "./globals.css";
import { HandProvider } from "@/contexts/HandContext";

const bebasNeue = Bebas_Neue({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-p5-en",
});

export const metadata: Metadata = {
  title: "Poker3 - ペルソナ5スタイル ポーカー記録",
  description: "ライブテキサスホールデムポーカー記録アプリ",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className={bebasNeue.variable}>
      <body>
        <HandProvider>{children}</HandProvider>
      </body>
    </html>
  );
}
