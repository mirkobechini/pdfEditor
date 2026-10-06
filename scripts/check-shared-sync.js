/**
 * Check shared/src → generated copies byte-identity (Tranche 1, issue #908).
 *
 * shared/src is the single source of truth for auth/api/tauri/types. The
 * platform apps consume generated copies (frontend/src/shared and
 * desktop/frontend/src/shared) produced by scripts/copy-shared.js.
 *
 * This script:
 *   1. re-runs both copy-shared scripts (idempotent, pure fs, no deps);
 *   2. verifies every .ts/.tsx in shared/src is byte-identical in both copies.
 *
 * Exit code 1 on any mismatch/missing file, so CI fails fast if the
 * single-source mechanism regresses (hand-edited copy, restricted copy
 * script, or a forgotten platform).
 */
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const REPO_ROOT = path.resolve(__dirname, "..");
const SHARED_DIR = path.join(REPO_ROOT, "shared", "src");
const DEST_DIRS = [
  path.join(REPO_ROOT, "frontend", "src", "shared"),
  path.join(REPO_ROOT, "desktop", "frontend", "src", "shared"),
];
const COPY_SCRIPTS = [
  path.join(REPO_ROOT, "frontend", "scripts", "copy-shared.js"),
  path.join(REPO_ROOT, "desktop", "frontend", "scripts", "copy-shared.js"),
];

function copyShared() {
  for (const script of COPY_SCRIPTS) {
    if (!fs.existsSync(script)) {
      throw new Error(`copy-shared script not found: ${script}`);
    }
    execFileSync("node", [script], { stdio: "inherit" });
  }
}

function collectFiles(dir) {
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".ts") || f.endsWith(".tsx"))
    .sort();
}

function main() {
  copyShared();

  if (!fs.existsSync(SHARED_DIR)) {
    console.error(`shared/src not found: ${SHARED_DIR}`);
    process.exit(1);
  }

  const sourceFiles = collectFiles(SHARED_DIR);
  const errors = [];

  for (const destDir of DEST_DIRS) {
    if (!fs.existsSync(destDir)) {
      errors.push(`destinazione generata mancante: ${destDir}`);
      continue;
    }
    const destFiles = new Set(collectFiles(destDir));
    for (const f of sourceFiles) {
      if (!destFiles.has(f)) {
        errors.push(`manca in ${destDir}: ${f}`);
        continue;
      }
      const a = fs.readFileSync(path.join(SHARED_DIR, f));
      const b = fs.readFileSync(path.join(destDir, f));
      if (!a.equals(b)) {
        errors.push(`DRIFT in ${destDir}: ${f} non e' byte-identico a shared/src`);
      }
    }
  }

  if (errors.length > 0) {
    console.error(`[check-shared-sync] FAIL — ${errors.length} problema(i):`);
    for (const e of errors) console.error(`  - ${e}`);
    process.exit(1);
  }
  console.log(
    `[check-shared-sync] OK — ${sourceFiles.length} file shared/src in sync con ${DEST_DIRS.length} destinazioni`,
  );
}

main();