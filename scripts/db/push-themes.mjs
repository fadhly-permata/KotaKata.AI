// Push katalog tema ke Supabase: generate dulu supabase/data/themes.sql dari
// registry lokal (themeData.ts), lalu kirim ke tabel `themes` via Management API.
// Token dibaca dari env SUPABASE_ACCESS_TOKEN atau dari .env.local (tidak pernah dicetak).
// Usage: node scripts/db/push-themes.mjs
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..", "..");

// 1) Regenerate SQL seed dari registry tema.
try {
  process.stdout.write(
    execFileSync("bun", ["scripts/db/gen-themes-sql.mjs"], {
      cwd: ROOT,
      encoding: "utf8",
    }),
  );
} catch (err) {
  if (err && typeof err === "object" && "stderr" in err) {
    process.stderr.write(String(err.stderr));
  }
  process.exit(1);
}

// 2) Push ke Supabase.
const sqlFile = join(ROOT, "supabase", "data", "themes.sql");
const ref = process.env.SUPABASE_PROJECT_REF ?? "uylunbabcudjpcphzchw";

let token = process.env.SUPABASE_ACCESS_TOKEN;
if (!token && existsSync(join(ROOT, ".env.local"))) {
  const env = readFileSync(join(ROOT, ".env.local"), "utf8");
  const m = env.match(/^SUPABASE_ACCESS_TOKEN=(.*)$/m);
  if (m) token = m[1].trim().replace(/^["']|["']$/g, "");
}
if (!token) {
  console.error("Missing SUPABASE_ACCESS_TOKEN (env atau .env.local).");
  process.exit(2);
}

const query = readFileSync(sqlFile, "utf8");
const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ query }),
});

const text = await res.text();
console.log("HTTP", res.status);
console.log(text.slice(0, 3000));
process.exit(res.ok ? 0 : 1);
