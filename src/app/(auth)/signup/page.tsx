"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function SignupPage() {
  const router = useRouter();
  const { signUpWithEmail, signInWithOAuth } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { data, error } = await signUpWithEmail(name, email, password);
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    // If email confirmation is enabled in Supabase, there is no session yet.
    if (!data.session) {
      setNotice("Check your inbox to confirm your email, then sign in.");
      return;
    }
    // New accounts go straight to onboarding: enter your company URL.
    router.push("/onboarding");
    router.refresh();
  }

  return (
    <div>
      <h1 className="text-2xl">Create your account</h1>
      <p className="mt-2 text-sm text-muted">
        Sign up with your email — you&apos;ll add your company website right after.
      </p>

      <div className="mt-6 grid grid-cols-2 gap-3">
        <Button
          variant="secondary"
          onClick={async () => {
            const { error } = await signInWithOAuth("google");
            if (error) setError(error.message);
          }}
        >
          Google
        </Button>
        <Button
          variant="secondary"
          onClick={async () => {
            const { error } = await signInWithOAuth("github");
            if (error) setError(error.message);
          }}
        >
          GitHub
        </Button>
      </div>
      {error && <p className="mt-3 text-xs leading-relaxed text-critical">{error}</p>}

      <div className="my-6 flex items-center gap-3 text-xs text-faint">
        <span className="h-px flex-1 bg-border" />
        or sign up with email
        <span className="h-px flex-1 bg-border" />
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <Input
          placeholder="Full name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <Input
          type="email"
          placeholder="you@company.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <Input
          type="password"
          placeholder="Password (8+ characters)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={8}
          required
        />
        {notice && <p className="text-xs text-accent">{notice}</p>}
        <Button type="submit" disabled={loading}>
          {loading ? "Creating account…" : "Create account"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        Already have an account?{" "}
        <Link href="/login" className="text-accent hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
