import { userRepository } from "../data/repositories/userRepository";
import { loggerWarn } from "./logger";

/**
 * Main Mode AI (BYOK) — integrasi provider AI untuk membuat soal TTS.
 *
 * - Config provider (API key + model + base URL) disimpan LOKAL di
 *   kolom users.ai_provider_config (Supabase) supaya akun yang sama di device
 *   lain tetap bisa Main Mode AI. Key tetap milik user (Bring Your Own Key);
 *   hanya baris profil user itu sendiri yang bisa membacanya (RLS).
 * - Pemilik config lokal ditandai di "kotakata.aiProviderOwner" supaya config
 *   milik akun lain tidak bocor di device bersama (dan bisa di-backfill ke
 *   cloud untuk data lama).
 * - Provider yang didukung: OpenAI, Google Gemini, OpenRouter, HuggingFace
 *   (Inference Providers router), LM Studio (intranet/LAN), dan URL kustom —
 *   semuanya berbicara API chat-completions gaya OpenAI, jadi cukup satu
 *   implementasi request.
 * - Semua error dilempar sebagai Error dengan pesan ramah untuk ditampilkan
 *   ke user (mis. di dialog "Soal AI Gagal Dimuat").
 */

export type AiProviderPreset =
  | "gemini" | "mistral" | "openai" | "openrouter" | "huggingface"
  | "groq" | "cerebras" | "deepseek"
  | "cohere" | "together" | "fireworks" | "deepinfra"
  | "puter" | "sambanova" | "novita" | "hyperbolic"
  | "xai"
  | "lmstudio" | "custom";

export interface AiProviderConfig {
  provider: AiProviderPreset;
  apiKey: string;
  model: string;
  baseUrl: string;
}

/** Satu kata soal dari AI — clue_2 opsional (game memakai clue_1 sebagai fallback). */
export interface AiWord {
  word: string;
  clue_1: string;
  clue_2?: string;
}

export interface AiTestResult {
  ok: boolean;
  message: string;
}

// Tidak ada storage lokal — semua config disimpan di cloud (Supabase).
// Sync dilakukan oleh RootNavigator saat login & oleh AiProviderScreen saat save.

interface ProviderPreset {
  label: string;
  baseUrl: string;
  defaultModel: string;
}

const PROVIDER_PRESETS: Record<AiProviderPreset, ProviderPreset & { apiKeyRequired?: boolean }> = {
  openai: {
    label: "OpenAI (GPT)",
    baseUrl: "https://api.openai.com/v1",
    defaultModel: "gpt-4o-mini",
    apiKeyRequired: true,
  },
  gemini: {
    label: "Google Gemini",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
    defaultModel: "gemini-2.0-flash",
    apiKeyRequired: true,
  },
  mistral: {
    label: "Mistral AI",
    baseUrl: "https://api.mistral.ai/v1",
    defaultModel: "mistral-small-latest",
    apiKeyRequired: true,
  },
  openrouter: {
    label: "OpenRouter",
    baseUrl: "https://openrouter.ai/api/v1",
    defaultModel: "openai/gpt-4o-mini",
    apiKeyRequired: true,
  },
  huggingface: {
    label: "HuggingFace",
    baseUrl: "https://router.huggingface.co/v1",
    defaultModel: "meta-llama/Llama-3.3-70B-Instruct",
    apiKeyRequired: true,
  },
  lmstudio: {
    label: "LM Studio",
    baseUrl: "http://localhost:1234/v1",
    defaultModel: "",
    apiKeyRequired: false,
  },
  groq: {
    label: "Groq",
    baseUrl: "https://api.groq.com/openai/v1",
    defaultModel: "llama-3.3-70b-versatile",
    apiKeyRequired: true,
  },
  cerebras: {
    label: "Cerebras",
    baseUrl: "https://api.cerebras.ai/v1",
    defaultModel: "llama-3.3-70b",
    apiKeyRequired: true,
  },
  deepseek: {
    label: "DeepSeek",
    baseUrl: "https://api.deepseek.com/v1",
    defaultModel: "deepseek-chat",
    apiKeyRequired: true,
  },
  cohere: {
    label: "Cohere",
    baseUrl: "https://api.cohere.com/compatibility/v1",
    defaultModel: "command-r-plus-08-2024",
    apiKeyRequired: true,
  },
  together: {
    label: "Together AI",
    baseUrl: "https://api.together.xyz/v1",
    defaultModel: "meta-llama/Llama-3.3-70B-Instruct-Turbo",
    apiKeyRequired: true,
  },
  fireworks: {
    label: "Fireworks AI",
    baseUrl: "https://api.fireworks.ai/inference/v1",
    defaultModel: "accounts/fireworks/models/llama-v3p3-70b-instruct",
    apiKeyRequired: true,
  },
  deepinfra: {
    label: "DeepInfra",
    baseUrl: "https://api.deepinfra.com/v1/openai",
    defaultModel: "meta-llama/Llama-3.3-70B-Instruct",
    apiKeyRequired: true,
  },
  puter: {
    label: "Puter",
    baseUrl: "https://api.puter.com/v1",
    defaultModel: "gpt-4o-mini",
    apiKeyRequired: true,
  },
  sambanova: {
    label: "SambaNova",
    baseUrl: "https://api.sambanova.ai/v1",
    defaultModel: "Meta-Llama-3.3-70B-Instruct",
    apiKeyRequired: true,
  },
  novita: {
    label: "Novita AI",
    baseUrl: "https://api.novita.ai/v3/openai",
    defaultModel: "meta-llama/llama-3.3-70b-instruct",
    apiKeyRequired: true,
  },
  hyperbolic: {
    label: "Hyperbolic",
    baseUrl: "https://api.hyperbolic.xyz/v1",
    defaultModel: "meta-llama/Meta-Llama-3.3-70B-Instruct",
    apiKeyRequired: true,
  },
  xai: {
    label: "xAI (Grok)",
    baseUrl: "https://api.x.ai/v1",
    defaultModel: "grok-3-mini",
    apiKeyRequired: true,
  },
  custom: {
    label: "URL Kustom",
    baseUrl: "",
    defaultModel: "",
    apiKeyRequired: false,
  },
};

export function providerPreset(p: AiProviderPreset): ProviderPreset {
  return PROVIDER_PRESETS[p];
}

export function providerLabel(p: AiProviderPreset): string {
  return PROVIDER_PRESETS[p].label;
}

export function isLocalProvider(p: AiProviderPreset): boolean {
  return p === "lmstudio";
}

export function isApiKeyRequired(p: AiProviderPreset): boolean {
  return PROVIDER_PRESETS[p].apiKeyRequired !== false;
}

// State in-memory untuk provider aktif (di-sync dari cloud oleh RootNavigator)
let _activeProvider: AiProviderPreset = "openrouter";

/** Ambil nama provider yang sedang aktif. */
export function getActiveProviderSync(): AiProviderPreset {
  return _activeProvider;
}

/** Set provider aktif (in-memory). */
export function setActiveProviderSync(p: AiProviderPreset): void {
  _activeProvider = p;
}

/** Set provider aktif (in-memory, cloud sync by caller). */
export async function setActiveProvider(p: AiProviderPreset): Promise<void> {
  _activeProvider = p;
}

// Cache in-memory untuk semua provider config (di-sync dari cloud oleh RootNavigator)
const _providerConfigs: Partial<Record<AiProviderPreset, AiProviderConfig>> = {};

/** Set config untuk provider tertentu (in-memory, cloud sync by caller). */
export function setAiProviderConfigLocal(p: AiProviderPreset, cfg: AiProviderConfig | null): void {
  if (cfg) _providerConfigs[p] = cfg;
  else delete _providerConfigs[p];
}

/** Ambil config untuk provider tertentu (in-memory). */
export async function getAiProviderConfigFor(p: AiProviderPreset): Promise<AiProviderConfig | null> {
  const cfg = _providerConfigs[p];
  if (!cfg) return null;
  if (!cfg?.model || !cfg?.baseUrl) return null;
  if (isApiKeyRequired(cfg.provider) && !cfg.apiKey) return null;
  return cfg;
}

/** Ambil semua provider yang sudah punya config tersimpan (in-memory). */
export async function getAllSavedProviders(): Promise<AiProviderPreset[]> {
  return Object.keys(_providerConfigs) as AiProviderPreset[];
}

/** Baca config provider aktif; null kalau belum diatur / tidak valid. */
export async function getAiProviderConfig(): Promise<AiProviderConfig | null> {
  const active = _activeProvider;
  return getAiProviderConfigFor(active);
}

export async function saveAiProviderConfig(cfg: AiProviderConfig): Promise<void> {
  _providerConfigs[cfg.provider] = cfg;
  _activeProvider = cfg.provider;
}

export async function clearAiProviderConfig(): Promise<void> {
  delete _providerConfigs[_activeProvider];
}

/** Hapus config untuk provider tertentu (in-memory, cloud sync by caller). */
export async function clearAiProviderConfigFor(p: AiProviderPreset): Promise<void> {
  delete _providerConfigs[p];
}

// Owner ID in-memory (di-sync dari cloud oleh RootNavigator)
let _ownerId: string | null = null;

/** Uid Supabase pemilik config lokal. */
export async function getAiProviderConfigOwner(): Promise<string | null> {
  return _ownerId;
}

export async function markAiProviderOwner(userId: string): Promise<void> {
  _ownerId = userId;
}

export async function clearAiProviderOwner(): Promise<void> {
  _ownerId = null;
}

/**
 * Sinkronkan config provider AI dari cloud (Supabase) ke perangkat. Dipanggil
 * setiap session dimuat (login / restore) — user yang memakai akun sama di
 * device lain tetap bisa Main Mode AI.
 *
 * Aturan:
 *  - cloud punya config → tulis ke lokal, tandai pemilik = uid
 *  - cloud kosong tapi lokal milik uid ini (atau belum ditandai = data lama)
 *    → backfill config lokal ke cloud supaya user lama tidak kehilangan apa pun
 *  - cloud kosong & lokal milik akun LAIN → bersihkan lokal (anti-bocor antar
 *    akun di device bersama)
 */
/** Sync SEMUA provider dari cloud ke in-memory (dipanggil RootNavigator saat login). */
export async function syncAiProviderConfigWithCloud(userId: string): Promise<void> {
  try {
    const { providers: cloudProviders, activeProvider: cloudActive } = await userRepository.getAllAiProviderConfigs(userId);

    const cloudHasData = Object.keys(cloudProviders).length > 0;

    if (cloudHasData) {
      // Cloud punya config: sync SEMUA ke in-memory
      for (const [p, cfg] of Object.entries(cloudProviders) as [string, AiProviderConfig][]) {
        _providerConfigs[p as AiProviderPreset] = cfg;
      }
      _activeProvider = cloudActive as AiProviderPreset;
      _ownerId = userId;
      return;
    }

    // Cloud kosong: backfill dari in-memory jika ada
    const localKeys = Object.keys(_providerConfigs);
    const localHasData = localKeys.length > 0;

    if (localHasData && (_ownerId === null || _ownerId === userId)) {
      await userRepository.saveAllAiProviderConfigs(userId, _providerConfigs as Record<string, AiProviderConfig>, _activeProvider);
      _ownerId = userId;
      return;
    }

    // Config milik akun lain → bersihkan
    if (localHasData && _ownerId && _ownerId !== userId) {
      for (const key of localKeys) {
        delete _providerConfigs[key as AiProviderPreset];
      }
      _ownerId = null;
    }
  } catch (err) {
    loggerWarn("Gagal sinkron config provider AI dengan cloud", err);
  }
}

/** Sync SEMUA provider dari in-memory ke cloud (fire-and-forget). */
export async function syncAllProvidersToCloud(userId: string): Promise<void> {
  try {
    const providers: Record<string, AiProviderConfig> = {};
    for (const [p, cfg] of Object.entries(_providerConfigs)) {
      providers[p] = cfg;
    }
    if (Object.keys(providers).length > 0) {
      await userRepository.saveAllAiProviderConfigs(userId, providers, _activeProvider);
    } else {
      await userRepository.clearAllAiProviderConfigs(userId);
    }
  } catch (err) {
    loggerWarn("Gagal sync semua provider ke cloud", err);
  }
}

function chatUrl(cfg: AiProviderConfig): string {
  return `${cfg.baseUrl.replace(/\/+$/, "")}/chat/completions`;
}

async function chatRequest(
  cfg: AiProviderConfig,
  messages: Array<{ role: string; content: string }>,
  maxTokens: number,
  signal?: AbortSignal,
): Promise<string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (cfg.apiKey) {
    headers["Authorization"] = `Bearer ${cfg.apiKey}`;
  }
  const res = await fetch(chatUrl(cfg), {
    method: "POST",
    headers,
    body: JSON.stringify({
      model: cfg.model,
      messages,
      temperature: 0.9,
      max_tokens: maxTokens,
    }),
    signal,
  });

  if (!res.ok) {
    let detail = "";
    try {
      const j = await res.json();
      detail = j?.error?.message ?? JSON.stringify(j).slice(0, 160);
    } catch {
      // body bukan JSON — detail tetap kosong
    }
    throw new Error(`HTTP ${res.status}${detail ? `: ${detail}` : ""}`);
  }

  const j = await res.json();
  const content = j?.choices?.[0]?.message?.content;
  if (typeof content !== "string" || !content.trim()) {
    throw new Error("Respons kosong dari provider.");
  }
  return content;
}

/** Uji koneksi: kirim prompt minimal dan pastikan model merespons. */
export async function testAiConnection(
  cfg: AiProviderConfig,
  signal?: AbortSignal,
): Promise<AiTestResult> {
  try {
    await chatRequest(
      cfg,
      [{ role: "user", content: "Balas dengan satu kata: ok" }],
      8,
      signal,
    );
    return { ok: true, message: "Koneksi berhasil ✓ Model merespons." };
  } catch (err: any) {
    const msg = err?.name === "AbortError" ? "Tes koneksi terputus (waktu habis)." : err?.message;
    // Deteksi CORS / network error untuk provider lokal
    if (isLocalProvider(cfg.provider) && (msg?.includes("Failed to fetch") || msg?.includes("NetworkError") || msg?.includes("CORS") || msg?.includes("ERR_CONNECTION_REFUSED") || msg?.includes("0"))) {
      return {
        ok: false,
        message: "Gagal terhubung ke server lokal. Pastikan:\n\n"
          + "1. LM Studio sudah berjalan + server aktif\n"
          + "2. Base URL sudah benar (localhost / IP LAN)\n"
          + "3. App dijalankan LOKAL (bukan dari expo.app)\n\n"
          + "Jalankan: bunx expo start --web\n"
          + "Bukan dari URL deployed (kotakata-ai.expo.app).",
      };
    }
    return { ok: false, message: msg ?? "Gagal terhubung ke provider." };
  }
}

const SYSTEM_PROMPT = `Kamu adalah pembuat soal teka-teki silang (TTS) Bahasa Indonesia.
Aturan ketat:
1. Setiap kata: kata dasar Bahasa Indonesia yang umum, HANYA huruf kecil a-z, TANPA spasi, 3-10 huruf, bukan nama orang, merek, atau kota.
2. "clue": petunjuk menarik yang TIDAK boleh memuat kata jawabannya sama sekali (dilarang pola seperti "Kata berawalan X" atau menyebut huruf).
3. "clue2": petunjuk kedua yang BERBEDA — bisa contoh kalimat TANPA memuat kata jawabannya, sinonim, atau penjelasan lain.
4. Semua kata harus unik dan mudah ditebak pemain Indonesia.
5. Jika kata adalah kata serapan dari bahasa asing (Inggris, Belanda, Arab, Sanskerta, Portugis, Tionghoa, Jepang, Persia, Tamil, Hindi, Yunani, dan sebagainya), clue HARUS menyebutkan asal bahasanya dengan awalan "Kata serapan dari bahasa X: " (misal "Kata serapan dari bahasa Inggris: ..."). Untuk kata asli Indonesia, tidak perlu menyebut asal bahasa.
Jawab HANYA JSON valid tanpa teks lain, format:
{"words":[{"word":"kata","clue":"petunjuk","clue2":"petunjuk kedua"}]}`;

const USER_PROMPT = "Buatkan 16 kata untuk satu papan TTS. Berikan JSON sesuai aturan.";

/**
 * Maksimal kata yang dikecualikan yang dikirim ke prompt AI (PLAN-050).
 * Riwayat pemain bisa ribuan kata; cukup kirim sebagian terbaru supaya tidak
 * memboroskan token provider sementara tetap mencegah pengulangan praktis.
 */
const MAX_EXCLUDE_WORDS = 300;

/**
 * Panduan tingkat kesulitan per tier untuk soal AI (1 = paling mudah).
 * Dipakai Main Mode AI supaya kata yang di-generate sesuai level pemain.
 */
const TIER_DIFFICULTY: Record<number, string> = {
  1: "kata-kata super umum sehari-hari (makan, air, rumah, jalan, buku), pendek 3-6 huruf",
  2: "kata umum sehari-hari yang sedikit lebih bervariasi, 3-7 huruf",
  3: "kata umum plus kata kerja dasar dan kata sifat sederhana, 4-8 huruf",
  4: "kata menengah yang lazim di sekolah/rumah, 4-8 huruf",
  5: "kata menengah (istilah ringan, kata serapan umum), 5-9 huruf",
  6: "kata menengah-atas (istilah baku, kosakata pasif umum), 5-9 huruf",
  7: "kata jarang/teknis ringan dan kosa kata baku yang menantang, 6-9 huruf",
  8: "kata baku yang jarang dipakai sehari-hari, 6-10 huruf",
  9: "kata langka/istilah khusus yang hanya dikenal pemain mahir, 6-10 huruf",
  10: "kata paling langka dan sulit, hanya untuk penutur fasih, 6-10 huruf",
};

function tierPrompt(tier: number): string {
  const t = Math.max(1, Math.min(10, Math.floor(tier) || 1));
  return `Pemain berada di Tier ${t}. Pilih kata sesuai tingkat kesulitan tier ini: ${TIER_DIFFICULTY[t] ?? TIER_DIFFICULTY[1]}.`;
}

/** Ekstrak blok JSON pertama dari teks respons (tahan terhadap fence markdown). */
function extractJson(text: string): unknown {
  let t = text.trim();
  t = t.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  const start = t.indexOf("{");
  if (start === -1) throw new Error("Respons AI tidak valid: tidak ada JSON.");
  let depth = 0;
  for (let i = start; i < t.length; i++) {
    if (t[i] === "{") depth++;
    else if (t[i] === "}") {
      depth--;
      if (depth === 0) {
        try {
          return JSON.parse(t.slice(start, i + 1));
        } catch {
          break;
        }
      }
    }
  }
  throw new Error("Respons AI tidak valid: JSON tidak bisa di-parse.");
}

const WORD_RE = /^[a-z]{3,10}$/;

/**
 * Minta daftar kata + clue dari provider AI. Hasil divalidasi keras:
 * hanya kata huruf kecil 3-10 huruf, clue tidak boleh memuat kata jawaban,
 * tanpa duplikat. Lempar Error kalau hasilnya tidak bisa dipakai.
 * `playerTier` dipakai supaya kata yang di-generate sesuai level pemain.
 * `excludeWords` (PLAN-050): kata yang sudah pernah ditemukan pemain —
 * dilarang di prompt (kap maksimal MAX_EXCLUDE_WORDS) DAN difilter lagi di
 * sisi klien (jaga-jaga model AI melanggar).
 */
export async function requestAiWords(
  cfg: AiProviderConfig,
  playerTier: number,
  excludeWords: string[] = [],
  signal?: AbortSignal,
): Promise<AiWord[]> {
  const exclude = excludeWords
    .map((w) => w.trim().toLowerCase())
    .filter(Boolean)
    .slice(0, MAX_EXCLUDE_WORDS);
  const excludeSet = new Set(exclude);

  let userPrompt = `${USER_PROMPT} ${tierPrompt(playerTier)}`;
  if (exclude.length > 0) {
    userPrompt += ` JANGAN gunakan kata-kata berikut (sudah pernah ditemukan pemain): ${exclude.join(", ")}.`;
  }

  const content = await chatRequest(
    cfg,
    [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userPrompt },
    ],
    1500,
    signal,
  );

  const json = extractJson(content);
  const arr = (json as any)?.words;
  if (!Array.isArray(arr)) {
    throw new Error('Respons AI tidak valid: field "words" tidak ditemukan.');
  }

  const seen = new Set<string>();
  const words: AiWord[] = [];
  for (const item of arr) {
    const word = String(item?.word ?? "").trim().toLowerCase();
    const clue = String(item?.clue ?? "").trim();
    const clue2 = String(item?.clue2 ?? "").trim();
    if (!WORD_RE.test(word)) continue;
    if (clue.length < 4) continue;
    // Buang kata yang clue-nya bocor menyebut jawaban.
    if (clue.toLowerCase().includes(word)) continue;
    if (clue2 && clue2.toLowerCase().includes(word)) continue;
    if (seen.has(word)) continue;
    // Kata yang sudah pernah ditemukan pemain tidak boleh keluar lagi (PLAN-050).
    if (excludeSet.has(word)) continue;
    seen.add(word);
    words.push({ word, clue_1: clue, clue_2: clue2 || undefined });
  }

  if (words.length < 5) {
    throw new Error("Soal dari AI kurang valid — coba lagi.");
  }
  return words;
}

/** Input untuk fitur Revisi Via AI (Editor Soal). */
export interface RevisionInput {
  word: string;
  clue_1: string;
  clue_2?: string;
  clue_3?: string;
  tier_level: number;
}

/** Output dari revisi AI — clue yang direvisi + info bocoran. */
export interface RevisionOutput {
  clue_1: string;
  clue_2?: string;
  clue_3?: string;
  /** Daftar clue yang masih memuat kata jawaban (leak). */
  leaks?: string[];
}

const REVISION_SYSTEM_PROMPT = `Kamu adalah ahli kurasi soal teka-teki silang (TTS) Bahasa Indonesia.
Tugas: merevisi clue agar lebih baik, tidak membocorkan jawaban, dan sesuai KBBI.
Aturan:
1. Clue TIDAK BOLEH memuat kata jawaban (atau akar katanya).
2. Clue harus jelas, menarik, dan bisa dijawab oleh pemain Indonesia.
3. Clue tidak boleh vulgar, kasar, atau tidak pantas.
4. Jaga tier tetap sesuai.
Jawab HANYA JSON valid tanpa teks lain:
{"clue_1":"...","clue_2":"...","clue_3":"..."}`;

/**
 * Minta AI merevisi clue untuk satu soal. Mengembalikan clue baru yang
 * sudah divalidasi (minimal clue_1 wajib ada, clue_2/clue_3 opsional).
 */
export async function requestAiRevision(
  cfg: AiProviderConfig,
  input: RevisionInput,
  signal?: AbortSignal,
): Promise<RevisionOutput> {
  const userPrompt = [
    `Revisi clue untuk kata "${input.word}" (tier ${input.tier_level}).`,
    `Clue saat ini:`,
    `- Clue 1: ${input.clue_1}`,
    input.clue_2 ? `- Clue 2: ${input.clue_2}` : null,
    input.clue_3 ? `- Clue 3: ${input.clue_3}` : null,
    ``,
    `Perbaiki agar clue tidak bocor (tidak menyebut kata jawaban), lebih jelas, dan menarik.`,
  ]
    .filter(Boolean)
    .join("\n");

  const content = await chatRequest(
    cfg,
    [
      { role: "system", content: REVISION_SYSTEM_PROMPT },
      { role: "user", content: userPrompt },
    ],
    600,
    signal,
  );

  const json = extractJson(content) as Record<string, string>;
  const clue1 = String(json?.clue_1 ?? "").trim();
  if (!clue1 || clue1.length < 4) {
    throw new Error("AI tidak menghasilkan clue_1 yang valid.");
  }
  const clue2 = String(json?.clue_2 ?? "").trim() || undefined;
  const clue3 = String(json?.clue_3 ?? "").trim() || undefined;
  // Deteksi bocoran — kumpulkan, jangan lempar error
  const wordLower = input.word.toLowerCase();
  const leaks: string[] = [];
  if (clue1.toLowerCase().includes(wordLower)) leaks.push("Clue 1");
  if (clue2 && clue2.toLowerCase().includes(wordLower)) leaks.push("Clue 2");
  if (clue3 && clue3.toLowerCase().includes(wordLower)) leaks.push("Clue 3");
  return {
    clue_1: clue1,
    clue_2: clue2,
    clue_3: clue3,
    leaks: leaks.length > 0 ? leaks : undefined,
  };
}
