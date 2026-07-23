"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ChannelType, NotificationChannel } from "@prisma/client";
import { Mail, Send, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

async function jsonFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { headers: { "Content-Type": "application/json" }, ...init });
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(typeof data?.error === "string" ? data.error : "Request failed.");
  }
  return res.json();
}

interface ChannelsResponse {
  channels: NotificationChannel[];
  available: ChannelType[];
}

const KEY = ["notification-channels"];

function destinationOf(channel: NotificationChannel): string {
  const config = (channel.config ?? {}) as { email?: string; chatId?: string };
  return config.email ?? config.chatId ?? "—";
}

/**
 * The delivery desk (doc 12): connect email / Telegram so the weekly
 * Monday Morning Memo reaches the founder without signing in.
 */
export function NotificationsPanel() {
  const qc = useQueryClient();
  const [adding, setAdding] = useState<ChannelType | null>(null);
  const [value, setValue] = useState("");
  const [notice, setNotice] = useState<string | null>(null);

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: KEY,
    queryFn: () => jsonFetch<ChannelsResponse>("/api/notifications"),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: KEY });

  const add = useMutation({
    mutationFn: (input: { type: ChannelType; config: Record<string, string> }) =>
      jsonFetch("/api/notifications", { method: "POST", body: JSON.stringify(input) }),
    onSuccess: () => {
      setAdding(null);
      setValue("");
      setNotice("Channel added. Send a test to confirm it's connected.");
      invalidate();
    },
    onError: (e) => setNotice((e as Error).message),
  });

  const toggle = useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) =>
      jsonFetch(`/api/notifications/${id}`, { method: "PATCH", body: JSON.stringify({ enabled }) }),
    onSuccess: invalidate,
    onError: (e) => setNotice((e as Error).message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => jsonFetch(`/api/notifications/${id}`, { method: "DELETE" }),
    onSuccess: invalidate,
    onError: (e) => setNotice((e as Error).message),
  });

  const test = useMutation({
    mutationFn: (id: string) =>
      jsonFetch(`/api/notifications/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ action: "test" }),
      }),
    onSuccess: () => setNotice("Test sent — check your inbox / Telegram."),
    onError: (e) => setNotice((e as Error).message),
  });

  function submitAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!adding) return;
    const config: Record<string, string> =
      adding === "EMAIL" ? { email: value.trim() } : { chatId: value.trim() };
    add.mutate({ type: adding, config });
  }

  const channels = data?.channels ?? [];
  const available = data?.available ?? [];

  return (
    <section>
      <p className="microlabel mb-1">Delivery — the Monday Morning Memo</p>
      <p className="mb-4 max-w-lg text-sm text-muted">
        Your weekly intelligence report, delivered where you already are. Connect a channel and it
        arrives automatically — no need to sign in to read it.
      </p>

      {isPending ? (
        <Skeleton className="h-24" />
      ) : isError ? (
        <div className="flex items-center gap-3">
          <p className="text-sm text-critical">Couldn&apos;t load your channels.</p>
          <Button variant="secondary" size="sm" onClick={() => refetch()}>
            Retry
          </Button>
        </div>
      ) : (
        <>
          {channels.length > 0 && (
            <div className="border-t border-border">
              {channels.map((channel) => (
                <div
                  key={channel.id}
                  className="flex flex-wrap items-center gap-3 border-b border-border py-4"
                >
                  <Badge variant={channel.enabled ? "live" : "default"}>
                    {channel.type.toLowerCase()}
                  </Badge>
                  <span className="break-all font-data text-sm">{destinationOf(channel)}</span>
                  {!channel.enabled && <span className="microlabel text-faint">paused</span>}
                  <div className="ml-auto flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={test.isPending}
                      onClick={() => test.mutate(channel.id)}
                    >
                      <Send className="size-3.5" strokeWidth={1.5} /> Test
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={toggle.isPending}
                      onClick={() => toggle.mutate({ id: channel.id, enabled: !channel.enabled })}
                    >
                      {channel.enabled ? "Pause" : "Resume"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={remove.isPending}
                      onClick={() => remove.mutate(channel.id)}
                      aria-label="Remove channel"
                    >
                      <Trash2 className="size-4" strokeWidth={1.5} />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {adding ? (
            <form onSubmit={submitAdd} className="mt-4 flex flex-col gap-2">
              <Input
                autoFocus
                type={adding === "EMAIL" ? "email" : "text"}
                placeholder={adding === "EMAIL" ? "you@company.com" : "Telegram chat id (e.g. 123456789)"}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                required
                className="max-w-sm"
              />
              {adding === "TELEGRAM" && (
                <p className="max-w-lg text-xs text-faint">
                  Start a chat with our bot, then message <span className="font-data">@userinfobot</span> to
                  get your numeric chat id and paste it here.
                </p>
              )}
              <div className="flex gap-2">
                <Button type="submit" size="sm" disabled={add.isPending}>
                  {add.isPending ? "Adding…" : "Add channel"}
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => setAdding(null)}>
                  Cancel
                </Button>
              </div>
            </form>
          ) : (
            <div className="mt-4 flex flex-wrap gap-2">
              {available.includes("EMAIL") && (
                <Button variant="secondary" size="sm" onClick={() => { setAdding("EMAIL"); setValue(""); }}>
                  <Mail className="size-3.5" strokeWidth={1.5} /> Add email
                </Button>
              )}
              {available.includes("TELEGRAM") && (
                <Button variant="secondary" size="sm" onClick={() => { setAdding("TELEGRAM"); setValue(""); }}>
                  <Send className="size-3.5" strokeWidth={1.5} /> Add Telegram
                </Button>
              )}
              {available.length === 0 && (
                <p className="text-sm text-faint">
                  No delivery channels are configured on the server yet (set RESEND_API_KEY or
                  TELEGRAM_BOT_TOKEN).
                </p>
              )}
            </div>
          )}
        </>
      )}

      {notice && <p className="mt-4 text-xs text-muted">{notice}</p>}
    </section>
  );
}
