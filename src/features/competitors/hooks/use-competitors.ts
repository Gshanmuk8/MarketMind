"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Competitor, CompetitorStatus } from "@prisma/client";
import type { CompetitorSpark } from "@/features/competitors/service";

export type CompetitorRow = Competitor & { company: { id: string; name: string | null } };
export type { CompetitorSpark };
export type CompetitorsResponse = {
  competitors: CompetitorRow[];
  momentum: Record<string, CompetitorSpark>;
};

async function jsonFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(
      typeof data?.error === "string" ? data.error : "Request failed. Please try again."
    );
  }
  return res.json();
}

const KEY = ["competitors"];

export function useCompetitors() {
  return useQuery({
    queryKey: KEY,
    queryFn: () => jsonFetch<CompetitorsResponse>("/api/competitors"),
  });
}

/** Track every suggested competitor in one action. */
export function useTrackAllCompetitors() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (ids: string[]) => {
      await Promise.all(
        ids.map((id) =>
          jsonFetch(`/api/competitors/${id}`, {
            method: "PATCH",
            body: JSON.stringify({ status: "TRACKING" }),
          })
        )
      );
    },
    onSettled: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useUpdateCompetitorStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: CompetitorStatus }) =>
      jsonFetch(`/api/competitors/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}
