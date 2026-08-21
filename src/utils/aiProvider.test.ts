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
} = await import("./aiProvider");
import type { AiProviderConfig, AiProviderPreset } from "./aiProvider";

const cfg: AiProviderConfig = {
  provider: "openrouter",
  apiKey: "test-key",
  model: "test-model",
  baseUrl: "https://example.com/v1",
};

/** Mock generateText dari AI SDK — intercept panggilan dan return daftar kata. */
let mockGenerateText: ((opts: any) => Promise<{ text: string }>) | null = null;

mock.module("ai", () => ({
  generateText: async (opts: any) => {
    if (mockGenerateText) return mockGenerateText(opts);
    return { text: JSON.stringify({ words: [] }) };
  },
}));

function mockChat(words: Array<{ word: string; clue: string; clue2?: string }>) {
  let lastPrompt = "";
  mockGenerateText = async (opts: any) => {
    lastPrompt = opts.prompt ?? "";
    return { text: JSON.stringify({ words }) };
  };
  return {
    /** Ambil prompt user terakhir yang dikirim ke AI SDK. */
    lastUserPrompt: () => lastPrompt,
  };
}

afterEach(() => {
  mockGenerateText = null;
});

describe("provider presets — cloud providers", () => {
  const cloudPresets: AiProviderPreset[] = [
    "gemini", "mistral", "openai", "openrouter", "huggingface",
    "groq", "cerebras", "deepseek", "cohere", "together",
    "fireworks", "deepinfra", "puter", "sambanova", "novita",
    "hyperbolic", "xai",
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
