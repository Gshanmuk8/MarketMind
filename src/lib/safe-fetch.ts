import net from "node:net";
import dns from "node:dns/promises";

/**
 * SSRF-hardened outbound fetch for URLs derived from user input (company sites,
 * discovered competitor domains, their pricing/careers subpages).
 *
 * The hostname-string guard in `extractDomain` blocks obvious literals, but two
 * host-controlling SSRF vectors remain for a plain `fetch`:
 *   1. Redirects — a malicious/compromised target can 3xx-redirect to
 *      http://169.254.169.254/ (cloud metadata) or http://localhost:PORT/.
 *   2. DNS — a public name (metadata.attacker.com) can resolve to an internal
 *      address, or flip to one (rebinding).
 *
 * This module closes both: every hop (initial + each redirect) must be http(s),
 * must resolve, and every resolved address must be public. Redirects are
 * followed manually so the target is re-validated before we connect to it.
 */

function ipv4Parts(ip: string): [number, number, number, number] | null {
  const m = ip.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!m) return null;
  const a = Number(m[1]);
  const b = Number(m[2]);
  const c = Number(m[3]);
  const d = Number(m[4]);
  return [a, b, c, d].some((p) => p > 255) ? null : [a, b, c, d];
}

function isPrivateIpv4(ip: string): boolean {
  const p = ipv4Parts(ip);
  if (!p) return true; // unparseable → fail closed
  const [a, b, c] = p;
  if (a === 0 || a === 10 || a === 127) return true; // this-net, RFC1918-10, loopback
  if (a === 169 && b === 254) return true; // link-local incl. 169.254.169.254 metadata
  if (a === 172 && b >= 16 && b <= 31) return true; // RFC1918-172
  if (a === 192 && b === 168) return true; // RFC1918-192
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT 100.64/10
  if (a === 192 && b === 0 && c === 0) return true; // 192.0.0.0/24
  if (a === 198 && (b === 18 || b === 19)) return true; // benchmarking 198.18/15
  if (a >= 224) return true; // multicast (224/4) + reserved (240/4) + broadcast
  // Documentation ranges — harmless but never a real target.
  if (a === 192 && b === 0 && c === 2) return true;
  if (a === 198 && b === 51 && c === 100) return true;
  if (a === 203 && b === 0 && c === 113) return true;
  return false;
}

function isPrivateIpv6(ip: string): boolean {
  const addr = ip.toLowerCase().split("%")[0] ?? ip.toLowerCase(); // drop any zone id
  if (addr === "::1" || addr === "::") return true; // loopback / unspecified
  // IPv4-mapped (::ffff:a.b.c.d) or -compatible (::a.b.c.d) — judge the embedded v4.
  const embedded = addr.match(/::(?:ffff:)?(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/);
  if (embedded?.[1]) return isPrivateIpv4(embedded[1]);
  if (/^f[cd]/.test(addr)) return true; // unique-local fc00::/7
  if (/^fe[89ab]/.test(addr)) return true; // link-local fe80::/10
  if (/^fe[cdef]/.test(addr)) return true; // deprecated site-local fec0::/10
  if (/^ff/.test(addr)) return true; // multicast ff00::/8
  return false;
}

/** True for any address we must never connect to server-side. Fails closed. */
export function isPrivateAddress(ip: string): boolean {
  const kind = net.isIP(ip);
  if (kind === 4) return isPrivateIpv4(ip);
  if (kind === 6) return isPrivateIpv6(ip);
  return true; // not an IP we understand → refuse
}

async function assertPublicUrl(raw: string): Promise<void> {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    throw new Error("Invalid URL");
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") {
    throw new Error(`Blocked non-HTTP(S) scheme: ${u.protocol}`);
  }
  const host = u.hostname.replace(/^\[|\]$/g, ""); // unwrap IPv6 brackets
  if (net.isIP(host)) {
    if (isPrivateAddress(host)) throw new Error(`Blocked internal address: ${host}`);
    return;
  }
  let addresses: { address: string }[];
  try {
    addresses = await dns.lookup(host, { all: true });
  } catch {
    throw new Error(`DNS resolution failed: ${host}`);
  }
  if (addresses.length === 0) throw new Error(`No address for ${host}`);
  // Fail closed: if ANY resolved address is internal, refuse the whole host —
  // don't let an attacker mix a public and a private A record.
  for (const a of addresses) {
    if (isPrivateAddress(a.address)) {
      throw new Error(`Blocked internal address for ${host}: ${a.address}`);
    }
  }
}

const MAX_REDIRECTS = 5;

/**
 * `fetch` that refuses to connect to internal/loopback/link-local/metadata
 * addresses, on the initial request and on every redirect hop. Drop-in for the
 * plain `fetch` used against user-derived URLs.
 */
export async function safeFetch(rawUrl: string, init: RequestInit = {}): Promise<Response> {
  let current = rawUrl;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    await assertPublicUrl(current);
    const res = await fetch(current, { ...init, redirect: "manual" });
    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get("location");
      if (!location) return res;
      current = new URL(location, current).toString();
      continue;
    }
    return res;
  }
  throw new Error("Too many redirects");
}
