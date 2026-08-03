// Diagnose KBBI filter drop rates per word length.
// Usage: node scripts/diag-kbbi.mjs /tmp/kbbi.json
import { readFileSync } from "node:fs";

const path = process.argv[2] ?? "/tmp/kbbi.json";
const j = JSON.parse(readFileSync(path, "utf8"));
const entries = j.dictionary ?? j;

const decode = (s) =>
  s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

const byLen = new Map(); // len -> {raw, ark, func, cross, nodef, other, ok}
const init = () => ({ raw: 0, ark: 0, func: 0, cross: 0, nodef: 0, other: 0, ok: 0 });

for (const e of entries) {
  const word = (e.word ?? "").trim().toLowerCase();
  if (!/^[a-z]+$/.test(word)) continue;
  if (word.length < 3 || word.length > 10) continue;
  const L = word.length;
  if (!byLen.has(L)) byLen.set(L, init());
  const st = byLen.get(L);
  st.raw++;

  const arti = decode(e.arti ?? "");
  const m = arti.match(
    /^<b>(?:<sup>\d+<\/sup>)?[^<]*<\/b>\s*((?:(?:<b>\d+<\/b>|<i>[^<]*<\/i>)\s*)*)(.*)$/s,
  );
  if (!m) {
    st.other++;
    continue;
  }
  const tokens = m[1];
  const rest = m[2];
  const classMatch = tokens.match(/<i>([^<]*)<\/i>/);
  const klass = classMatch ? classMatch[1].trim() : "";
  if (/(^|\s)(ark|kl)(\s|$)/i.test(klass)) {
    st.ark++;
    continue;
  }
  const primary = klass.split(/\s+/)[0] || "";
  if (primary === "p" || primary === "pron") {
    st.func++;
    continue;
  }
  const defMatch = rest.match(/^(.*?)(?=<b>|<br>|$)/s);
  let def = defMatch ? defMatch[1] : rest;
  def = def.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  if (klass.includes("?") || def.startsWith("?")) {
    st.cross++;
    continue;
  }
  const colon = def.indexOf(":");
  if (colon >= 0) def = def.slice(0, colon);
  def = def.replace(/[;,\s]+$/g, "").trim();
  if (!def) {
    st.nodef++;
    continue;
  }
  st.ok++;
}

console.log("len | raw | ark/kl | func(p/pron) | crossref | nodef | other | OK");
for (let L = 3; L <= 10; L++) {
  const s = byLen.get(L) ?? init();
  console.log(
    `${L} | ${s.raw} | ${s.ark} | ${s.func} | ${s.cross} | ${s.nodef} | ${s.other} | ${s.ok}`,
  );
}
