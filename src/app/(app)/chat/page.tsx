import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { ChatPanel } from "@/features/chat/components/chat-panel";

export const metadata: Metadata = { title: "Chat" };

/** Strategy chat grounded in the user's live intelligence, with citations. */
export default function ChatPage() {
  return (
    <>
      <PageHeader
        eyebrow="Analyst"
        title="Strategy Chat"
        description="Ask anything. Answers are grounded in your market's live intelligence and cite their sources."
      />
      <ChatPanel />
    </>
  );
}
