import { z } from "zod";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "0.0.0.0", "10.0.2.2", "::1", "[::1]"]);

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
      .refine((url) => !release || !LOCAL_HOSTS.has(new URL(url).hostname), {
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
