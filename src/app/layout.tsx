import type { Metadata } from "next";
import { Inter, Marcellus, JetBrains_Mono } from "next/font/google";
import { Providers } from "@/components/providers";
import "./globals.css";

// Display fallback for Kawoszeh (loaded via @font-face when the TTF is
// present in public/fonts) — Marcellus carries the identity until then.
const marcellus = Marcellus({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-marcellus",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
});

export const metadata: Metadata = {
  title: {
    default: "MarketMind AI — AI-Powered Competitive Intelligence",
    template: "%s · MarketMind AI",
  },
  description:
    "MarketMind AI automatically discovers competitors, continuously monitors the market, and converts thousands of public signals into strategic business intelligence.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${marcellus.variable} ${inter.variable} ${jetbrainsMono.variable}`}
    >
      <body className="min-h-dvh bg-background text-foreground antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
