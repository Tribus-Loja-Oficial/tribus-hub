import { vi } from "vitest";

// Mock environment variables for tests
vi.stubEnv("DATABASE_URL", "postgresql://test:test@localhost:5432/test");
vi.stubEnv("AUTH_SECRET", "test-secret-that-is-at-least-32-chars-long");
vi.stubEnv("R2_ACCOUNT_ID", "test-account");
vi.stubEnv("R2_ACCESS_KEY_ID", "test-key");
vi.stubEnv("R2_SECRET_ACCESS_KEY", "test-secret");
vi.stubEnv("R2_BUCKET_NAME", "test-bucket");
vi.stubEnv("NODE_ENV", "test");
