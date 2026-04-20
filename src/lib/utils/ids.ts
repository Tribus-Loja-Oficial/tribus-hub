import { randomBytes } from "crypto";

/**
 * Generates a URL-safe unique ID using random bytes.
 * Format: 24-char base62 string.
 */
export function createId(): string {
  const bytes = randomBytes(18);
  return bytes.toString("base64url").slice(0, 24);
}

/**
 * Generates a URL-safe slug from a title.
 */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 100);
}

/**
 * Generates a unique slug by appending a short random suffix.
 */
export function uniqueSlug(title: string): string {
  const base = slugify(title);
  const suffix = randomBytes(3).toString("hex");
  return `${base}-${suffix}`;
}
