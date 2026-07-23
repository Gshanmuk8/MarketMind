import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { LandscapeRadar } from "@/features/competitors/components/landscape-radar";
import { CompetitorIndex } from "@/features/competitors/components/competitor-index";

export const metadata: Metadata = { title: "Competitors" };

/** Competitor ledger: a landscape map over the ranked curation list. */
export default function CompetitorsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Market Atlas"
        title="Competitors"
        description="AI-discovered competitors, mapped by threat and similarity. Track the ones that matter; dismiss the noise."
      />
      <LandscapeRadar />
      <CompetitorIndex />
    </>
  );
}
