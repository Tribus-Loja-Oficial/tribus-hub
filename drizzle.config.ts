import { defineConfig } from "drizzle-kit";
import { config } from "dotenv";
import { resolve } from "path";

// drizzle-kit does not load .env.local automatically — do it here
config({ path: resolve(process.cwd(), ".env.local") });

const databaseUrl = process.env["DATABASE_URL"];
if (!databaseUrl) {
  throw new Error("DATABASE_URL is not set. Check your .env.local file.");
}

export default defineConfig({
  schema: "./src/lib/db/schema/index.ts",
  out: "./src/lib/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: databaseUrl,
  },
  verbose: true,
  strict: true,
});
