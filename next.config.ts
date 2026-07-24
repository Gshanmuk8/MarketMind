import type { NextConfig } from "next";

/** Baseline security headers (doc 19) — applied to every response. */
const securityHeaders = [
  // The app is never embedded — block clickjacking outright.
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  // A conservative CSP: only directives that can't break the app (the terminal
  // uses inline style attributes and Next injects inline bootstrap scripts, so
  // script-src/style-src are intentionally omitted rather than weakened with
  // 'unsafe-inline'). These block base-tag hijacking, plugin embedding, form
  // exfiltration, and framing — defense-in-depth atop React's escaping.
  {
    key: "Content-Security-Policy",
    value: "base-uri 'self'; object-src 'none'; form-action 'self'; frame-ancestors 'none'",
  },
];

const nextConfig: NextConfig = {
  // Don't advertise the framework/version in a response header.
  poweredByHeader: false,
  // The app renders no next/image, so the built-in image optimizer is pure
  // attack surface: a wildcard remote host would let /_next/image fetch and
  // run libvips/sharp over attacker-controlled images (SSRF + CVE surface).
  // Deny all remote images — nothing legitimate uses it.
  images: {
    remotePatterns: [],
  },
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

export default nextConfig;
