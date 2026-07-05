import { IndexNav } from "@/components/layout/index-nav";
import { FolioBar } from "@/components/layout/folio-bar";
import { CommandPalette } from "@/components/shared/command-palette";

/** Editorial shell: fixed contents column + folio line around every screen. */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh">
      <IndexNav />
      <CommandPalette />
      <div className="lg:pl-64">
        <FolioBar />
        <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10 lg:px-12 lg:py-14">{children}</main>
      </div>
    </div>
  );
}
