import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Main Mode AI (BYOK) — integrasi provider AI untuk membuat soal TTS.
 *
 * - Config provider (API key + model + base URL) disimpan LOKAL di
 *   AsyncStorage ("kotakata.aiProvider") — tidak pernah dikirim ke server
 *   KotaKata (Bring Your Own Key).
 * - Provider yang didukung: OpenRouter, HuggingFace (Inference Providers
 *   router), dan URL kustom — semuanya berbicara API chat-completions gaya
 *   OpenAI, jadi cukup satu implementasi request.
 * - Semua error dilempar sebagai Error dengan pesan ramah untuk ditampilkan
 *   ke user (mis. di dialog "Soal AI Gagal Dimuat").
 */

export type AiProviderPreset = "openrouter" | "huggingface" | "custom";

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

const STORAGE_KEY = "kotakata.aiProvider";

interface ProviderPreset {
  label: string;
  baseUrl: string;
  defaultModel: string;
}

const PROVIDER_PRESETS: Record<AiProviderPreset, ProviderPreset> = {
  openrouter: {
    label: "OpenRouter",
    baseUrl: "https://openrouter.ai/api/v1",
    defaultModel: "openai/gpt-4o-mini",
  },
  huggingface: {
    label: "HuggingFace",
    baseUrl: "https://router.huggingface.co/v1",
    defaultModel: "meta-llama/Llama-3.3-70B-Instruct",
  },
  custom: {
    label: "URL Kustom",
    baseUrl: "",
    defaultModel: "",
  },
};

export function providerPreset(p: AiProviderPreset): ProviderPreset {
  return PROVIDER_PRESETS[p];
}

export function providerLabel(p: AiProviderPreset): string {
  return PROVIDER_PRESETS[p].label;
}

/** Baca config provider tersimpan; null kalau belum diatur / tidak valid. */
export async function getAiProviderConfig(): Promise<AiProviderConfig | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const cfg = JSON.parse(raw) as AiProviderConfig;
    if (!cfg?.apiKey || !cfg?.model || !cfg?.baseUrl) return null;
    return cfg;
  } catch {
    return null;
  }
}

export async function saveAiProviderConfig(cfg: AiProviderConfig): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
}

export async function clearAiProviderConfig(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEY);
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
  const res = await fetch(chatUrl(cfg), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${cfg.apiKey}`,
    },
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
 */
export async function requestAiWords(
  cfg: AiProviderConfig,
  playerTier: number,
  signal?: AbortSignal,
): Promise<AiWord[]> {
  const content = await chatRequest(
    cfg,
    [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: `${USER_PROMPT} ${tierPrompt(playerTier)}` },
    ],
    1500,
    signal,
  );

  const json = extractJson(content);
  const arr = (json as any)?.words;
  if (!Array.isArray(arr)) {
    throw new Error("Respons AI tidak valid: field \"words\" tidak ditemukan.");
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
    seen.add(word);
    words.push({ word, clue_1: clue, clue_2: clue2 || undefined });
  }

  if (words.length < 5) {
    throw new Error("Soal dari AI kurang valid — coba lagi.");
  }
  return words;
}
