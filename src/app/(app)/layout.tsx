import { IndexNav } from "@/components/layout/index-nav";
import { FolioBar } from "@/components/layout/folio-bar";
import { CommandPalette } from "@/components/shared/command-palette";

/** Vellum shell: a fixed contents column and a thin folio line around every screen. */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh">
      <IndexNav />
      <CommandPalette />
      {/* A faint architectural plaque in the wall — only surfaces in the empty
          gutter on wide screens, so the negative space reads as a curated
          gallery wall rather than blank canvas. */}
      <span
        aria-hidden
        className="pointer-events-none fixed right-3.5 top-1/2 hidden -translate-y-1/2 font-data text-[10px] uppercase tracking-[0.3em] text-faint opacity-40 xl:block"
        style={{ writingMode: "vertical-rl" }}
      >
        MarketMind · Intelligence Field
      </span>
      <div className="lg:pl-64">
        <FolioBar />
        <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10 lg:px-12 lg:py-14">
          {children}
        </main>
      </div>
    </div>
  );
}
