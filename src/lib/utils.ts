import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge Tailwind classes with conflict resolution. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Normalize anything a user might paste for their company site to a bare
 * domain: "MyCompany.com", "www.fitai.com/pricing", "https://fitai.com" →
 * "fitai.com". Throws on input that can't be a public website.
 */
export function extractDomain(url: string): string {
  const cleaned = url.trim().replace(/\s+/g, "");
  const withProtocol = /^https?:\/\//i.test(cleaned) ? cleaned : `https://${cleaned}`;
  const { hostname } = new URL(withProtocol);
  const domain = hostname.replace(/^www\./i, "").toLowerCase();

  // A public website needs a dot-separated domain with a plausible TLD.
  if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/.test(domain)) {
    throw new Error(`Not a valid website: ${url}`);
  }

  // Block IP-literals and internal hostnames — the analysis job fetches this
  // URL server-side, so an internal address (cloud metadata, RFC1918, loopback)
  // would be an SSRF vector. Only public DNS names are allowed.
  const labels = domain.split(".");
  const allNumeric = labels.every((l) => /^\d+$/.test(l));
  if (allNumeric || domain === "localhost" || /\.(local|internal|localhost|home|lan)$/.test(domain)) {
    throw new Error(`Not a public website: ${url}`);
  }
  return domain;
}

/** Format 0–100 scores consistently across the app. */
export function formatScore(score: number | null | undefined): string {
  return score == null ? "—" : `${Math.round(score)}`;
}
