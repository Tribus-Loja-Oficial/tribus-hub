import { env } from "./env";

export const appConfig = {
  name: env.NEXT_PUBLIC_APP_NAME,
  url: env.NEXT_PUBLIC_APP_URL,
  isProduction: env.NODE_ENV === "production",
  isDevelopment: env.NODE_ENV === "development",

  upload: {
    maxSizeBytes: env.UPLOAD_MAX_SIZE_BYTES,
    allowedMimeTypes: env.UPLOAD_ALLOWED_MIME_TYPES.split(",").map((t) => t.trim()),
  },

  pagination: {
    defaultPageSize: 20,
    maxPageSize: 100,
  },

  editor: {
    autosaveDebounceMs: 1500,
  },

  audit: {
    enabled: true,
  },

  workspace: {
    defaultSlug: "tribus",
    defaultName: "Tribus",
  },
} as const;

export type AppConfig = typeof appConfig;
