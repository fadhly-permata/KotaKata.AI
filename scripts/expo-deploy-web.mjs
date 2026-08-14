// ============================================================
// Deploy WEB ke EAS Hosting (expo.dev) — non-interaktif.
// ============================================================
// 1) Export web (`expo export --platform web`) ke dist/
// 2) Upload ke EAS Hosting (`eas deploy`) — URL preview/produksi
//    muncul di output (bisa dipromosikan ke --prod dari dashboard).
//
// Token dibaca dari env EXPO_TOKEN, lalu .env.local / .env
// (tidak pernah dicetak). Perintah eas-cli dipanggil via bunx
// supaya tidak perlu install global.
//
// Usage:
//   node scripts/expo-deploy-web.mjs                # deploy preview
//   node scripts/expo-deploy-web.mjs --prod         # deploy produksi
//   node scripts/expo-deploy-web.mjs --dry-run      # uji tanpa upload
// ============================================================
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

const EXPORT_DIR = "dist";

function loadEnvToken() {
  if (process.env.EXPO_TOKEN) return process.env.EXPO_TOKEN;
  for (const file of [".env.local", ".env"]) {
    if (!existsSync(file)) continue;
    const env = readFileSync(file, "utf8");
    const m = env.match(/^EXPO_TOKEN=(.*)$/m);
    if (m) return m[1].trim().replace(/^["']|["']$/g, "");
  }
  return null;
}

const args = process.argv.slice(2);
const isProd = args.includes("--prod");
const isDryRun = args.includes("--dry-run");

const token = loadEnvToken();
if (!token) {
  console.error("EXPO_TOKEN tidak ditemukan (env / .env.local). Deploy dibatalkan.");
  process.exit(1);
}

// 1) Export web
console.log("⏳ Export web (expo export --platform web)...");
const exportR = spawnSync(
  "npx",
  ["expo", "export", "--platform", "web", "--output-dir", EXPORT_DIR],
  { stdio: "inherit", env: process.env },
);
if (exportR.status !== 0) {
  console.error("Export web gagal (status " + exportR.status + ").");
  process.exit(exportR.status ?? 1);
}

// 2) Deploy ke EAS Hosting
const deployArgs = ["eas-cli", "deploy", "--non-interactive", "--export-dir", EXPORT_DIR];
if (isProd) deployArgs.push("--prod");
if (isDryRun) deployArgs.push("--dry-run");

console.log(isDryRun ? "⏳ Uji deploy (dry-run, tanpa upload)..." : "⏳ Deploy ke EAS Hosting...");
const deployR = spawnSync("bunx", deployArgs, {
  stdio: "inherit",
  env: { ...process.env, EXPO_TOKEN: token },
});
if (deployR.status !== 0) {
  console.error("Deploy gagal (status " + deployR.status + ").");
  process.exit(deployR.status ?? 1);
}

console.log("✅ Web deployed ke expo.dev (EAS Hosting).");
