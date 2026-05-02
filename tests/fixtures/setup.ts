import { vi } from "vitest";

// Mock environment variables for tests
vi.stubEnv("DATABASE_URL", "postgresql://test:test@localhost:5432/test");
vi.stubEnv("AUTH_SECRET", "test-secret-that-is-at-least-32-chars-long");
vi.stubEnv("NODE_ENV", "test");
