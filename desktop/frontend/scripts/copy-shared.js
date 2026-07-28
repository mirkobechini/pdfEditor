/**
 * Prebuild script: copies shared/src/ into src/shared/
 * before Next.js build, so Turbopack can resolve the imports.
 *
 * shared/src/ is the single source of truth for auth, api, error-map, types.
 * This script runs automatically via "prebuild" in package.json.
 */
const fs = require("fs");
const path = require("path");

const srcDir = path.resolve(__dirname, "../../../shared/src");
const destDir = path.resolve(__dirname, "../src/shared");

// Ensure destination exists
fs.mkdirSync(destDir, { recursive: true });

// Copy all .ts and .tsx files from shared/src
const files = fs.readdirSync(srcDir);
for (const file of files) {
    if (file.endsWith(".ts") || file.endsWith(".tsx")) {
        fs.copyFileSync(path.join(srcDir, file), path.join(destDir, file));
    }
}

console.log(`[prebuild] Copied ${files.length} files from shared/src/ to src/shared/`);