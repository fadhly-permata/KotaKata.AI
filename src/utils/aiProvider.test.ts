import { afterEach, describe, expect, mock, test } from "bun:test";

// aiProvider mengimpor userRepository (→ supabase → react-native) dan
// AsyncStorage — keduanya tidak bisa di-parse/dijalankan di Bun, jadi
// di-mock dulu sebelum modul yang diuji di-import.
mock.module("../data/repositories/userRepository", () => ({
  userRepository: {
    getAiProviderConfig: async () => null,
    saveAiProviderConfig: async () => {},
  },
}));
mock.module("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: async () => null,
    setItem: async () => {},
    removeItem: async () => {},
  },
}));

const {
  requestAiWords,
  providerPreset,
  providerLabel,
  isLocalProvider,
  isApiKeyRequired,
  testAiConnection,
} = await import("./aiProvider");
import type { AiProviderConfig, AiProviderPreset } from "./aiProvider";

const cfg: AiProviderConfig = {
  provider: "openrouter",
  apiKey: "test-key",
  model: "test-model",
  baseUrl: "https://example.com/v1",
};

/** Mock fetch global → respons chat-completions dengan daftar kata; simpan body terakhir. */
function mockChat(words: Array<{ word: string; clue: string; clue2?: string }>) {
  let lastBody: { messages?: Array<{ role: string; content: string }> } | null = null;
  (globalThis as any).fetch = async (_url: unknown, init: { body?: string }) => {
    lastBody = JSON.parse(init.body ?? "{}");
    return {
      ok: true,
      json: async () => ({
        choices: [{ message: { content: JSON.stringify({ words }) } }],
      }),
    };
  };
  return {
    /** Ambil pesan user terakhir yang dikirim ke provider. */
    lastUserPrompt: () =>
      lastBody?.messages?.find((m) => m.role === "user")?.content ?? "",
  };
}

const originalFetch = globalThis.fetch;
afterEach(() => {
  (globalThis as any).fetch = originalFetch;
});

describe("provider presets — cloud providers", () => {
  const cloudPresets: AiProviderPreset[] = [
    "gemini", "mistral", "openai", "openrouter", "huggingface",
    "groq", "cerebras", "deepseek", "cohere", "together",
    "fireworks", "deepinfra", "puter", "sambanova", "novita",
    "hyperbolic", "xai", "bai",
  ];

  for (const p of cloudPresets) {
    test(`${p}: punya preset lengkap + butuh API key`, () => {
      const preset = providerPreset(p);
      expect(preset.label.length).toBeGreaterThan(0);
      expect(preset.baseUrl.length).toBeGreaterThan(0);
      expect(isApiKeyRequired(p)).toBe(true);
      expect(isLocalProvider(p)).toBe(false);
    });
  }

  test("lmstudio: preset lokal tanpa API key", () => {
    const preset = providerPreset("lmstudio");
    expect(isLocalProvider("lmstudio")).toBe(true);
    expect(isApiKeyRequired("lmstudio")).toBe(false);
    expect(preset.baseUrl).toContain("localhost");
  });

  test("custom: preset kustom tanpa API key + URL kosong", () => {
    const preset = providerPreset("custom");
    expect(isLocalProvider("custom")).toBe(false);
    expect(isApiKeyRequired("custom")).toBe(false);
    expect(preset.baseUrl).toBe("");
  });

  test("bai: preset OpenAI-compatible (PLAN-085/087)", () => {
    const preset = providerPreset("bai");
    expect(preset.baseUrl).toBe("https://api.b.ai/v1");
    // Default model mengikuti pemakaian pemilik (PLAN-087).
    expect(preset.defaultModel).toBe("deepseek-v4-flash");
  });
});

describe("chatRequest — ekstraksi konten model reasoning (PLAN-086)", () => {
  const originalFetch = globalThis.fetch;
  afterEach(() => {
    (globalThis as any).fetch = originalFetch;
  });

  test("fallback reasoning_content saat content kosong", async () => {
    (globalThis as any).fetch = async () => ({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: "", reasoning_content: "ok" }, finish_reason: "stop" }],
      }),
    });
    const result = await testAiConnection({ ...cfg, provider: "bai", model: "gpt-5.2" });
    expect(result.ok).toBe(true);
  });

  test("bai memakai max_completion_tokens, bukan max_tokens", async () => {
    let lastBody: any = null;
    (globalThis as any).fetch = async (_url: any, init: any) => {
      lastBody = JSON.parse(init.body ?? "{}");
      return {
        ok: true,
        json: async () => ({ choices: [{ message: { content: "ok" }, finish_reason: "stop" }] }),
      };
    };
    await testAiConnection({ ...cfg, provider: "bai", model: "gpt-5.2" });
    expect(lastBody?.max_completion_tokens).toBeGreaterThan(0);
    expect(lastBody?.max_tokens).toBeUndefined();
  });

  test("model non-reasoning di bai tetap memakai max_tokens standar (PLAN-087)", async () => {
    let lastBody: any = null;
    (globalThis as any).fetch = async (_url: any, init: any) => {
      lastBody = JSON.parse(init.body ?? "{}");
      return {
        ok: true,
        json: async () => ({ choices: [{ message: { content: "ok" }, finish_reason: "stop" }] }),
      };
    };
    await testAiConnection({ ...cfg, provider: "bai", model: "deepseek-v4-flash" });
    expect(lastBody?.max_tokens).toBeGreaterThan(0);
    expect(lastBody?.max_completion_tokens).toBeUndefined();
  });

  test("pesan error menyebut finish_reason length saat konten terpotong", async () => {
    (globalThis as any).fetch = async () => ({
      ok: true,
      json: async () => ({ choices: [{ message: { content: "" }, finish_reason: "length" }] }),
    });
    const result = await testAiConnection(cfg);
    expect(result.ok).toBe(false);
    expect(result.message).toContain("finish_reason: length");
  });
});

describe("requestAiWords — exclude kata (PLAN-050)", () => {
  test("tanpa exclude: prompt tidak memuat larangan kata", async () => {
    const { lastUserPrompt } = mockChat([
      { word: "meja", clue: "tempat makan diletakkan", clue2: "benda kayu berkaki empat" },
      { word: "kursi", clue: "tempat duduk", clue2: "punya sandaran" },
      { word: "lampu", clue: "alat penerangan", clue2: "menyala di malam hari" },
      { word: "pintu", clue: "tempat keluar masuk", clue2: "bisa dikunci" },
      { word: "jendela", clue: "bukaan di dinding", clue2: "tempat cahaya masuk" },
    ]);
    const words = await requestAiWords(cfg, 1);
    expect(words.length).toBe(5);
    expect(lastUserPrompt()).not.toContain("JANGAN gunakan kata-kata berikut");
  });

  test("exclude tercantum di prompt yang dikirim ke provider", async () => {
    const { lastUserPrompt } = mockChat([
      { word: "meja", clue: "tempat makan diletakkan", clue2: "benda kayu berkaki empat" },
      { word: "kursi", clue: "tempat duduk", clue2: "punya sandaran" },
      { word: "lampu", clue: "alat penerangan", clue2: "menyala di malam hari" },
      { word: "pintu", clue: "tempat keluar masuk", clue2: "bisa dikunci" },
      { word: "jendela", clue: "bukaan di dinding", clue2: "tempat cahaya masuk" },
      { word: "sofa", clue: "kursi panjang berlapis kain", clue2: "tempat duduk di ruang tamu" },
    ]);
    await requestAiWords(cfg, 1, ["kucing", "Meja", "  rahasia "]);
    const prompt = lastUserPrompt();
    expect(prompt).toContain("JANGAN gunakan kata-kata berikut");
    expect(prompt).toContain("kucing");
    expect(prompt).toContain("meja"); // dinormalisasi lower-case + trim
    expect(prompt).toContain("rahasia");
  });

  test("kata yang ada di exclude difilter di sisi klien (jaga-jaga AI bandel)", async () => {
    const { lastUserPrompt } = mockChat([
      { word: "meja", clue: "tempat makan diletakkan", clue2: "benda kayu berkaki empat" },
      { word: "kursi", clue: "tempat duduk", clue2: "punya sandaran" },
      { word: "lampu", clue: "alat penerangan", clue2: "menyala di malam hari" },
      { word: "kucing", clue: "hewan berbulu yang mengeong", clue2: "peliharaan yang suka ikan" },
      { word: "jendela", clue: "bukaan di dinding", clue2: "tempat cahaya masuk" },
      { word: "sofa", clue: "kursi panjang berlapis kain", clue2: "tempat duduk di ruang tamu" },
    ]);
    const words = await requestAiWords(cfg, 1, ["kucing"]);
    expect(words.map((w) => w.word)).not.toContain("kucing");
    expect(words.length).toBe(5);
    expect(lastUserPrompt()).toContain("kucing");
  });

  test("exclude lebih dari 300 kata dipotong (maksimal 300 di prompt)", async () => {
    const { lastUserPrompt } = mockChat([
      { word: "meja", clue: "tempat makan diletakkan", clue2: "benda kayu berkaki empat" },
      { word: "kursi", clue: "tempat duduk", clue2: "punya sandaran" },
      { word: "lampu", clue: "alat penerangan", clue2: "menyala di malam hari" },
      { word: "pintu", clue: "tempat keluar masuk", clue2: "bisa dikunci" },
      { word: "jendela", clue: "bukaan di dinding", clue2: "tempat cahaya masuk" },
    ]);
    const banyak = Array.from({ length: 400 }, (_, i) => `kata${i}`);
    await requestAiWords(cfg, 1, banyak);
    const prompt = lastUserPrompt();
    // Potongan exclude = 300 kata → cek kata ke-400 tidak ikut terkirim.
    expect(prompt).not.toContain("kata399");
    const chunk = prompt.split("kata berikut (sudah pernah ditemukan pemain): ")[1] ?? "";
    expect(chunk.split(", ").length).toBeLessThanOrEqual(300);
  });
});
