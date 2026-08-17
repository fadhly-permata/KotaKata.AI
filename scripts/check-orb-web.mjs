/**
 * Tes empiris: apakah animasi orb BENAR-BENAR bergerak di bundle web produksi?
 *
 * Cara kerja: muat dist/index.html di jsdom (dengan stub browser yang
 * dibutuhkan RNW/Expo), biarkan app bootstrap, lalu sampling elemen-elemen
 * yang punya inline transform (orb) selama beberapa detik. Kalau ada
 * transform yang berubah → animasi jalan. Kalau semuanya diam → freeze.
 *
 * Jalankan: node scripts/check-orb-web.mjs
 */
import { JSDOM } from "jsdom";
import { readFileSync } from "node:fs";

// sql.js wasm gagal dimuat di jsdom → logDb memakai fallback (aman), tapi
// rejection-nya jangan sampai mematikan proses tes.
process.on("unhandledRejection", (err) => {
  if (String(err).includes("wasm") || String(err).includes("sql.js")) return;
  console.error("[unhandledRejection]", err);
});
process.on("uncaughtException", (err) => {
  if (String(err).includes("wasm") || String(err).includes("sql.js")) return;
  console.error("[uncaughtException]", err);
});

// Budget total: matikan diri setelah 75 dtk supaya tidak menggantung.
setTimeout(() => {
  console.log("\n[timeout] Script berhenti karena batas waktu.");
  process.exit(3);
}, 75000);

const html = readFileSync(new URL("../dist/index.html", import.meta.url), "utf8");
const scriptSrc = html.match(/src="([^"]+\.js)"/)?.[1];
if (!scriptSrc) {
  console.error("Tidak menemukan <script src> di dist/index.html");
  process.exit(1);
}

const dom = new JSDOM(html, {
  url: "https://kotakata-ai.expo.app/",
  pretendToBeVisual: true,
  runScripts: "outside-only",
});

const { window } = dom;
const { document } = window;

// jsdom tidak melakukan layout → documentElement.clientHeight=0 → RNW
// Dimensions baca 0x0 (interpolasi AmbientFx jadi [0,0] = transform statis).
// RNW memakai win.visualViewport kalau ada — definisikan supaya ukuran layar
// realistis.
Object.defineProperty(window, "visualViewport", {
  value: {
    height: 800,
    width: 1280,
    scale: 1,
    addEventListener() {},
    removeEventListener() {},
  },
  configurable: true,
});
console.log(`[env] visualViewport=${window.visualViewport.width}x${window.visualViewport.height}`);

// ── Stub browser API yang tidak tersedia / tidak konsisten di jsdom ──
window.matchMedia =
  window.matchMedia ||
  ((query) => ({
    matches: false,
    media: query,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
    onchange: null,
    dispatchEvent() { return false; },
  }));

window.ResizeObserver =
  window.ResizeObserver ||
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };

window.IntersectionObserver =
  window.IntersectionObserver ||
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() { return []; }
  };

// jsdom tidak punya rAF → polyfill dengan setTimeout(16ms).
if (typeof window.requestAnimationFrame !== "function") {
  window.requestAnimationFrame = (cb) => setTimeout(() => cb(Date.now()), 16);
  window.cancelAnimationFrame = (id) => clearTimeout(id);
}

// Beberapa lib butuh navigator.platform / userAgent.
Object.defineProperty(window.navigator, "platform", { get: () => "web" });

// Element yang belum ada di jsdom.
if (!window.Element.prototype.scrollIntoView) {
  window.Element.prototype.scrollIntoView = () => {};
}

// ── Opsional: inject session palsu supaya app masuk ke MAIN MENU (butuh auth) ──
// Jalankan dengan INJECT_SESSION=1 untuk menguji halaman ber-login.
if (process.env.INJECT_SESSION === "1") {
  const now = Math.floor(Date.now() / 1000);
  const b64 = (o) =>
    Buffer.from(JSON.stringify(o)).toString("base64url").replace(/=+$/, "");
  const header = b64({ alg: "HS256", typ: "JWT" });
  const payload = b64({
    sub: "00000000-0000-4000-8000-000000000001",
    exp: now + 31536000,
    iat: now,
    role: "authenticated",
    aud: "authenticated",
    email: "test@example.com",
    app_metadata: { provider: "google" },
  });
  const fakeToken = `${header}.${payload}.ZmFrZXNpZ25hdHVyZQ`;
  const fakeSession = {
    access_token: fakeToken,
    refresh_token: "fake-refresh",
    expires_at: now + 31536000,
    expires_in: 31536000,
    token_type: "bearer",
    user: {
      id: "00000000-0000-4000-8000-000000000001",
      email: "test@example.com",
      role: "authenticated",
      app_metadata: { provider: "google" },
      created_at: new Date().toISOString(),
    },
  };
  window.localStorage.setItem(
    "sb-uylunbabcudjpcphzchw-auth-token",
    JSON.stringify(fakeSession),
  );
  console.log("Session palsu di-inject → berharap masuk Main Menu.");
}

// Tangkap error/console dari dalam jsdom biar tahu kenapa app gagal mount.
const windowErrors = [];
window.addEventListener("error", (e) => windowErrors.push(String(e.error?.stack || e.message || e.error)));
window.console.error = (...args) => { windowErrors.push(args.map(String).join(" ")); console.error("[jsdom]", ...args); };

// Jalankan bundle asli produksi lewat eval (runScripts=outside-only).
const bundle = readFileSync(new URL(`../dist${scriptSrc}`, import.meta.url), "utf8");
try {
  window.eval(bundle);
} catch (err) {
  console.error("Gagal mengevaluasi bundle:", err?.stack || err);
  process.exit(1);
}

console.log("Bundle dimuat. Menunggu bootstrap React…");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Tunggu app render (login screen / main menu) — cari elemen FloatingOrbs
// (dua translateY di transform: parallax + bounce).
async function waitForOrbs(timeoutMs = 10000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    await sleep(500);
    const orbs = findOrbs();
    if (orbs.length >= 3) return orbs;
  }
  return [];
}

// Orb = div dengan transform berisi DUA translateY (parallax + bounce — khas
// FloatingOrbs; di jsdom borderRadius dirender lewat class, bukan inline).
function findOrbs() {
  return [...document.querySelectorAll("div")].filter((n) => {
    const t = n.style?.transform || "";
    return (t.match(/translateY/g) || []).length >= 2;
  });
}

const orbs = await waitForOrbs();
console.log(`Ditemukan ${orbs.length} elemen orb (FloatingOrbs).`);
if (orbs.length < 3) {
  console.log("Sampel teks halaman:", document.body.textContent.slice(0, 300));
  const styled = [...document.querySelectorAll("div")]
    .filter((n) => n.getAttribute("style"))
    .slice(0, 25);
  styled.forEach((n) => console.log("  [div]", n.getAttribute("style").slice(0, 160)));
  process.exit(1);
}

// Fase 1: sampling 3 dtk (tiap 150ms) — orb harus bergerak.
function sample() {
  return findOrbs().map((n) => n.style?.transform || "");
}

let previous = sample();
let movingFrames = 0;
const frames = [];
for (let i = 0; i < 14; i++) {
  await sleep(150);
  const current = sample();
  const diff = current.filter((t, idx) => t !== previous[idx]).length;
  if (diff > 0) movingFrames++;
  frames.push({ t: ((i + 1) * 0.15).toFixed(2), diff });
  previous = current;
}
console.log("\nFase 1 — sampling 3 dtk (orb berubah per 150ms):");
frames.forEach((f) => console.log(`  +${f.t}s → ${f.diff}/${orbs.length} orb berubah`));
const phase1Ok = movingFrames >= 12; // mayoritas frame ada gerakan

// Fase 2: simulasikan tab di-background (rAF di-throttle ~1 dtk) lalu lanjut.
console.log("\nFase 2 — simulasi tab di-background (jeda rAF 1 dtk)…");
const realRaf = window.requestAnimationFrame;
window.requestAnimationFrame = () => 0; // matikan frame sementara
await sleep(1000);
window.requestAnimationFrame = realRaf;
await sleep(1000); // beri waktu resume
const afterResume = sample();
const resumedDiff = afterResume.filter((t, idx) => t !== previous[idx]).length;
console.log(`  Setelah resume: ${resumedDiff}/${orbs.length} orb berubah → ${resumedDiff > 0 ? "lanjut bergerak ✅" : "DIAM ❌"}`);

const mainMenuOk = phase1Ok && resumedDiff > 0;

// ── Fase 3 (hanya dengan session): navigasi ke Pengaturan → AmbientOrbs ──
// AmbientOrbs = SATU translateY + SATU translateX (beda dari FloatingOrbs
// yang punya DUA translateY). Dirender ScreenFade di halaman non-menu.
let ambientOk = null;
if (process.env.INJECT_SESSION === "1") {
  const findText = (txt) =>
    [...document.querySelectorAll("div,span,text")].find((n) =>
      n.textContent?.trim() === txt,
    );
  const settings = findText("Pengaturan") || findText("Profil");
  if (settings) {
    settings.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
    console.log("\nFase 3 — klik 'Pengaturan' → tunggu AmbientOrbs…");
    await sleep(3000);
    try {
      const ambient = [...document.querySelectorAll("div")].filter((n) => {
        const t = n.style?.transform || "";
        return (
          (t.match(/translateY/g) || []).length === 1 &&
          (t.match(/translateX/g) || []).length === 1
        );
      });
      console.log(`  Ditemukan ${ambient.length} elemen AmbientOrbs.`);
      if (process.env.DEBUG_DOM === "1") {
        const allTransformed = [...document.querySelectorAll("div")].filter((n) =>
          (n.style?.transform || "").includes("translate"),
        );
        console.log("  [debug] semua div bertransform:");
        allTransformed.slice(0, 40).forEach((n) =>
          console.log(
            "   ",
            JSON.stringify(n.getAttribute("style")?.slice(0, 400)),
          ),
        );
      }
      if (ambient.length >= 5) {
        let prev = ambient.map((n) => n.style?.transform || "");
        let moved = 0;
        for (let i = 0; i < 10; i++) {
          await sleep(150);
          const cur = ambient.map((n) => n.style?.transform || "");
          if (cur.filter((t, idx) => t !== prev[idx]).length > 0) moved++;
          prev = cur;
        }
        ambientOk = moved >= 6;
        console.log(`  Sampling 1.5 dtk: ${moved}/10 frame bergerak → ${ambientOk ? "✅ bergerak" : "❌ DIAM"}`);
      }
    } catch (err) {
      console.log("  Gagal sampling AmbientOrbs:", String(err).slice(0, 200));
    }
    if (ambientOk === null) console.log("  AmbientOrbs tidak ditemukan di layar baru (mungkin gagal navigasi).");
  } else {
    console.log("\nFase 3 — tombol Pengaturan/Profil tidak ditemukan.");
  }
}

console.log(`\nHASIL AKHIR: ${mainMenuOk && (ambientOk === null || ambientOk) ? "✅ ORB BERGERAK (tidak freeze)" : "❌ ORB DIAM (freeze!)"}`);
process.exit(mainMenuOk && (ambientOk === null || ambientOk) ? 0 : 2);
