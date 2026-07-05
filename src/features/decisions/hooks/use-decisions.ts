"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Company, Decision } from "@prisma/client";

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

const KEY = ["decisions"];

export function useDecisions() {
  return useQuery({
    queryKey: KEY,
    queryFn: () => jsonFetch<{ decisions: Decision[] }>("/api/decisions"),
  });
}

export function useCompanies() {
  return useQuery({
    queryKey: ["companies"],
    queryFn: () => jsonFetch<{ companies: Company[] }>("/api/companies"),
  });
}

export function useCreateDecision() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { companyId: string; title: string; context: string }) =>
      jsonFetch("/api/decisions", { method: "POST", body: JSON.stringify(input) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useUpdateDecision() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...patch }: { id: string } & Record<string, unknown>) =>
      jsonFetch(`/api/decisions/${id}`, { method: "PATCH", body: JSON.stringify(patch) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useDeleteDecision() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => jsonFetch(`/api/decisions/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}
