/**
 * Bump version script — cross-platform (Node.js)
 * Updates ALL version files to the specified version.
 * Usage: node scripts/bump-version.js <new-version>
 * Example: node scripts/bump-version.js 0.1.26
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const newVer = process.argv[2];

if (!newVer || !/^\d+\.\d+\.\d+$/.test(newVer)) {
    console.error("Usage: node scripts/bump-version.js <semver>");
    console.error("Example: node scripts/bump-version.js 0.1.26");
    process.exit(1);
}

const FILES = [
    // JSON files (require parse/stringify to preserve formatting)
    { path: "frontend/package.json", type: "json", key: "version" },
    { path: "desktop/frontend/package.json", type: "json", key: "version" },
    { path: "desktop/src-tauri/tauri.conf.json", type: "json", key: "version" },
    { path: "desktop/frontend/package-lock.json", type: "json", key: "version" },
    // Mobile (Expo) — package.json + app.json (expo.version)
    { path: "mobile/package.json", type: "json", key: "version" },
    { path: "mobile/app.json", type: "json", key: "version", nestedKey: "expo" },
    // TOML files
    { path: "desktop/src-tauri/Cargo.toml", type: "regex", pattern: /^(version\s*=\s*)"\d+\.\d+\.\d+"/m, replacement: `$1"${newVer}"` },
    // TSX files
    { path: "desktop/frontend/src/app/startup/page.tsx", type: "regex", pattern: /(v)\d+\.\d+\.\d+/g, replacement: `$1${newVer}` },
    { path: "desktop/frontend/src/app/settings/page.tsx", type: "regex", pattern: /("v)\d+\.\d+\.\d+"/, replacement: `"v${newVer}"` },
    // i18n messages
    { path: "desktop/frontend/messages/en.json", type: "regex", pattern: /("version"\s*:\s*"v)\d+\.\d+\.\d+"/, replacement: `$1${newVer}"` },
    { path: "desktop/frontend/messages/it.json", type: "regex", pattern: /("version"\s*:\s*"v)\d+\.\d+\.\d+"/, replacement: `$1${newVer}"` },
    // TOML (pyproject)
    { path: "backend/pyproject.toml", type: "regex", pattern: /^(version\s*=\s*)"\d+\.\d+\.\d+"/m, replacement: `$1"${newVer}"` },
];

let count = 0;
for (const file of FILES) {
    const fullPath = path.join(ROOT, file.path);
    if (!fs.existsSync(fullPath)) {
        console.warn(`  ⚠️  Not found: ${file.path}`);
        continue;
    }
    const content = fs.readFileSync(fullPath, "utf8");

    if (file.type === "json") {
        const json = JSON.parse(content);
        if (file.nestedKey) {
            if (!json[file.nestedKey]) {
                console.warn(`  ⚠️  No "${file.nestedKey}" in ${file.path}`);
                continue;
            }
            if (!json[file.nestedKey][file.key]) {
                console.warn(`  ⚠️  No "${file.nestedKey}.${file.key}" in ${file.path}`);
                continue;
            }
            json[file.nestedKey][file.key] = newVer;
        } else {
            if (!json[file.key]) {
                console.warn(`  ⚠️  No "${file.key}" in ${file.path}`);
                continue;
            }
            json[file.key] = newVer;
        }
        fs.writeFileSync(fullPath, JSON.stringify(json, null, 2) + "\n");
        console.log(`  ✅ ${file.path} → ${newVer}`);
        count++;
    } else if (file.type === "regex") {
        const updated = content.replace(file.pattern, file.replacement);
        if (updated === content) {
            console.warn(`  ⚠️  No match in ${file.path}`);
            continue;
        }
        fs.writeFileSync(fullPath, updated);
        console.log(`  ✅ ${file.path} → ${newVer}`);
        count++;
    }
}

console.log(`\n📦 Bumped ${count} files to v${newVer}`);