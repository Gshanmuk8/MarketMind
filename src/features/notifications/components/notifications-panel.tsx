"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ChannelType, NotificationChannel, NotificationSettings } from "@prisma/client";
import { Clock, Mail, Send, SlidersHorizontal, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Toggle } from "@/components/ui/toggle";

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
interface SettingsResponse {
  settings: NotificationSettings;
}

const CHANNELS_KEY = ["notification-channels"];
const SETTINGS_KEY = ["notification-settings"];

const DAY_NAMES = ["", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const FREQUENCIES = [
  { value: "DAILY", label: "Every day" },
  { value: "WEEKDAYS", label: "Weekdays (Mon–Fri)" },
  { value: "WEEKLY", label: "Weekly" },
  { value: "MONTHLY", label: "Monthly" },
  { value: "INSTANT_ONLY", label: "No digest (instant alerts only)" },
] as const;
const SEVERITIES = [
  { value: "INFO", label: "Everything" },
  { value: "NOTABLE", label: "Notable and up" },
  { value: "IMPORTANT", label: "Important and up" },
  { value: "CRITICAL", label: "Critical only" },
] as const;

const FALLBACK_TZ = ["UTC", "Asia/Kolkata", "America/New_York", "Europe/London", "Asia/Singapore"];

/** Friendly, searchable shortcuts pinned to the top of the timezone list. */
const COMMON_TZ_LABELED: { value: string; label: string }[] = [
  { value: "Asia/Kolkata", label: "India — Kolkata / Mumbai (IST)" },
  { value: "America/New_York", label: "US Eastern — New York" },
  { value: "America/Chicago", label: "US Central — Chicago" },
  { value: "America/Los_Angeles", label: "US Pacific — Los Angeles" },
  { value: "Europe/London", label: "UK — London" },
  { value: "Europe/Berlin", label: "Central Europe — Berlin / Paris" },
  { value: "Asia/Dubai", label: "Gulf — Dubai" },
  { value: "Asia/Singapore", label: "Singapore" },
  { value: "Asia/Tokyo", label: "Japan — Tokyo" },
  { value: "Australia/Sydney", label: "Australia — Sydney" },
  { value: "UTC", label: "UTC" },
];


function destinationOf(channel: NotificationChannel): string {
  const config = (channel.config ?? {}) as { email?: string; chatId?: string };
  return config.email ?? config.chatId ?? "—";
}

function scheduleSummary(c: NotificationChannel): string {
  if (c.frequency === "INSTANT_ONLY") return "Instant alerts only";
  const when =
    c.frequency === "WEEKLY"
      ? `Weekly · ${DAY_NAMES[c.weeklyDay ?? 1]}`
      : c.frequency === "MONTHLY"
        ? `Monthly · day ${c.monthlyDay ?? 1}`
        : c.frequency === "WEEKDAYS"
          ? "Weekdays"
          : "Daily";
  return `${when} · ${c.deliveryTime}`;
}

/**
 * The delivery desk (doc 12): connect email / Telegram, then control when,
 * how often, and how urgent. Every control responds instantly (optimistic),
 * timezone auto-detects, and the full IANA zone list is selectable.
 */
export function NotificationsPanel() {
  const qc = useQueryClient();
  const [adding, setAdding] = useState<ChannelType | null>(null);
  const [value, setValue] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const channelsQ = useQuery({
    queryKey: CHANNELS_KEY,
    queryFn: () => jsonFetch<ChannelsResponse>("/api/notifications"),
  });
  const invalidate = () => qc.invalidateQueries({ queryKey: CHANNELS_KEY });

  const add = useMutation({
    mutationFn: (input: { type: ChannelType; config: Record<string, string> }) =>
      jsonFetch("/api/notifications", { method: "POST", body: JSON.stringify(input) }),
    onSuccess: () => {
      setAdding(null);
      setValue("");
      setNotice("Channel added. Set its schedule, then send a test.");
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

  const saveSchedule = useMutation({
    mutationFn: ({ id, ...body }: { id: string } & Record<string, unknown>) =>
      jsonFetch(`/api/notifications/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
    onSuccess: () => {
      setEditing(null);
      setNotice("Schedule saved.");
      invalidate();
    },
    onError: (e) => setNotice((e as Error).message),
  });

  function submitAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!adding) return;
    const config: Record<string, string> =
      adding === "EMAIL" ? { email: value.trim() } : { chatId: value.trim() };
    add.mutate({ type: adding, config });
  }

  const channels = channelsQ.data?.channels ?? [];
  const available = channelsQ.data?.available ?? [];

  return (
    <section className="rise">
      <p className="microlabel mb-1">Delivery — memos, digests &amp; alerts</p>
      <p className="mb-6 max-w-lg text-sm leading-relaxed text-muted">
        Your intelligence, delivered where you already are. Connect a channel, then choose exactly
        when it arrives, how often, and how urgent it has to be.
      </p>

      <DeliveryPreferences onNotice={setNotice} />

      <div className="mt-10">
        <p className="microlabel mb-3">Channels</p>
        {channelsQ.isPending ? (
          <Skeleton className="h-24" />
        ) : channelsQ.isError ? (
          <div className="flex items-center gap-3">
            <p className="text-sm text-critical">Couldn&apos;t load your channels.</p>
            <Button variant="secondary" size="sm" onClick={() => channelsQ.refetch()}>
              Retry
            </Button>
          </div>
        ) : (
          <>
            {channels.length > 0 && (
              <div className="flex flex-col gap-3">
                {channels.map((channel) => (
                  <div
                    key={channel.id}
                    className="rounded-xl border border-border bg-surface p-4 shadow-[var(--shadow-card)] transition-all duration-200 hover:shadow-[var(--shadow-lifted)]"
                  >
                    <div className="flex flex-wrap items-center gap-3">
                      <Badge variant={channel.enabled ? "live" : "default"}>
                        {channel.type.toLowerCase()}
                      </Badge>
                      <span className="break-all font-data text-sm">{destinationOf(channel)}</span>
                      <span className="flex items-center gap-1.5 text-xs text-faint">
                        <Clock className="size-3" strokeWidth={1.5} /> {scheduleSummary(channel)}
                        {channel.instantAlerts && " · instant"}
                      </span>
                      {!channel.enabled && <span className="microlabel text-faint">paused</span>}
                      <div className="ml-auto flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditing(editing === channel.id ? null : channel.id)}
                        >
                          <SlidersHorizontal className="size-3.5" strokeWidth={1.5} /> Schedule
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          loading={test.isPending && test.variables === channel.id}
                          onClick={() => test.mutate(channel.id)}
                        >
                          <Send className="size-3.5" strokeWidth={1.5} /> Test
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          loading={toggle.isPending && toggle.variables?.id === channel.id}
                          onClick={() => toggle.mutate({ id: channel.id, enabled: !channel.enabled })}
                        >
                          {channel.enabled ? "Pause" : "Resume"}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          loading={remove.isPending && remove.variables === channel.id}
                          onClick={() => remove.mutate(channel.id)}
                          aria-label="Remove channel"
                        >
                          <Trash2 className="size-4" strokeWidth={1.5} />
                        </Button>
                      </div>
                    </div>

                    {editing === channel.id && (
                      <ScheduleEditor
                        channel={channel}
                        saving={saveSchedule.isPending}
                        onCancel={() => setEditing(null)}
                        onSave={(body) => saveSchedule.mutate({ id: channel.id, ...body })}
                      />
                    )}
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
                  <Button type="submit" size="sm" loading={add.isPending}>
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
      </div>

      {notice && <p className="mt-4 text-xs text-muted">{notice}</p>}
    </section>
  );
}

/* ── per-channel schedule editor (local state — instant) ─────────────── */

function ScheduleEditor({
  channel,
  saving,
  onSave,
  onCancel,
}: {
  channel: NotificationChannel;
  saving: boolean;
  onSave: (body: Record<string, unknown>) => void;
  onCancel: () => void;
}) {
  const [frequency, setFrequency] = useState(channel.frequency);
  const [deliveryTime, setDeliveryTime] = useState(channel.deliveryTime);
  const [weeklyDay, setWeeklyDay] = useState(channel.weeklyDay ?? 1);
  const [monthlyDay, setMonthlyDay] = useState(channel.monthlyDay ?? 1);
  const [priorityThreshold, setPriorityThreshold] = useState(channel.priorityThreshold);
  const [instantAlerts, setInstantAlerts] = useState(channel.instantAlerts);

  const isDigest = frequency !== "INSTANT_ONLY";

  return (
    <div className="mt-4 grid grid-cols-1 gap-4 rounded-xl border border-border bg-surface-raised/40 p-5 sm:grid-cols-2">
      <label className="flex flex-col gap-1.5">
        <span className="microlabel">How often</span>
        <Select
          value={frequency}
          onChange={(e) => setFrequency(e.target.value as typeof frequency)}
        >
          {FREQUENCIES.map((f) => (
            <option key={f.value} value={f.value}>{f.label}</option>
          ))}
        </Select>
      </label>

      {isDigest && (
        <label className="flex flex-col gap-1.5">
          <span className="microlabel">Delivery time</span>
          <Input
            type="time"
            value={deliveryTime}
            onChange={(e) => setDeliveryTime(e.target.value)}
            className="max-w-[10rem]"
          />
        </label>
      )}

      {frequency === "WEEKLY" && (
        <label className="flex flex-col gap-1.5">
          <span className="microlabel">Day of week</span>
          <Select value={weeklyDay} onChange={(e) => setWeeklyDay(Number(e.target.value))}>
            {[1, 2, 3, 4, 5, 6, 7].map((d) => (
              <option key={d} value={d}>{DAY_NAMES[d]}</option>
            ))}
          </Select>
        </label>
      )}

      {frequency === "MONTHLY" && (
        <label className="flex flex-col gap-1.5">
          <span className="microlabel">Day of month</span>
          <Input
            type="number"
            min={1}
            max={28}
            value={monthlyDay}
            onChange={(e) => setMonthlyDay(Math.min(28, Math.max(1, Number(e.target.value) || 1)))}
            className="max-w-[6rem]"
          />
        </label>
      )}

      <label className="flex flex-col gap-1.5">
        <span className="microlabel">Only include</span>
        <Select
          value={priorityThreshold}
          onChange={(e) => setPriorityThreshold(e.target.value as typeof priorityThreshold)}
        >
          {SEVERITIES.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </Select>
      </label>

      <div className="flex items-center gap-3 sm:col-span-2">
        <Toggle checked={instantAlerts} onChange={setInstantAlerts} label="Instant alerts" />
        <span className="text-sm text-foreground">
          Also alert me instantly on important/critical signals (out of schedule)
        </span>
      </div>

      <div className="flex gap-2 sm:col-span-2">
        <Button
          size="sm"
          loading={saving}
          onClick={() =>
            onSave({ frequency, deliveryTime, weeklyDay, monthlyDay, priorityThreshold, instantAlerts })
          }
        >
          Save schedule
        </Button>
        <Button variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

/* ── per-user delivery preferences (optimistic — instant) ────────────── */

function DeliveryPreferences({ onNotice }: { onNotice: (m: string) => void }) {
  const qc = useQueryClient();
  const { data, isPending } = useQuery({
    queryKey: SETTINGS_KEY,
    queryFn: () => jsonFetch<SettingsResponse>("/api/notifications/settings"),
  });

  const save = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      jsonFetch("/api/notifications/settings", { method: "PATCH", body: JSON.stringify(body) }),
    // Optimistic: reflect the change instantly so every control feels live.
    onMutate: async (patch) => {
      await qc.cancelQueries({ queryKey: SETTINGS_KEY });
      const prev = qc.getQueryData<SettingsResponse>(SETTINGS_KEY);
      if (prev) {
        qc.setQueryData<SettingsResponse>(SETTINGS_KEY, {
          settings: { ...prev.settings, ...(patch as Partial<NotificationSettings>) },
        });
      }
      return { prev };
    },
    onError: (e, _patch, ctx) => {
      if (ctx?.prev) qc.setQueryData(SETTINGS_KEY, ctx.prev);
      onNotice((e as Error).message);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: SETTINGS_KEY }),
  });

  const browserTz = useMemo(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    } catch {
      return "UTC";
    }
  }, []);

  const allZones = useMemo(() => {
    try {
      const z = (Intl as unknown as { supportedValuesOf?: (k: string) => string[] }).supportedValuesOf?.(
        "timeZone"
      );
      if (Array.isArray(z) && z.length) return z;
    } catch {
      /* older browser — fall through */
    }
    return FALLBACK_TZ;
  }, []);

  // Adopt the browser's timezone once, if the account is still on the UTC default.
  const adopted = useRef(false);
  useEffect(() => {
    if (!data || adopted.current) return;
    if (data.settings.timezone === "UTC" && browserTz !== "UTC") {
      adopted.current = true;
      save.mutate({ timezone: browserTz });
    }
  }, [data, browserTz]); // eslint-disable-line react-hooks/exhaustive-deps

  if (isPending || !data) return <Skeleton className="h-40" />;
  const s = data.settings;
  const zones = allZones.includes(s.timezone) ? allZones : [s.timezone, ...allZones];

  return (
    <div className="rounded-xl border border-border bg-surface p-6 shadow-[var(--shadow-card)]">
      <p className="microlabel mb-5">Delivery preferences</p>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5">
          <span className="microlabel">Your timezone</span>
          <Select
            value={s.timezone}
            onChange={(e) => save.mutate({ timezone: e.target.value })}
          >
            <optgroup label="Common">
              {COMMON_TZ_LABELED.map((z) => (
                <option key={`c-${z.value}`} value={z.value}>{z.label}</option>
              ))}
            </optgroup>
            <optgroup label="All timezones">
              {zones.map((z) => (
                <option key={z} value={z}>{z.replace(/_/g, " ")}</option>
              ))}
            </optgroup>
          </Select>
          <span className="text-xs text-faint">
            Delivery times use this zone — India is at the top of the list.
          </span>
        </label>

        <div className="flex flex-col gap-1.5">
          <span className="microlabel">Quiet hours (mutes instant alerts)</span>
          <div className="flex items-center gap-2">
            <Input
              type="time"
              value={s.quietHoursStart ?? ""}
              onChange={(e) => save.mutate({ quietHoursStart: e.target.value || null })}
              className="max-w-[8rem]"
              aria-label="Quiet hours start"
            />
            <span className="text-sm text-faint">to</span>
            <Input
              type="time"
              value={s.quietHoursEnd ?? ""}
              onChange={(e) => save.mutate({ quietHoursEnd: e.target.value || null })}
              className="max-w-[8rem]"
              aria-label="Quiet hours end"
            />
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface-raised/40 px-4 py-3 sm:col-span-2">
          <span className="text-sm text-foreground">Pause all delivery on weekends</span>
          <Toggle
            checked={s.weekendPause}
            onChange={(v) => save.mutate({ weekendPause: v })}
            label="Pause on weekends"
          />
        </div>

        <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface-raised/40 px-4 py-3 sm:col-span-2">
          <span className="text-sm text-foreground">Let critical alerts break through quiet hours</span>
          <Toggle
            checked={s.criticalOverridesQuiet}
            onChange={(v) => save.mutate({ criticalOverridesQuiet: v })}
            label="Critical overrides quiet hours"
          />
        </div>
      </div>
    </div>
  );
}
