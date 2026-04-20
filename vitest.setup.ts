import "@testing-library/jest-dom";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

// Stub environment variables for all tests
vi.stubEnv("DATABASE_URL", "postgresql://test:test@localhost:5432/test");
vi.stubEnv("AUTH_SECRET", "test-secret-that-is-at-least-32-chars-long");
vi.stubEnv("R2_ACCOUNT_ID", "test-account");
vi.stubEnv("R2_ACCESS_KEY_ID", "test-key");
vi.stubEnv("R2_SECRET_ACCESS_KEY", "test-secret");
vi.stubEnv("R2_BUCKET_NAME", "test-bucket");
vi.stubEnv("NODE_ENV", "test");

// Mock IntersectionObserver (required for components using useInView)
class IntersectionObserverMock implements IntersectionObserver {
  readonly root: Element | Document | null = null;
  readonly rootMargin = "";
  readonly thresholds: ReadonlyArray<number> = [];
  disconnect = vi.fn();
  observe = vi.fn();
  takeRecords = () => [] as IntersectionObserverEntry[];
  unobserve = vi.fn();
}
globalThis.IntersectionObserver =
  IntersectionObserverMock as unknown as typeof IntersectionObserver;

// Auto-cleanup after each test
afterEach(() => {
  cleanup();
});
