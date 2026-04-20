#!/usr/bin/env node
/**
 * Runs Vitest only for tests related to staged files.
 * Used in the pre-commit hook for fast feedback without running the full suite.
 */

import { execSync, spawnSync } from "child_process";

const stagedOutput = execSync("git diff --cached --name-only --diff-filter=ACM", {
  encoding: "utf-8",
});

const stagedFiles = stagedOutput
  .split("\n")
  .map((f) => f.trim())
  .filter((f) => f.startsWith("src/") && (f.endsWith(".ts") || f.endsWith(".tsx")));

if (stagedFiles.length === 0) {
  process.exit(0);
}

const result = spawnSync(
  "npx",
  ["vitest", "related", "--run", "--passWithNoTests", ...stagedFiles],
  { stdio: "inherit", shell: true },
);

process.exit(result.status ?? 0);
