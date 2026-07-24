import net from "node:net";
import dns from "node:dns";
import { fetch as undiciFetch, Agent, type RequestInit, type Response } from "undici";

/**
 * SSRF-hardened outbound fetch for URLs derived from user input (company sites,
 * discovered competitor domains, their pricing/careers subpages).
 *
 * A plain `fetch` on a user-controlled URL exposes three host-controlling SSRF
 * vectors that the `extractDomain` string guard cannot cover:
 *   1. Redirects — a target can 3xx to http://169.254.169.254/ (cloud metadata)
 *      or http://localhost:PORT/.
 *   2. DNS — a public name can resolve to an internal address.
 *   3. DNS rebinding — the name resolves public when validated, then flips to
 *      internal for the actual connection.
 *
 * Two layers close all three:
 *   - `assertUrlAllowed` runs on the initial URL and every redirect hop: it
 *     enforces http(s) and rejects IP-literal internal hosts. (undici's
 *     connect-lookup is NOT invoked for IP literals, so they must be caught
 *     here — verified empirically.)
 *   - A shared undici Agent with a connect-time `lookup` resolves every
 *     hostname at the moment of connection and refuses any internal address.
 *     Because this is the same resolution undici connects with, it also closes
 *     the rebinding window.
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
  if (a === 192 && b === 0 && c === 2) return true; // documentation
  if (a === 198 && b === 51 && c === 100) return true;
  if (a === 203 && b === 0 && c === 113) return true;
  return false;
}

function isPrivateIpv6(ip: string): boolean {
  const addr = ip.toLowerCase().split("%")[0] ?? ip.toLowerCase(); // drop any zone id
  if (addr === "::1" || addr === "::") return true; // loopback / unspecified
  const embedded = addr.match(/::(?:ffff:)?(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/);
  if (embedded?.[1]) return isPrivateIpv4(embedded[1]); // IPv4-mapped/compatible
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

// Connect-time DNS guard. undici invokes this for hostnames (never for IP
// literals) at the moment a socket is opened, so it catches public-name →
// internal resolution and DNS rebinding. TLS SNI still uses the URL hostname,
// so certificate validation is unaffected.
type LookupCb = (err: NodeJS.ErrnoException | null, address: unknown, family?: number) => void;
function guardedLookup(hostname: string, options: dns.LookupOptions, callback: LookupCb): void {
  dns.lookup(hostname, { ...options, all: true }, (err, addresses) => {
    if (err) return callback(err, "", 0);
    const list = Array.isArray(addresses) ? addresses : [];
    if (list.length === 0) return callback(new Error(`No address for ${hostname}`), "", 0);
    for (const a of list) {
      if (isPrivateAddress(a.address)) {
        return callback(new Error(`Blocked internal address ${a.address} for ${hostname}`), "", 0);
      }
    }
    if (options.all) return callback(null, list);
    const first = list[0]!;
    return callback(null, first.address, first.family);
  });
}

const safeAgent = new Agent({
  connect: { lookup: guardedLookup as unknown as undefined },
});

function assertUrlAllowed(raw: string): void {
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
  // IP-literal hosts skip DNS, so the connect-lookup guard never sees them.
  if (net.isIP(host) && isPrivateAddress(host)) {
    throw new Error(`Blocked internal address: ${host}`);
  }
}

const MAX_REDIRECTS = 5;

/**
 * `fetch` that refuses to connect to internal/loopback/link-local/metadata
 * addresses — on the initial request, on every redirect hop, and at the socket
 * level (rebinding-safe). Drop-in for plain `fetch` against user-derived URLs.
 */
export async function safeFetch(rawUrl: string, init: RequestInit = {}): Promise<Response> {
  let current = rawUrl;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    assertUrlAllowed(current);
    const res = await undiciFetch(current, { ...init, dispatcher: safeAgent, redirect: "manual" });
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
