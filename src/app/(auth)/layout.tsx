import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase/server";
import { SessionRedirect } from "@/features/auth/components/session-redirect";

/** Quiet, centered folio for login / signup screens. */
export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  // Already signed in (e.g. arriving from a confirmation email)? These
  // screens have nothing to offer — go to the product.
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/dashboard");

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6">
      {/* Catches sessions minted client-side from confirmation-link tokens. */}
      <SessionRedirect to="/dashboard" />
      <Link href="/" className="mb-12 text-center">
        <span className="font-display text-2xl tracking-tight">MarketMind</span>
        <span className="microlabel mt-2 block">Competitive Intelligence</span>
      </Link>

      <div className="rise w-full max-w-sm rounded-lg border border-border bg-surface p-6 sm:p-8">
        {children}
      </div>

      <p className="microlabel mt-10">Public sources only · Your data is never shared</p>
    </main>
  );
}
