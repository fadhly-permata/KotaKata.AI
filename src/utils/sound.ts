import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import { Asset } from "expo-asset";
import { createAudioPlayer, setAudioModeAsync } from "expo-audio";
import type { AudioPlayer } from "expo-audio";
import type { AmbientSoundSpec } from "../presentation/themes/themeData";
import { loggerWarn } from "./logger";

/**
 * Efek suara game + backsound tema.
 *
 * - Native: expo-audio (player dibuat LAZY, satu per suara, replay via seekTo(0)).
 * - Web: expo-audio WEB punya bug — `play()` memanggil `media.play()` tanpa
 *   menangkap Promise rejection, sehingga source yang gagal dimuat berubah jadi
 *   "Unhandled promise rejection" (tercatat sebagai error di Log). Karena itu di
 *   web dipakai `HTMLAudioElement` manual + `Asset.fromModule` (URI valid) dan
 *   SEMUA error (load / autoplay / playback) ditangkap — tidak pernah bocor jadi
 *   unhandled rejection.
 * - BACKSOUND (setAmbientSound): loop pelan dari URL MP3 online, mengikuti tema
 *   aplikasi aktif (lihat AmbientSoundSpec di themeData.ts). Di web, browser
 *   memblokir autoplay sebelum ada interaksi user — kalau keblokir, diputar
 *   otomatis saat gestur pertama (pointer/keyboard/touch).
 * - Preferensi hidup/mati disimpan di AsyncStorage ("kotakata.soundEnabled");
 *   saat dimatikan, backsound ikut di-pause.
 * - Semua akses native dibungkus try/catch — suara tidak pernah merusak aplikasi.
 */

export type SoundName = "tap" | "letter" | "word" | "error" | "win" | "popup" | "hint";

const SOUND_SOURCES: Record<SoundName, unknown> = {
  tap: require("../../assets/sfx/tap.wav"),
  letter: require("../../assets/sfx/letter.wav"),
  word: require("../../assets/sfx/word.wav"),
  error: require("../../assets/sfx/error.wav"),
  win: require("../../assets/sfx/win.wav"),
  popup: require("../../assets/sfx/popup.wav"),
  hint: require("../../assets/sfx/hint.wav"),
};

const SOUND_KEY = "kotakata.soundEnabled";

const IS_WEB = Platform.OS === "web";

let enabled = true;
let nativePlayers: Partial<Record<SoundName, AudioPlayer>> | null = null;
let initStarted = false;

// Kepribadian audio tema aktif (lihat SoundSpec di themeData.ts):
// rate <1 lebih pelan/lembut, >1 lebih cepat/ceria; volume relatif 0–1.
let currentRate = 1;
let currentVolume = 1;

// ---------------------------------------------------------------------------
// Backsound tema (ambient) — loop pelan, satu sumber aktif per waktu.
// ---------------------------------------------------------------------------
let ambientSpec: AmbientSoundSpec | null = null;
let nativeAmbientPlayer: AudioPlayer | null = null;
let webAmbientAudio: HTMLAudioElement | null = null;
/** Web: backsound siap tapi autoplay diblokir browser → tunggu gestur user. */
let ambientPendingWeb = false;
let ambientGestureBound = false;

function clamp01(v: number): number {
  if (Number.isFinite(v)) return Math.min(1, Math.max(0, v));
  return 0.3;
}

function stopAmbientNative(): void {
  try {
    if (nativeAmbientPlayer) {
      nativeAmbientPlayer.pause();
      nativeAmbientPlayer.remove();
      nativeAmbientPlayer = null;
    }
  } catch {
    // abaikan — backsound hanya pemanis.
  }
}

function startAmbientNative(): void {
  if (!enabled || !ambientSpec) {
    stopAmbientNative();
    return;
  }
  try {
    if (!nativeAmbientPlayer) {
      nativeAmbientPlayer = createAudioPlayer({ uri: ambientSpec.url });
      nativeAmbientPlayer.loop = true;
    } else {
      // Ganti sumber tanpa membuat player baru (kalau API tidak tersedia,
      // fallback: buat ulang).
      try {
        nativeAmbientPlayer.replace({ uri: ambientSpec.url });
      } catch {
        stopAmbientNative();
        nativeAmbientPlayer = createAudioPlayer({ uri: ambientSpec.url });
        nativeAmbientPlayer.loop = true;
      }
    }
    nativeAmbientPlayer.volume = clamp01(ambientSpec.volume ?? 0.3);
    nativeAmbientPlayer.play();
  } catch (err) {
    loggerWarn("Backsound tema gagal diputar (native)", err);
  }
}

function stopAmbientWeb(): void {
  ambientPendingWeb = false;
  try {
    webAmbientAudio?.pause();
  } catch {
    // abaikan
  }
}

function startAmbientWeb(): void {
  if (!enabled || !ambientSpec) {
    stopAmbientWeb();
    return;
  }
  try {
    if (!webAmbientAudio) {
      webAmbientAudio = new Audio();
      webAmbientAudio.loop = true;
    }
    if (webAmbientAudio.src !== ambientSpec.url) {
      webAmbientAudio.src = ambientSpec.url;
      webAmbientAudio.load();
    }
    webAmbientAudio.volume = clamp01(ambientSpec.volume ?? 0.3);
    const p = webAmbientAudio.play();
    if (p && typeof p.then === "function") {
      p.then(() => {
        ambientPendingWeb = false;
      }).catch(() => {
        // Autoplay policy (belum ada interaksi user) → tunggu gestur pertama.
        ambientPendingWeb = true;
      });
    } else {
      ambientPendingWeb = false;
    }
  } catch {
    ambientPendingWeb = true;
  }
}

/** Web: coba mulai lagi backsound yang diblokir autoplay saat user berinteraksi. */
function retryAmbientOnGesture(): void {
  if (!ambientPendingWeb || !webAmbientAudio) return;
  ambientPendingWeb = false;
  try {
    const p = webAmbientAudio.play();
    if (p && typeof p.then === "function") p.catch(() => {});
  } catch {
    // tetap diam — user bisa ganti tema / nyalakan suara lagi.
  }
}

function bindWebAmbientGesture(): void {
  if (ambientGestureBound || typeof window === "undefined") return;
  ambientGestureBound = true;
  const events = ["pointerdown", "keydown", "touchstart"] as const;
  for (const ev of events) {
    window.addEventListener(ev, retryAmbientOnGesture, { passive: true });
  }
}

/** Terapkan backsound sesuai spec aktif (no-op bila tidak ada / suara mati). */
function applyAmbient(): void {
  if (IS_WEB) startAmbientWeb();
  else startAmbientNative();
}

function stopAmbient(): void {
  if (IS_WEB) stopAmbientWeb();
  else stopAmbientNative();
}

// ---------------------------------------------------------------------------
// Web: HTMLAudioElement dengan error handling lengkap
// ---------------------------------------------------------------------------
let webAudios: Partial<Record<SoundName, HTMLAudioElement>> = {};
let webInitPromise: Promise<void> | null = null;

/** Resolve URI asset yang valid untuk web (path absolut di bundle web). */
async function resolveWebUri(source: unknown): Promise<string | null> {
  try {
    let uri: string | null = null;
    if (typeof source === "string") {
      uri = source;
    } else {
      const asset = Asset.fromModule(source as number);
      await asset.downloadAsync();
      uri = asset.localUri ?? asset.uri ?? null;
    }
    if (!uri) return null;
    // Pastikan URL absolut (path relatif hasil require di web bisa gagal dimuat).
    if (/^https?:|^blob:|^data:/.test(uri)) return uri;
    if (typeof window !== "undefined" && typeof window.location?.href === "string") {
      return new URL(uri, window.location.href).toString();
    }
    return uri;
  } catch (err) {
    loggerWarn("Efek suara tidak tersedia (web)", err);
    return null;
  }
}

/** Siapkan semua efek suara web sekali (async, aman dipanggil berulang). */
function initWebSounds(): Promise<void> {
  bindWebAmbientGesture();
  if (!webInitPromise) {
    webInitPromise = (async () => {
      const entries = Object.keys(SOUND_SOURCES) as SoundName[];
      const results = await Promise.allSettled(
        entries.map(async (name) => {
          const uri = await resolveWebUri(SOUND_SOURCES[name]);
          if (!uri) return;
          const audio = new Audio(uri);
          audio.preload = "auto";
          audio.onerror = () => {
            // Jangan spam — suara hanya pemanis.
            loggerWarn(`Efek suara gagal dimuat (web): ${name}`);
          };
          webAudios[name] = audio;
        }),
      );
      for (const r of results) {
        if (r.status === "rejected") {
          loggerWarn("Gagal menyiapkan efek suara (web)", r.reason);
        }
      }
    })();
  }
  return webInitPromise;
}

function playWeb(name: SoundName): void {
  // Jaring pengaman: kalau play() dipanggil sebelum init selesai (user tap
  // sangat cepat), pastikan inisialisasi tetap berjalan — promise disimpan,
  // jadi tidak pernah dobel kerja.
  if (!webInitPromise) void initWebSounds();
  const audio = webAudios[name];
  if (!audio) return;
  try {
    audio.currentTime = 0;
    // Kepribadian suara tema aktif (rate & volume relatif).
    audio.playbackRate = currentRate;
    audio.volume = currentVolume;
    // Autoplay policy / source error → rejection. Ditangkap: jangan pernah
    // jadi unhandled rejection (ini akar 50 error log dari expo-audio web).
    audio.play().catch(() => {
      // abaikan — suara hanya pemanis, browser mungkin memblokir autoplay.
    });
  } catch {
    // abaikan
  }
}

// ---------------------------------------------------------------------------
// API publik
// ---------------------------------------------------------------------------

export function isSoundEnabled(): boolean {
  return enabled;
}

/**
 * Terapkan gaya audio tema aktif (dipanggil ThemeProvider saat tema berubah).
 * Nilai tidak valid diabaikan → kembali ke normal (rate 1, volume 1).
 */
export function setSoundTheme(spec?: { rate?: number; volume?: number } | null): void {
  const rate = typeof spec?.rate === "number" && spec.rate > 0 ? spec.rate : 1;
  const volume =
    typeof spec?.volume === "number" && spec.volume >= 0 && spec.volume <= 1 ? spec.volume : 1;
  currentRate = rate;
  currentVolume = volume;
}

/**
 * Ganti BACKSOUND tema aktif (dipanggil ThemeProvider saat tema aplikasi
 * berubah). `null`/`undefined` = hentikan backsound. Backsound ikut mati saat
 * user mematikan suara (setSoundEnabled(false)) dan menyala lagi saat dihidupkan.
 */
export function setAmbientSound(spec?: AmbientSoundSpec | null): void {
  ambientSpec = spec ?? null;
  if (enabled) applyAmbient();
  else stopAmbient();
}

/** Baca preferensi suara tersimpan (default: nyala). Panggil sekali di App. */
export async function loadSoundPrefs(): Promise<void> {
  try {
    const stored = await AsyncStorage.getItem(SOUND_KEY);
    if (stored !== null) enabled = stored === "true";
  } catch {
    // Abaikan — default nyala.
  }
}

export async function setSoundEnabled(value: boolean): Promise<void> {
  enabled = value;
  // Backsound ikut mati/nyala mengikuti toggle suara.
  if (value) applyAmbient();
  else stopAmbient();
  try {
    await AsyncStorage.setItem(SOUND_KEY, String(value));
  } catch {
    // Preferensi hanya lokal — gagal simpan tidak fatal.
  }
}

/**
 * Inisialisasi audio saat app start: biarkan suara berbunyi walau iPhone
 * dalam mode silent, muat preferensi, dan di web siapkan semua efek suara.
 * Aman dipanggil berkali-kali.
 */
export function initSound(): void {
  if (initStarted) return;
  initStarted = true;
  if (IS_WEB) {
    void initWebSounds();
    return;
  }
  try {
    void setAudioModeAsync({ playsInSilentMode: true }).catch(() => {});
  } catch {
    // Platform tanpa expo-audio — diabaikan.
  }
  void loadSoundPrefs();
}

function getNativePlayer(name: SoundName): AudioPlayer | null {
  if (nativePlayers === null) nativePlayers = {};
  const existing = nativePlayers[name];
  if (existing) return existing;
  try {
    const player = createAudioPlayer(SOUND_SOURCES[name] as any);
    player.volume = currentVolume;
    player.playbackRate = currentRate;
    nativePlayers[name] = player;
    return player;
  } catch (err) {
    loggerWarn("Gagal memuat efek suara", name, err);
    return null;
  }
}

/** Mainkan efek suara (no-op kalau dimatikan / platform tidak mendukung). */
export function play(name: SoundName): void {
  if (!enabled) return;
  if (IS_WEB) {
    playWeb(name);
    return;
  }
  const player = getNativePlayer(name);
  if (!player) return;
  try {
    // seekTo(0) + play = replay dari awal untuk bunyi beruntun cepat.
    player.seekTo(0);
    // Terapkan kepribadian suara tema aktif setiap play (murah & aman).
    if (player.playbackRate !== currentRate) player.playbackRate = currentRate;
    if (player.volume !== currentVolume) player.volume = currentVolume;
    player.play();
  } catch {
    // Abaikan error playback — suara hanya pemanis.
  }
}
