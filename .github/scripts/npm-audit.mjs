// npm audit with a per-advisory allowlist. Fails on any high or critical advisory
// that is not in .github/npm-audit-allowlist.json, and on allowlist entries past
// their review date. Run from a directory with a package-lock.json:
//   node ../.github/scripts/npm-audit.mjs
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const BLOCKING = new Set(["high", "critical"]);

const allowlistPath = fileURLToPath(new URL("../npm-audit-allowlist.json", import.meta.url));
const allowlist = JSON.parse(readFileSync(allowlistPath, "utf8")).advisories;
const today = new Date().toISOString().slice(0, 10);

let report;
try {
  // A fixed command string: nothing from outside reaches the shell.
  report = execSync("npm audit --json", { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
} catch (error) {
  // npm audit exits non-zero when it finds anything; the JSON is still on stdout.
  report = error.stdout;
}
const vulnerabilities = JSON.parse(report).vulnerabilities ?? {};

// The advisories themselves are the "via" entries that are objects (strings point
// to other packages in the chain).
const advisories = new Map();
for (const vulnerability of Object.values(vulnerabilities)) {
  for (const via of vulnerability.via) {
    if (typeof via === "object" && BLOCKING.has(via.severity)) {
      const id = via.url.split("/").pop();
      advisories.set(id, `${via.severity}: ${via.name} — ${via.title} (${via.url})`);
    }
  }
}

let failed = false;

for (const [id, description] of advisories) {
  const entry = allowlist.find((a) => a.id === id);
  if (!entry) {
    console.error(`BLOCKING ${description}`);
    failed = true;
  } else if (entry.review_by < today) {
    console.error(`REVIEW DUE ${id} (${entry.package}): allowlisted until ${entry.review_by}. Check for a fix, then update or remove the entry.`);
    failed = true;
  } else {
    console.log(`allowed until ${entry.review_by}: ${description}`);
  }
}

for (const entry of allowlist) {
  if (!advisories.has(entry.id)) {
    console.log(`note: ${entry.id} (${entry.package}) no longer appears here; remove it from the allowlist once no directory reports it.`);
  }
}

if (failed) {
  process.exit(1);
}
console.log(advisories.size === 0 ? "No high or critical advisories." : "Only allowlisted advisories.");
