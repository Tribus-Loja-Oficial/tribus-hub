import { env } from "./env";

export const featureFlags = {
  darkMode: true,
  pageRevisions: true,
  auditLog: true,
  fileUploads: true,
  search: true,
  // Not in MVP
  realtimeCollaboration: false,
  aiAssistant: false,
  publicPageSharing: false,
  notifications: false,
} as const;

export type FeatureFlags = typeof featureFlags;

export function isFeatureEnabled(flag: keyof FeatureFlags): boolean {
  return featureFlags[flag];
}
