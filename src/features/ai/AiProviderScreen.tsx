import { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useTheme } from "../../presentation/components/providers/ThemeProvider";
import { buttonShadow, textOnPrimary } from "../../utils/skin";
import TopBar from "../../presentation/components/common/TopBar";
import ScreenFade from "../../presentation/components/common/ScreenFade";
import { play } from "../../utils/sound";
import type { RootStackParamList } from "../../presentation/navigation/RootNavigator";
import {
  getAiProviderConfig,
  getAiProviderConfigFor,
  getActiveProvider,
  saveAiProviderConfig,
  clearAiProviderConfigFor,
  markAiProviderOwner,
  clearAiProviderOwner,
  testAiConnection,
  providerPreset,
  providerLabel,
  isLocalProvider,
  isApiKeyRequired,
  type AiProviderConfig,
  type AiProviderPreset,
  type AiTestResult,
} from "../../utils/aiProvider";
import { userRepository } from "../../data/repositories/userRepository";
import { useAuth } from "../auth/useAuth";
import { loggerWarn } from "../../utils/logger";

type Nav = NativeStackNavigationProp<RootStackParamList, "AiProvider">;

/** Kategori provider untuk grouping di dropdown. */
const PROVIDER_GROUPS: { label: string; items: AiProviderPreset[] }[] = [
  { label: "\u2601\ufe0f Cloud (GRATIS)", items: ["gemini", "mistral", "openrouter", "huggingface"] },
  { label: "\u2601\ufe0f Cloud (API Key)", items: ["openai"] },
  { label: "\ud83d\udda5\ufe0f Lokal (Offline)", items: ["lmstudio"] },
  { label: "\ud83d\udd27 URL Kustom", items: ["custom"] },
];

const PRESETS: AiProviderPreset[] = PROVIDER_GROUPS.flatMap((g) => g.items);

/** Badge gratis per provider (hanya untuk yang punya free tier). */
const FREE_BADGES: Partial<Record<AiProviderPreset, string>> = {
  gemini: "\u2728 15 RPM",
  mistral: "\u2728 Free tier",
  openrouter: "\u2728 Bebas model",
  huggingface: "\u2728 Inference",
};

export default function AiProviderScreen() {
  const { theme } = useTheme();
  const C = theme.colors;
  const navigation = useNavigation<Nav>();
  const { user } = useAuth();

  const [provider, setProvider] = useState<AiProviderPreset>("openrouter");
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState(providerPreset("openrouter").defaultModel);
  const [baseUrl, setBaseUrl] = useState(providerPreset("openrouter").baseUrl);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<AiTestResult | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [savedProviders, setSavedProviders] = useState<Set<AiProviderPreset>>(new Set());
  const [activeProvider, setActiveProviderState] = useState<AiProviderPreset>("openrouter");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  // Load saved providers list
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { getAllSavedProviders } = await import("../../utils/aiProvider");
      const saved = await getAllSavedProviders();
      if (!cancelled) setSavedProviders(new Set(saved));
    })();
    return () => { cancelled = true; };
  }, []);

  // Prefill dari config tersimpan provider yang aktif.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const active = await getActiveProvider();
      if (cancelled) return;
      setProvider(active);
      const cfg = await getAiProviderConfigFor(active);
      if (cancelled || !cfg) return;
      setApiKey(cfg.apiKey);
      setModel(cfg.model);
      setBaseUrl(cfg.baseUrl);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const selectProvider = async (p: AiProviderPreset) => {
    play("tap");
    setProvider(p);
    setTestResult(null);
    try {
      // Load saved config untuk provider ini
      const saved = await getAiProviderConfigFor(p);
      if (saved) {
        setApiKey(saved.apiKey);
        setModel(saved.model);
        setBaseUrl(saved.baseUrl);
      } else {
        // Gunakan default
        const preset = providerPreset(p);
        if (p === "custom") {
          setModel("");
          setBaseUrl("");
          setApiKey("");
        } else {
          setModel(preset.defaultModel);
          setBaseUrl(preset.baseUrl);
          if (!isApiKeyRequired(p)) setApiKey("");
        }
      }
    } catch (err) {
      loggerWarn("Gagal memuat config provider", err);
    }
  };

  const buildConfig = (): AiProviderConfig => ({
    provider,
    apiKey: apiKey.trim(),
    model: (model.trim() || providerPreset(provider).defaultModel).trim(),
    baseUrl: (baseUrl.trim() || providerPreset(provider).baseUrl).trim(),
  });

  const canSave =
    buildConfig().model.length > 0 &&
    buildConfig().baseUrl.length > 0 &&
    (isApiKeyRequired(provider) ? apiKey.trim().length > 0 : true);

  const handleTest = async () => {
    if (!canSave) {
      setTestResult({ ok: false, message: "Lengkapi API key, model, dan URL dulu." });
      return;
    }
    play("tap");
    setTesting(true);
    setTestResult(null);
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const timer = setTimeout(() => controller.abort(), 20000);
    try {
      const r = await testAiConnection(buildConfig(), controller.signal);
      setTestResult(r);
      if (r.ok) play("word");
      else play("error");
    } finally {
      clearTimeout(timer);
      setTesting(false);
    }
  };

  const handleSave = async () => {
    if (!canSave) {
      setTestResult({ ok: false, message: "Lengkapi API key, model, dan URL dulu." });
      return;
    }
    play("tap");
    setSaving(true);
    try {
      const cfg = buildConfig();
      await saveAiProviderConfig(cfg);
      // Sinkronkan ke cloud (kolom users.ai_provider_config) supaya akun yang
      // sama di device lain ikut punya config ini — Main Mode AI bisa dipakai
      // lintas perangkat. Gagal sync tidak membatalkan simpan lokal.
      if (user?.id) {
        try {
          await userRepository.saveAiProviderConfig(user.id, cfg);
          await markAiProviderOwner(user.id);
        } catch (err) {
          loggerWarn("Gagal sinkron config AI ke cloud", err);
        }
      }
      setTestResult({ ok: true, message: `✓ ${providerLabel(provider)} tersimpan & aktif` });
      setSavedFlash(true);
      setSavedProviders((prev) => new Set([...prev, provider]));
      setActiveProviderState(provider);
      setTimeout(() => setSavedFlash(false), 1600);
      play("word");
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async () => {
    play("tap");
    try {
      await clearAiProviderConfigFor(provider);
      await clearAiProviderOwner();
      if (user?.id) {
        try {
          await userRepository.saveAiProviderConfig(user.id, null);
        } catch (err) {
          loggerWarn("Gagal hapus config AI dari cloud", err);
        }
      }
      const preset = providerPreset(provider);
      setApiKey("");
      setModel(preset.defaultModel);
      setBaseUrl(preset.baseUrl);
      setTestResult({ ok: true, message: `${providerLabel(provider)} dihapus.` });
    } catch (err) {
      loggerWarn("Gagal menghapus provider", err);
      setTestResult({ ok: false, message: "Gagal menghapus provider. Coba lagi." });
    }
  };

  const inputStyle = [styles.input, { backgroundColor: C.secondaryContainer, color: C.text }];

  return (
    <ScreenFade style={[styles.container, { backgroundColor: C.background }]}>
      <TopBar />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={[styles.pageTitle, { color: C.text }]}>Pengaturan Provider AI</Text>
        <Text style={[styles.pageHint, { color: C.textSecondary }]}>
          Main Mode AI memakai model dari provider yang kamu pilih. Pengaturan
          tersimpan di perangkat ini dan tersinkron ke akunmu — otomatis tersedia
          di semua perangkat. API key tetap milikmu (BYOK) dan hanya akunmu yang
          bisa mengaksesnya.
        </Text>
        <Text style={[styles.langHint, { color: C.primary }]}>
          🇮🇩 Semua soal, kosakata, dan petunjuk dibuat dalam Bahasa Indonesia.
        </Text>

        {/* Pilih provider — dropdown picker */}
        <View style={[styles.section, { backgroundColor: C.surface }]}>
          <Text style={[styles.sectionTitle, { color: C.text }]}>Provider</Text>
          {/* Dropdown trigger */}
          <TouchableOpacity
            style={[styles.dropdownBtn, { backgroundColor: C.secondaryContainer, borderColor: C.textSecondary + "30" }]}
            activeOpacity={0.7}
            onPress={() => {
              play("tap");
              setDropdownOpen((prev) => !prev);
            }}
          >
            <Text style={[styles.dropdownText, { color: C.text }]}>
              {dropdownOpen ? "▲" : "▼"}  {providerLabel(provider)}{savedProviders.has(provider) ? " ✓" : ""}
            </Text>
          </TouchableOpacity>
          {/* Dropdown menu */}            {dropdownOpen && (
            <View style={[styles.dropdownMenu, { backgroundColor: C.secondaryContainer, borderColor: C.textSecondary + "30" }]}>              
              {PROVIDER_GROUPS.map((group, gi) => (
                <View key={gi}>
                  {gi > 0 && <View style={[styles.dropdownDivider, { backgroundColor: C.textSecondary + "20" }]} />}                  
                  <Text style={[styles.dropdownGroupLabel, { color: C.textSecondary }]}>{group.label}</Text>                  
                  {group.items.map((p) => {
                    const isSaved = savedProviders.has(p);
                    const isActive = activeProvider === p && isSaved;
                    const isSel = provider === p;
                    const freeBadge = FREE_BADGES[p];
                    return (
                      <TouchableOpacity
                        key={p}
                        style={[styles.dropdownItem, { backgroundColor: isSel ? C.primary + "18" : "transparent" }]}
                        activeOpacity={0.6}
                        onPress={() => {
                          play("tap");
                          setDropdownOpen(false);
                          selectProvider(p);
                        }}
                      >
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                          <Text style={[styles.dropdownItemText, { color: isSel ? C.primary : C.text }]}>
                            {providerLabel(p)}{isSaved ? "  ✓" : ""}{isActive ? "  (aktif)" : ""}
                          </Text>
                          {freeBadge && (
                            <Text style={{ fontSize: 11, fontWeight: "700", color: C.primary, opacity: 0.85 }}>{freeBadge}</Text>
                          )}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ))}
            </View>
          )}
          <Text style={[styles.fieldHint, { color: C.textSecondary }]}>
            {provider === "gemini"
              ? "Google Gemini — model gratis via Google AI Studio. Gratis 15 RPM (gemini-2.0-flash)."
              : provider === "mistral"
                ? "Mistral AI — model gratis via La Plateforme (mistral-small-latest). OpenAI-compatible API."
                : provider === "openai"
                  ? "OpenAI — model GPT (gpt-4o-mini) via API resmi. Gratis $5 credit awal."
                  : provider === "openrouter"
                    ? "OpenRouter — akses banyak model lewat satu key (openrouter.ai)."
                    : provider === "huggingface"
                      ? "HuggingFace — Inference Providers router (huggingface.co)."
                      : provider === "lmstudio"
                          ? "LM Studio — GUI lokal untuk load model GGUF. Jalankan LM Studio, aktifkan server (default port 1234). Bisa akses via LAN (http://IP_KOMPUTER:1234/v1)."
                          : "URL kustom — endpoint chat-completions milikmu sendiri."}
          </Text>
        </View>

        {/* Pengaturan koneksi */}
        <View style={[styles.section, { backgroundColor: C.surface }]}>
          <Text style={[styles.sectionTitle, { color: C.text }]}>Koneksi</Text>

          {isApiKeyRequired(provider) && (
            <>
              <Text style={[styles.fieldLabel, { color: C.textSecondary }]}>API Key</Text>
              <TextInput
                style={inputStyle}
                value={apiKey}
                onChangeText={setApiKey}
                placeholder="sk-… / hf_…"
                placeholderTextColor={C.textSecondary}
                autoCapitalize="none"
                autoCorrect={false}
                secureTextEntry
              />
            </>
          )}
          {isLocalProvider(provider) && (
            <View style={[styles.localInfo, { backgroundColor: "#FEF3C7", borderColor: "#F59E0B" }]}>
              <Text style={{ fontSize: 12, fontWeight: "700", color: "#92400E", marginBottom: 4 }}>
                ⚠️ Provider lokal — harus dari jaringan yang sama (localhost / LAN)
              </Text>
              <Text style={{ fontSize: 11, color: "#92400E", lineHeight: 16 }}>
                {"Jalankan app lokal: bunx expo start --web\nLalu aktifkan server di LM Studio (port 1234). Bisa pakai IP LAN/intranet (mis. 192.168.x.x) untuk akses dari device lain di jaringan yang sama."}
              </Text>
              <Text style={{ fontSize: 10, color: "#B45309", marginTop: 6, lineHeight: 14 }}>
                {"Tidak bisa dari URL deployed (kotakata-ai.expo.app) karena\nbrowser dan server harus di jaringan yang sama."}
              </Text>
            </View>
          )}

          <Text style={[styles.fieldLabel, { color: C.textSecondary }]}>Model</Text>
          <TextInput
            style={inputStyle}
            value={model}
            onChangeText={setModel}
            placeholder="nama model (mis. openai/gpt-4o-mini)"
            placeholderTextColor={C.textSecondary}
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Text style={[styles.fieldLabel, { color: C.textSecondary }]}>Base URL (chat/completions)</Text>
          <TextInput
            style={inputStyle}
            value={baseUrl}
            onChangeText={setBaseUrl}
            placeholder="https://…/v1"
            placeholderTextColor={C.textSecondary}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
          />
        </View>

        {/* Aksi */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: C.secondaryContainer }, buttonShadow(theme)]}
            activeOpacity={0.7}
            onPress={handleTest}
            disabled={testing || saving}
          >
            {testing ? (
              <ActivityIndicator color={C.secondary} size="small" />
            ) : (
              <Text style={[styles.actionBtnText, { color: C.secondary }]}>📡 Tes Koneksi</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: C.primary }, buttonShadow(theme)]}
            activeOpacity={0.8}
            onPress={handleSave}
            disabled={testing || saving}
          >
            {saving ? (
              <ActivityIndicator color={textOnPrimary(theme)} size="small" />
            ) : (
              <Text style={[styles.actionBtnPrimaryText, { color: textOnPrimary(theme) }]}>
                {savedFlash ? "✓ Tersimpan" : "Simpan"}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Hasil tes / status */}
        {testResult && (
          <View
            style={[
              styles.resultBox,
              {
                backgroundColor: testResult.ok
                  ? C.success + "1F"
                  : C.error + "1F",
                borderColor: testResult.ok ? C.success : C.error,
              },
            ]}
          >
            <Text
              style={[
                styles.resultText,
                { color: testResult.ok ? C.success : C.error },
              ]}
            >
              {testResult.message}
            </Text>
          </View>
        )}

        <TouchableOpacity style={styles.removeBtn} activeOpacity={0.6} onPress={handleRemove}>
          <Text style={[styles.removeText, { color: C.error }]}>🗑 Hapus Provider Tersimpan</Text>
        </TouchableOpacity>
      </ScrollView>
    </ScreenFade>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, gap: 12, paddingBottom: 40 },
  pageTitle: { fontSize: 22, fontWeight: "900", letterSpacing: -0.4 },
  pageHint: { fontSize: 13, lineHeight: 19 },
  langHint: { fontSize: 13, lineHeight: 19, fontWeight: "600", marginTop: 6 },
  section: { borderRadius: 12, padding: 16, gap: 10 },
  sectionTitle: { fontSize: 16, fontWeight: "700" },
  dropdownBtn: {
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  dropdownText: { fontSize: 14, fontWeight: "600" },
  dropdownMenu: {
    borderRadius: 10,
    borderWidth: 1,
    overflow: "hidden",
  },
  dropdownGroupLabel: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.4,
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 4,
  },
  dropdownDivider: {
    height: 1,
    marginHorizontal: 10,
    marginTop: 2,
  },
  dropdownItem: {
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  dropdownItemText: { fontSize: 14, fontWeight: "600" },
  fieldHint: { fontSize: 12, lineHeight: 17 },
  fieldLabel: { fontSize: 12, fontWeight: "700", letterSpacing: 0.4, textTransform: "uppercase" },
  input: {
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    fontWeight: "500",
  },
  actionRow: { flexDirection: "row", gap: 10 },
  actionBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  actionBtnText: { fontSize: 14, fontWeight: "700" },
  actionBtnPrimaryText: { color: "#FFFFFF", fontSize: 14, fontWeight: "800" },
  resultBox: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    alignItems: "center",
  },
  resultText: { fontSize: 13, fontWeight: "600", textAlign: "center", lineHeight: 18 },
  localInfo: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 10,
  },
  removeBtn: { alignItems: "center", paddingVertical: 10 },
  removeText: { color: "#E74C3C", fontSize: 13, fontWeight: "600" },
});
