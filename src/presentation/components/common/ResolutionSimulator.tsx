import { useCallback, useMemo, useState } from "react";
import {
  Platform,
  Modal,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  useWindowDimensions,
} from "react-native";
import { createElement } from "react";
import { useAuth } from "../../../features/auth/useAuth";

/**
 * PLAN-068 (revisi): Simulasi Resolusi Layar untuk ADMIN — web only.
 *
 * Admin bisa melihat tampilan halaman pada berbagai resolusi device
 * (preset HP/tablet atau ukuran kustom) lewat iframe yang memuat halaman
 * yang sama, TANPA perlu ganti device sungguhan. Iframe = viewport nyata,
 * jadi `useWindowDimensions`, breakpoint, dan layout responsif ikut akurat.
 *
 * Guard platform (aturan #5b):
 * - HANYA dirender saat Platform.OS === "web" DAN API DOM tersedia.
 * - Di native APK/iOS komponen merender null (fitur tidak relevan di sana,
 *   layout native dicek langsung di device).
 */

const PRESETS: Array<{ label: string; w: number; h: number }> = [
  { label: "HP Kecil", w: 320, h: 568 },
  { label: "Android S", w: 360, h: 640 },
  { label: "iPhone 8", w: 375, h: 667 },
  { label: "iPhone 13", w: 390, h: 844 },
  { label: "Pixel 6", w: 412, h: 915 },
  { label: "Tablet", w: 768, h: 1024 },
];

export default function ResolutionSimulator() {
  const { user } = useAuth();
  const { width: winW, height: winH } = useWindowDimensions();

  const [open, setOpen] = useState(false);
  const [w, setW] = useState(360);
  const [h, setH] = useState(640);
  const [landscape, setLandscape] = useState(false);
  const [customW, setCustomW] = useState("");
  const [customH, setCustomH] = useState("");
  // Key untuk memaksa iframe reload saat resolusi/URL berubah.
  const [reloadKey, setReloadKey] = useState(0);

  const isWeb =
    Platform.OS === "web" &&
    typeof document !== "undefined" &&
    typeof document.createElement === "function" &&
    typeof window?.location?.href === "string";

  const simW = landscape ? h : w;
  const simH = landscape ? w : h;

  // Skala agar preview muat di layar sungguhan (maks 82% area viewport).
  const maxW = Math.max(200, winW * 0.82);
  const maxH = Math.max(240, winH * 0.72);
  const scale = Math.min(1, maxW / simW, maxH / simH);

  const applyPreset = useCallback((p: { w: number; h: number }) => {
    setW(p.w);
    setH(p.h);
    setReloadKey((k) => k + 1);
  }, []);

  const applyCustom = useCallback(() => {
    const cw = parseInt(customW, 10);
    const ch = parseInt(customH, 10);
    if (!isNaN(cw) && cw >= 200 && cw <= 2560) setW(cw);
    if (!isNaN(ch) && ch >= 200 && ch <= 2560) setH(ch);
    setReloadKey((k) => k + 1);
  }, [customW, customH]);

  const iframeElement = useMemo(
    () =>
      createElement("iframe", {
        key: `${reloadKey}-${simW}x${simH}`,
        src: window.location.href.split("#")[0] + window.location.hash,
        title: "Preview resolusi",
        style: {
          width: `${simW}px`,
          height: `${simH}px`,
          border: "none",
          backgroundColor: "#fff",
        },
      }),
    [reloadKey, simW, simH],
  );

  // Hanya admin & hanya web — selain itu render apa pun tidak diperlukan.
  // CATATAN: early-return HARUS setelah SEMUA hook dipanggil (aturan React);
  // pelanggaran urutan ini penyebab React error #310 di produksi.
  if (!isWeb || !user?.isAdmin) return null;

  return (
    <>
      {/* Tombol melayang kecil di kanan-bawah — tidak mengganggu konten. */}
      <TouchableOpacity
        onPress={() => setOpen(true)}
        activeOpacity={0.7}
        style={[styles.fab, { bottom: 18, right: 14 }]}
      >
        <Text style={{ fontSize: 15 }}>🖥️</Text>
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <View style={styles.backdrop}>
          <View style={styles.panel}>
            <View style={styles.header}>
              <Text style={styles.title}>🖥️ Simulasi Resolusi</Text>
              <TouchableOpacity onPress={() => setOpen(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={styles.close}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Preview iframe — diskalakan agar muat di layar. */}
            <View style={styles.previewArea} pointerEvents="box-none">
              <View style={[styles.deviceFrame, { width: simW * scale, height: simH * scale }]}>
                <View style={{ width: simW, height: simH, transform: [{ scale }] }}>{iframeElement}</View>
              </View>
              <Text style={styles.dimLabel}>
                {simW}×{simH} px · zoom {Math.round(scale * 100)}%
                {landscape ? " · landscape" : ""}
              </Text>
            </View>

            {/* Preset device */}
            <View style={styles.presetWrap}>
              {PRESETS.map((p) => {
                const active = p.w === w && p.h === h;
                return (
                  <TouchableOpacity
                    key={p.label}
                    onPress={() => applyPreset(p)}
                    style={[styles.presetBtn, active && styles.presetActive]}
                  >
                    <Text style={[styles.presetText, active && styles.presetTextActive]}>
                      {p.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Orientasi + custom size */}
            <View style={styles.bottomRow}>
              <TouchableOpacity onPress={() => setLandscape((v) => !v)} style={styles.rotateBtn}>
                <Text style={styles.presetText}>🔄 {landscape ? "Portrait" : "Landscape"}</Text>
              </TouchableOpacity>
              <TextInput
                value={customW}
                onChangeText={setCustomW}
                placeholder="Lebar"
                placeholderTextColor="#888"
                keyboardType="numeric"
                style={styles.customInput}
              />
              <Text style={styles.xLabel}>×</Text>
              <TextInput
                value={customH}
                onChangeText={setCustomH}
                placeholder="Tinggi"
                placeholderTextColor="#888"
                keyboardType="numeric"
                style={styles.customInput}
              />
              <TouchableOpacity onPress={applyCustom} style={styles.applyBtn}>
                <Text style={styles.presetTextActive}>Terapkan</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.hint}>
              Preview memuat ulang halaman ini di ukuran terpilih (web only). Perubahan data di
              preview tidak mengganggu sesi aslimu.
            </Text>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: "absolute",
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(30,30,30,0.85)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9998,
    elevation: 10,
  },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  panel: {
    width: "100%",
    maxWidth: 520,
    borderRadius: 16,
    backgroundColor: "#1E1E24",
    padding: 14,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  title: { color: "#FFF", fontSize: 15, fontWeight: "800" },
  close: { color: "#AAA", fontSize: 16, fontWeight: "700" },
  previewArea: { alignItems: "center", marginBottom: 10 },
  deviceFrame: {
    overflow: "hidden",
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#444",
    backgroundColor: "#000",
  },
  dimLabel: { color: "#9A9AA5", fontSize: 11, marginTop: 6 },
  presetWrap: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 10 },
  presetBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#55555F",
    backgroundColor: "#2A2A33",
  },
  presetActive: { backgroundColor: "#4F6BFF", borderColor: "#4F6BFF" },
  presetText: { color: "#DDD", fontSize: 12, fontWeight: "600" },
  presetTextActive: { color: "#FFF", fontSize: 12, fontWeight: "700" },
  bottomRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  rotateBtn: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#55555F",
    backgroundColor: "#2A2A33",
  },
  customInput: {
    width: 64,
    height: 34,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#55555F",
    backgroundColor: "#14141A",
    color: "#FFF",
    paddingHorizontal: 8,
    fontSize: 13,
    textAlign: "center",
  },
  xLabel: { color: "#777", fontWeight: "700" },
  applyBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#4F6BFF",
  },
  hint: { color: "#777783", fontSize: 10, lineHeight: 14 },
});
