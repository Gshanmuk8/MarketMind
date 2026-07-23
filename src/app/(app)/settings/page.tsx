import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { SettingsView } from "@/features/settings/components/settings-view";
import { NotificationsPanel } from "@/features/notifications/components/notifications-panel";

export const metadata: Metadata = { title: "Settings" };

/** Account, company profile, delivery channels, and workspace management. */
export default function SettingsPage() {
  return (
    <>
      <PageHeader
        title="Settings"
        description="Your account, your company profile, and the levers that control the machine."
      />
      <div className="flex max-w-2xl flex-col gap-14">
        <SettingsView />
        <NotificationsPanel />
      </div>
    </>
  );
}
