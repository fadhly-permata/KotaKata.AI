// ============================================================
// Build APK/AAB via Expo EAS (expo.dev) — non-interaktif.
//
// Token dibaca dari env EXPO_TOKEN, lalu .env.local / .env
// (tidak pernah dicetak). Perintah eas-cli dipanggil via bunx
// supaya tidak perlu install global.
//
// Usage:
//   node scripts/expo-build.mjs                     # default: android + preview (APK)
//   node scripts/expo-build.mjs ios                 # iOS + preview
//   node scripts/expo-build.mjs all production      # semua platform + production (AAB)
//   node scripts/expo-build.mjs android preview     # eksplisit platform + profile
//   node scripts/expo-build.mjs --list              # lihat daftar build terakhir
//   node scripts/expo-build.mjs --help              # bantuan ini
//
// Profile yang tersedia (eas.json): development, preview, production.
// ============================================================
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

const PROFILES = ["development", "preview", "production"];
const PLATFORMS = ["android", "ios", "all"];
const PROJECT_URL = "https://expo.dev/accounts/fadhly-permata/projects/kotakata-ai/builds";

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
if (args.includes("--help") || args.includes("-h")) {
  console.log(`Usage:
  node scripts/expo-build.mjs [platform] [profile]   (default: android preview)
  node scripts/expo-build.mjs --list                 (lihat build terakhir)
  node scripts/expo-build.mjs --help`);
  process.exit(0);
}

if (args.includes("--list")) {
  const r = spawnSync("bunx", ["eas-cli", "build:list", "--limit", "10", "--non-interactive"], {
    stdio: "inherit",
    env: { ...process.env, EXPO_TOKEN: loadEnvToken() ?? "" },
  });
  process.exit(r.status ?? 1);
}

// Argumen posisional: [platform] [profile] — keduanya opsional.
const posArgs = args.filter((a) => !a.startsWith("--"));
const platform = posArgs[0] && PLATFORMS.includes(posArgs[0]) ? posArgs[0] : "android";
const profile = (posArgs[0] && !PLATFORMS.includes(posArgs[0]) ? posArgs[0] : posArgs[1]) ?? "preview";

if (!PROFILES.includes(profile)) {
  console.error(`Profile tidak dikenal: "${profile}". Yang tersedia: ${PROFILES.join(", ")}`);
  process.exit(2);
}

const token = loadEnvToken();
if (!token) {
  console.error(
    "EXPO_TOKEN tidak ditemukan (env, .env.local, atau .env).\n" +
      "Isi di tab Keys/API keys (nama var: EXPO_TOKEN) atau tambahkan EXPO_TOKEN=... di .env.local.",
  );
  process.exit(2);
}

console.log(`\n=== Expo EAS Build ===`);
console.log(`Platform : ${platform}`);
console.log(`Profile  : ${profile}${profile === "preview" ? " (APK untuk install manual)" : profile === "production" ? " (AAB untuk Play Store)" : " (development client)"}`);
console.log(`Token    : ${token.length} karakter (tidak dicetak isinya)\n`);

const r = spawnSync("bunx", ["eas-cli", "build", "--platform", platform, "--profile", profile, "--non-interactive"], {
  stdio: "inherit",
  env: { ...process.env, EXPO_TOKEN: token },
});

if (r.status === 0) {
  console.log("\n✅ Build terdaftar di EAS. Pantau status & download di:");
  console.log(`   ${PROJECT_URL}`);
  console.log("\nAtau dari terminal:");
  console.log("   bunx eas-cli build:list");
} else {
  console.error(`\n❌ eas-cli gagal (exit ${r.status}). Cek pesan di atas — kadang build queue penuh, coba lagi nanti.`);
}
process.exit(r.status ?? 1);
