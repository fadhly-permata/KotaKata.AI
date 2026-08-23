import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Haptic feedback (PLAN-102) — getar halus untuk event penting di native.
 *
 * Aturan #5b (jaga platform lain):
 * - Web: TIDAK melakukan apa pun (getar tidak ada di browser; guard berdasarkan
 *   Platform + cek FUNGSI eksplisit, bukan cuma keberadaan modul).
 * - Native: expo-haptics dipanggil dengan guard fungsi — gagal = ditelan diam
 *   (non-kritis, sesuai pengecualian aturan #7 dengan komentar alasan).
 *
 * Preferensi on/off: "kotakata.hapticEnabled" (default NYALA), konsisten
 * dengan pola preferensi suara.
 */

const PREF_KEY = "kotakata.hapticEnabled";

type HapticsModule = {
  impactAsync?: (style: unknown) => Promise<void>;
  notificationAsync?: (type: unknown) => Promise<void>;
  ImpactFeedbackStyle?: { Light?: unknown; Medium?: unknown };
  NotificationFeedbackType?: { Success?: unknown; Error?: unknown; Warning?: unknown };
};

let cachedModule: HapticsModule | null | undefined;

/** Muat modul expo-haptics secara lazy & aman (web → null). */
function getHaptics(): HapticsModule | null {
  if (cachedModule !== undefined) return cachedModule;
  if (Platform.OS === "web") {
    cachedModule = null;
    return cachedModule;
  }
  try {
    // require agar bundler web tidak memuat native module sama sekali.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    cachedModule = require("expo-haptics") as HapticsModule;
  } catch {
    cachedModule = null;
  }
  return cachedModule;
}

let enabledCache = true;

export function isHapticEnabled(): boolean {
  return enabledCache;
}

export async function setHapticEnabled(value: boolean): Promise<void> {
  enabledCache = value;
  try {
    await AsyncStorage.setItem(PREF_KEY, value ? "1" : "0");
  } catch {
    // abaikan — penyimpanan preferensi gagal tetap lanjut (non-kritis)
  }
}

/** Baca preferensi dari storage saat app start. */
export async function initHapticPref(): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(PREF_KEY);
    enabledCache = raw !== "0"; // default NYALA
  } catch {
    enabledCache = true;
  }
}

function fire(fn?: (arg: unknown) => Promise<void>, arg?: unknown): void {
  if (!isHapticEnabled()) return;
  if (typeof fn !== "function") return; // guard eksplisit fungsi (aturan #5b)
  fn(arg).catch(() => {
    // abaikan — getar gagal bukan masalah pengalaman utama
  });
}

/** Getar halus — ketukan tombol / tile benar. */
export function hapticLight(): void {
  const h = getHaptics();
  if (!h || typeof h.impactAsync !== "function") return;
  fire(() => h.impactAsync!(h.ImpactFeedbackStyle?.Light), undefined);
}

/** Notifikasi sukses — kata terjawab benar / papan selesai. */
export function hapticSuccess(): void {
  const h = getHaptics();
  if (!h || typeof h.notificationAsync !== "function") return;
  fire(() => h.notificationAsync!(h.NotificationFeedbackType?.Success), undefined);
}

/** Notifikasi error — jawaban salah. */
export function hapticError(): void {
  const h = getHaptics();
  if (!h || typeof h.notificationAsync !== "function") return;
  fire(() => h.notificationAsync!(h.NotificationFeedbackType?.Error), undefined);
}
