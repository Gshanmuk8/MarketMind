import type { Metadata } from "next";
import { OnboardingForm } from "@/features/onboarding/components/onboarding-form";

export const metadata: Metadata = { title: "Add your company" };

/**
 * The single-input onboarding: user enters their company URL and the
 * AI Company Understanding Engine takes over.
 */
export default function OnboardingPage() {
  return (
    <div className="rise mx-auto flex min-h-[70vh] max-w-xl flex-col justify-center">
      <p className="microlabel mb-6 text-center">Begin the briefing</p>
      <h1 className="text-center text-3xl leading-snug sm:text-4xl">
        What&apos;s your company?
      </h1>
      <p className="mt-4 text-center leading-relaxed text-muted">
        Paste your website. We&apos;ll understand your product, map your market, and
        discover your competitors — in about 60 seconds.
      </p>
      <div className="mt-10">
        <OnboardingForm />
      </div>
    </div>
  );
}
