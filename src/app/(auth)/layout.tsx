import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { LogoMark } from "@/components/layout/logo";
import { SessionRedirect } from "@/features/auth/components/session-redirect";

/** Quiet, centered folio for login / signup screens. */
export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  // Already signed in (e.g. arriving from a confirmation email)? These
  // screens have nothing to offer — go to the product. getSessionUser (the
  // one sanctioned auth read) also mirrors/re-links the profile row.
  const user = await getSessionUser();
  if (user) redirect("/dashboard");

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6">
      {/* Catches sessions minted client-side from confirmation-link tokens. */}
      <SessionRedirect to="/dashboard" />
      <Link href="/" className="mb-12 flex flex-col items-center">
        <LogoMark className="size-9" />
        <span className="font-display mt-3 text-2xl tracking-tight">MarketMind</span>
        <span className="microlabel mt-2 block">Competitive Intelligence</span>
      </Link>

      <div className="w-full max-w-sm border border-border bg-surface p-8 sm:p-10">
        {children}
      </div>

      <p className="microlabel mt-10">Public sources only · Your data is never shared</p>
    </main>
  );
}
