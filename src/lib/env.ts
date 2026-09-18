import { z } from "zod";

const envSchema = z.object({
  EXPO_PUBLIC_BFF_URL: z.string().default("http://localhost:3000"),
});

export const env = envSchema.parse({
  EXPO_PUBLIC_BFF_URL: process.env.EXPO_PUBLIC_BFF_URL,
});
