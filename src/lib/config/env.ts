import "server-only";
import { z } from "zod";
import { config } from "dotenv";
import { resolve } from "path";

// Next.js loads .env.local automatically. When running scripts via tsx (seed,
// migrations, etc.) we need to load it ourselves.
if (!process.env["NEXT_RUNTIME"]) {
  config({ path: resolve(process.cwd(), ".env.local") });
}

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

  // App
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
  NEXT_PUBLIC_APP_NAME: z.string().default("Tribus Hub"),

  // Auth
  AUTH_SECRET: z.string().min(32, "AUTH_SECRET must be at least 32 characters"),
  AUTH_URL: z.string().url().optional(),

  // Internal API (hub-api Worker + D1)
  HUB_API_URL: z.string().url().optional(),
  HUB_API_INTERNAL_SECRET: z.string().min(16).optional(),

  // Cloudflare R2 (optional — uploads are disabled when not configured)
  R2_ACCOUNT_ID: z.string().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_BUCKET_NAME: z.string().default("tribus-hub-assets"),
  R2_PUBLIC_URL: z.string().url().optional(),

  // Upload limits
  UPLOAD_MAX_SIZE_BYTES: z.coerce.number().default(52_428_800), // 50MB
  UPLOAD_ALLOWED_MIME_TYPES: z
    .string()
    .default(
      "image/jpeg,image/png,image/webp,image/gif,application/pdf,text/plain",
    ),

  // Email (optional)
  EMAIL_FROM: z.string().email().optional(),
  EMAIL_SERVER_HOST: z.string().optional(),
  EMAIL_SERVER_PORT: z.coerce.number().optional(),
  EMAIL_SERVER_USER: z.string().optional(),
  EMAIL_SERVER_PASSWORD: z.string().optional(),
});

function parseEnv() {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const formatted = result.error.format();
    console.error("Invalid environment variables:", JSON.stringify(formatted, null, 2));
    throw new Error("Invalid environment variables. Check server logs for details.");
  }

  return result.data;
}

export const env = parseEnv();

export type Env = z.infer<typeof envSchema>;
