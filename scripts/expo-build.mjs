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

// Inspeksi env EAS tanpa menyentuh nilai secret secara manual:
//   node scripts/expo-build.mjs --env production
if (args.includes("--env")) {
  const envName = args[args.indexOf("--env") + 1] ?? "production";
  const r = spawnSync("bunx", ["eas-cli", "env:list", "--environment", envName, "--format", "long"], {
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

// Sinkronkan env saja tanpa kirim build: node scripts/expo-build.mjs --sync-only
if (args.includes("--sync-only")) {
  const ok = syncPublicEnvToEas();
  console.log(ok ? "\n✅ Sinkronisasi env EAS selesai." : "\n❌ Sinkronisasi env EAS gagal (lihat di atas).");
  process.exit(ok ? 0 : 1);
}

// ---------------------------------------------------------------------------
// Sinkronisasi EXPO_PUBLIC_* ke env EAS.
//
// Server build EAS TIDAK mewarisi env lokal & file .env* di-.gitignore (tidak
// ikut ter-upload). Tanpa ini, var seperti EXPO_PUBLIC_SUPABASE_URL kosong di
// bundle release → modul yang membacanya gagal saat startup → APK layar putih.
// Var ini bukan rahasia (anon key memang dikirim ke client), aman di-push.
// ---------------------------------------------------------------------------
function loadPublicEnvVars() {
  const vars = {};
  for (const file of [".env", ".env.local"]) {
    // .env.local dibaca terakhir supaya menimpa nilai dari .env
    if (!existsSync(file)) continue;
    for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
      const m = line.match(/^\s*(EXPO_PUBLIC_[A-Za-z0-9_]+)\s*=\s*(.*)\s*$/);
      if (!m) continue;
      vars[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
    }
  }
  return vars;
}

function syncPublicEnvToEas() {
  const publicVars = loadPublicEnvVars();
  const keys = Object.keys(publicVars).sort();
  if (keys.length === 0) {
    console.warn("⚠️  Tidak ada var EXPO_PUBLIC_* di .env.local/.env — lewati sinkronisasi env EAS.");
    return true;
  }
  console.log(`Sinkronisasi ${keys.length} var EXPO_PUBLIC_* ke env EAS (${keys.join(", ")})...`);
  // eas env:set = create-or-update per var (PLAN-077): tidak seperti env:push,
  // ini tidak pernah konflik dengan var yang sudah ada di production/preview.
  let failed = 0;
  for (const key of keys) {
    // Satu panggilan PER environment — eas-cli menolak env:set yang mencakup
    // dua environment sekaligus kalau var-nya sudah ada di salah satunya.
    for (const envName of ["preview", "production"]) {
      const r = spawnSync(
        "bunx",
        [
          "eas-cli",
          "env:set",
          "--name",
          key,
          "--value",
          publicVars[key],
          "--type",
          "string",
          "--visibility",
          "plaintext",
          "--scope",
          "project",
          "--environment",
          envName,
          "--non-interactive",
        ],
        { stdio: "inherit", env: { ...process.env, EXPO_TOKEN: token } },
      );
      if (r.status !== 0) failed += 1;
    }
  }
  if (failed > 0) {
    console.error(`❌ ${failed} var gagal disinkronkan ke env EAS. Build tetap dilanjutkan,`);
    console.error("   tapi nilai di bundle release bisa basi — cek dengan flag --env production.");
    return false;
  }
  return true;
}

syncPublicEnvToEas();

console.log(`\n=== Expo EAS Build ===`);
console.log(`Platform : ${platform}`);
console.log(
  `Profile  : ${profile}${profile === "preview" ? " (APK untuk install manual)" : profile === "production" ? " (AAB untuk Play Store)" : " (development client)"}`,
);
console.log(`Token    : ${token.length} karakter (tidak dicetak isinya)\n`);

const r = spawnSync(
  "bunx",
  ["eas-cli", "build", "--platform", platform, "--profile", profile, "--non-interactive", "--no-wait"],
  {
    stdio: "inherit",
    env: { ...process.env, EXPO_TOKEN: token },
  },
);

if (r.status === 0) {
  console.log("\n✅ Build dikirim ke EAS (berjalan di cloud expo.dev). Pantau status & download di:");
  console.log(`   ${PROJECT_URL}`);
  console.log("\nAtau dari terminal:");
  console.log("   bunx eas-cli build:list");
} else {
  console.error(
    `\n❌ eas-cli gagal (exit ${r.status}). Cek pesan di atas — kadang build queue penuh, coba lagi nanti.`,
  );
}
process.exit(r.status ?? 1);
