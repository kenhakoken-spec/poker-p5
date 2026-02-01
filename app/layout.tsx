import type { Metadata, Viewport } from "next";
import { Bebas_Neue } from "next/font/google";
import "./globals.css";
import { HandProvider } from "@/contexts/HandContext";

const bebasNeue = Bebas_Neue({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-p5-en",
});

export const metadata: Metadata = {
  title: "Live Poker Tracker",
  description: "Live poker hand tracking and analysis",
};

// UI-44: viewport-fit=cover でsafe-area-insetを有効化（スマホURL/ナビバー対応）
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
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
