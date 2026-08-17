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
  saveAiProviderConfig,
  clearAiProviderConfig,
  markAiProviderOwner,
  clearAiProviderOwner,
  testAiConnection,
  providerPreset,
  providerLabel,
  type AiProviderConfig,
  type AiProviderPreset,
  type AiTestResult,
} from "../../utils/aiProvider";
import { userRepository } from "../../data/repositories/userRepository";
import { useAuth } from "../auth/useAuth";
import { loggerWarn } from "../../utils/logger";

type Nav = NativeStackNavigationProp<RootStackParamList, "AiProvider">;

const PRESETS: AiProviderPreset[] = ["openrouter", "huggingface", "custom"];

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
  const abortRef = useRef<AbortController | null>(null);

  // Prefill dari config tersimpan (kalau ada).
  useEffect(() => {
    let cancelled = false;
    getAiProviderConfig().then((cfg) => {
      if (cancelled || !cfg) return;
      setProvider(cfg.provider);
      setApiKey(cfg.apiKey);
      setModel(cfg.model);
      setBaseUrl(cfg.baseUrl);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const selectProvider = (p: AiProviderPreset) => {
    play("tap");
    setProvider(p);
    setTestResult(null);
    // Ganti preset → isi default provider itu (API key milik user tidak disentuh).
    if (p === "custom") {
      setModel("");
      setBaseUrl("");
    } else {
      setModel(providerPreset(p).defaultModel);
      setBaseUrl(providerPreset(p).baseUrl);
    }
  };

  const buildConfig = (): AiProviderConfig => ({
    provider,
    apiKey: apiKey.trim(),
    model: (model.trim() || providerPreset(provider).defaultModel).trim(),
    baseUrl: (baseUrl.trim() || providerPreset(provider).baseUrl).trim(),
  });

  const canSave =
    apiKey.trim().length > 0 &&
    buildConfig().model.length > 0 &&
    buildConfig().baseUrl.length > 0;

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
      setTestResult({ ok: true, message: "Pengaturan tersimpan ✓" });
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 1600);
      play("word");
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async () => {
    play("tap");
    await clearAiProviderConfig();
    await clearAiProviderOwner();
    // Hapus juga dari cloud supaya tidak "muncul lagi" di device lain.
    if (user?.id) {
      try {
        await userRepository.saveAiProviderConfig(user.id, null);
      } catch (err) {
        loggerWarn("Gagal hapus config AI dari cloud", err);
      }
    }
    setApiKey("");
    setModel(providerPreset("openrouter").defaultModel);
    setBaseUrl(providerPreset("openrouter").baseUrl);
    setProvider("openrouter");
    setTestResult({ ok: true, message: "Provider AI dihapus." });
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

        {/* Pilih provider */}
        <View style={[styles.section, { backgroundColor: C.surface }]}>
          <Text style={[styles.sectionTitle, { color: C.text }]}>Provider</Text>
          <View style={styles.presetRow}>
            {PRESETS.map((p) => {
              const active = provider === p;
              return (
                <TouchableOpacity
                  key={p}
                  style={[
                    styles.presetBtn,
                    {
                      backgroundColor: active ? C.primary : C.secondaryContainer,
                    },
                    buttonShadow(theme),
                  ]}
                  activeOpacity={0.7}
                  onPress={() => selectProvider(p)}
                >
                  <Text
                    style={[
                      styles.presetBtnText,
                      { color: active ? textOnPrimary(theme) : C.textSecondary },
                    ]}
                  >
                    {providerLabel(p)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <Text style={[styles.fieldHint, { color: C.textSecondary }]}>
            {provider === "openrouter"
              ? "OpenRouter — akses banyak model lewat satu key (openrouter.ai)."
              : provider === "huggingface"
                ? "HuggingFace — Inference Providers router (huggingface.co)."
                : "URL kustom — endpoint chat-completions milikmu sendiri (mis. LM Studio, Ollama, gateway lain)."}
          </Text>
        </View>

        {/* Pengaturan koneksi */}
        <View style={[styles.section, { backgroundColor: C.surface }]}>
          <Text style={[styles.sectionTitle, { color: C.text }]}>Koneksi</Text>

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
          <View              style={[
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
  presetRow: { flexDirection: "row", gap: 8 },
  presetBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  presetBtnText: { fontSize: 13, fontWeight: "700" },
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
  removeBtn: { alignItems: "center", paddingVertical: 10 },
  removeText: { color: "#E74C3C", fontSize: 13, fontWeight: "600" },
});
