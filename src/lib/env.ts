import { z } from "zod";

/**
 * Hosts a release build must never call: loopback, the emulator alias, private networks and mDNS
 * names — any of them means a development URL leaked into a store build.
 */
export function isLocalHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/\.$/, "").replace(/^\[|\]$/g, "");
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local")) return true;
  if (host === "::1" || host === "::" || host.startsWith("fc") || host.startsWith("fd") || host.startsWith("fe80:")) {
    return host.includes(":");
  }
  const octets = host.split(".").map(Number);
  if (octets.length !== 4 || octets.some((o) => !Number.isInteger(o) || o < 0 || o > 255)) return false;
  const [a, b] = octets;
  return (
    a === 127 || a === 10 || a === 0 || (a === 169 && b === 254) || (a === 192 && b === 168) || (a === 172 && b >= 16 && b <= 31)
  );
}

/**
 * The app's environment, validated once. `EXPO_PUBLIC_*` values are inlined into the bundle at
 * build time, so this runs on the device. A release build (`release: true`, i.e. not `__DEV__`)
 * must talk to the BFF over `https:` and never to a loopback address — a release pointed at
 * `http://localhost:3000` would ship tokens in clear text to whatever answers there (audit P2-05).
 */
export function parseEnv(raw: Record<string, string | undefined>, { release }: { release: boolean }) {
  const schema = z.object({
    EXPO_PUBLIC_BFF_URL: z
      .url({ protocol: /^https?$/, error: "EXPO_PUBLIC_BFF_URL must be an http(s) URL" })
      .default("http://localhost:3000")
      .transform((url) => url.replace(/\/+$/, ""))
      .refine((url) => !release || new URL(url).protocol === "https:", {
        error: "EXPO_PUBLIC_BFF_URL must use https in a release build",
      })
      .refine((url) => !release || !isLocalHost(new URL(url).hostname), {
        error: "EXPO_PUBLIC_BFF_URL must not point at a local address in a release build",
      }),
  });
  return schema.parse(raw);
}

// `process.env.EXPO_PUBLIC_*` must be read by its literal name for Expo to inline it.
export const env = parseEnv(
  { EXPO_PUBLIC_BFF_URL: process.env.EXPO_PUBLIC_BFF_URL },
  { release: !__DEV__ },
);
