// ============================================================
// Baca / ubah konfigurasi Auth Supabase (Management API).
// Token dibaca dari env SUPABASE_ACCESS_TOKEN atau .env.local (tidak pernah dicetak).
//
// Usage:
//   node scripts/db/supabase-auth-config.mjs              # GET — tampilkan config
//   node scripts/db/supabase-auth-config.mjs '<json>'     # PATCH — update sebagian field
//                                                        # (cukup tulis field yang mau diubah,
//                                                        #  mis. {"site_url":"...","uri_allow_list":[...]})
// ============================================================
import { readFileSync, existsSync } from "node:fs";

const ref = process.env.SUPABASE_PROJECT_REF ?? "uylunbabcudjpcphzchw";

let token = process.env.SUPABASE_ACCESS_TOKEN;
if (!token && existsSync(".env.local")) {
  const env = readFileSync(".env.local", "utf8");
  const m = env.match(/^SUPABASE_ACCESS_TOKEN=(.*)$/m);
  if (m) token = m[1].trim().replace(/^["']|["']$/g, "");
}
if (!token) {
  console.error("Missing SUPABASE_ACCESS_TOKEN (env atau .env.local).");
  process.exit(2);
}

const url = `https://api.supabase.com/v1/projects/${ref}/config/auth`;
const body = process.argv[2];

try {
  const res = await fetch(url, {
    method: body ? "PATCH" : "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(JSON.parse(body)) : undefined,
  });
  const text = await res.text();
  console.log("HTTP", res.status, body ? "(PATCH)" : "(GET)");
  console.log(text.slice(0, 6000));
  process.exit(res.ok ? 0 : 1);
} catch (e) {
  console.error(e.message);
  process.exit(1);
}
