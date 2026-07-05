export const siteConfig = {
  name: "MarketMind AI",
  tagline: "AI-Powered Competitive Intelligence Platform",
  description:
    "MarketMind AI automatically discovers competitors, continuously monitors the market, analyzes thousands of public signals, and converts them into strategic business intelligence.",
  url: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
} as const;
