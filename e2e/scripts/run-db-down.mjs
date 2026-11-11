// Runs the @db-down tests: stops the database, runs them, and always starts
// the database again, even when the tests fail or the run is interrupted.
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const e2eDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = path.resolve(e2eDir, "..");
const playwrightCli = createRequire(import.meta.url).resolve("@playwright/test/cli");

function compose(...args) {
  const result = spawnSync("docker", ["compose", ...args], { cwd: repoRoot, stdio: "inherit" });
  if (result.status !== 0) {
    throw new Error(`docker compose ${args.join(" ")} failed`);
  }
}

let restored = false;
function restoreDatabase() {
  if (restored) return;
  restored = true;
  console.log("\nStarting the database again...");
  compose("up", "-d", "--wait", "db");
}

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    restoreDatabase();
    process.exit(1);
  });
}

let exitCode = 1;
try {
  console.log("Stopping the database...");
  compose("stop", "db");

  const run = spawnSync(
    process.execPath,
    [playwrightCli, "test", ...process.argv.slice(2)],
    { cwd: e2eDir, stdio: "inherit", env: { ...process.env, E2E_DB_DOWN: "1" } },
  );
  exitCode = run.status ?? 1;
} finally {
  restoreDatabase();
}

process.exit(exitCode);
