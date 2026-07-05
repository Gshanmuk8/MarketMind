import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { SettingsView } from "@/features/settings/components/settings-view";

export const metadata: Metadata = { title: "Settings" };

/** Account, company profile, and workspace management. */
export default function SettingsPage() {
  return (
    <>
      <PageHeader
        eyebrow="The workshop"
        title="Settings"
        description="Your account, your company profile, and the levers that control the machine."
      />
      <SettingsView />
    </>
  );
}
