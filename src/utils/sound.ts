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
 * - BACKSOUND (setAmbientSound): loop halus dari URL MP3 online, mengikuti tema
 *   aplikasi aktif (lihat AmbientSoundSpec di themeData.ts). Supaya perulangan
 *   tidak terasa "putus" (PLAN-029), loop memakai CROSSFADE dua slot: satu slot
 *   memutar, lalu ~2 detik sebelum habis slot kedua mulai dari awal dengan
 *   volume naik sementara slot pertama turun — perpindahan tidak terdengar.
 *   Properti `loop` tetap diset sebagai jaring pengaman kalau metadata durasi
 *   belum tersedia (perilaku lama), bukan sumber utama kelancaran.
 * - Di web, browser memblokir autoplay sebelum ada interaksi user — kalau
 *   keblokir, diputar otomatis saat gestur pertama (pointer/keyboard/touch) dan
 *   juga dicoba lagi saat layar game mendapat fokus (ensureAmbientPlaying).
 * - Preferensi hidup/mati disimpan di AsyncStorage ("kotakata.soundEnabled");
 *   saat dimatikan, backsound ikut di-pause.
 * - BACKSOUND punya toggle sendiri ("kotakata.ambientEnabled") di halaman
 *   Pengaturan — terpisah dari efek suara. Backsound hanya diputar kalau
 *   keduanya nyala.
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
const AMBIENT_KEY = "kotakata.ambientEnabled";

const IS_WEB = Platform.OS === "web";

let enabled = true;
/** Toggle backsound tema — terpisah dari efek suara (default: nyala). */
let ambientEnabled = true;
let nativePlayers: Partial<Record<SoundName, AudioPlayer>> | null = null;
let initStarted = false;

// Preferensi (efek suara & backsound) dibaca ASYNC dari AsyncStorage saat
// start. Backsound pertama kali ditunda sampai preferensi terbaca
// (whenSoundPrefsReady), supaya setting tersimpan (mis. suara MATI) diterapkan
// tepat waktu — tanpa ini ada race: backsound sempat berbunyi walau user sudah
// mematikan suara di sesi sebelumnya.
let prefsResolve: () => void = () => {};
const prefsLoadedPromise: Promise<void> = new Promise((r) => {
  prefsResolve = r;
});
let soundPrefsReady = false;
let ambientPrefsReady = false;

function maybeResolvePrefs(): void {
  if (soundPrefsReady && ambientPrefsReady) prefsResolve();
}

/** Selesai saat preferensi suara & backsound sudah dibaca dari storage. */
export function whenSoundPrefsReady(): Promise<void> {
  return prefsLoadedPromise;
}

// Kepribadian audio tema aktif (lihat SoundSpec di themeData.ts):
// rate <1 lebih pelan/lembut, >1 lebih cepat/ceria; volume relatif 0–1.
let currentRate = 1;
let currentVolume = 1;

// ---------------------------------------------------------------------------
// Backsound tema (ambient) — crossfade loop, dua slot, satu sumber aktif.
// ---------------------------------------------------------------------------
let ambientSpec: AmbientSoundSpec | null = null;
/** URL yang sedang dimuat di slot (untuk deteksi ganti sumber). */
let ambientLoadedUrl: string | null = null;
/** Web: backsound siap tapi autoplay diblokir browser → tunggu gestur user. */
let ambientPendingWeb = false;
let ambientGestureBound = false;
/** Backsound sedang terdengar (bukan pause/blokir). */
let ambientAudible = false;
/** Crossfade sedang berjalan (slot kedua fade-in, slot pertama fade-out). */
let ambientFading = false;
let crossfadeStartMs = 0;
let ambientTick: ReturnType<typeof setInterval> | null = null;

/** Lama crossfade loop (detik) — cukup pendek agar perpindahan tidak terasa. */
const AMBIENT_FADE_SECONDS = 2.0;
/** Frekuensi pengecekan posisi playback (ms). */
const AMBIENT_TICK_MS = 250;

/** Abstraksi satu slot audio backsound (web: HTMLAudioElement, native: expo-audio). */
interface AmbientSlot {
  play(): void;
  pause(): void;
  seekTo(sec: number): void;
  setVolume(v: number): void;
  /** Posisi playback saat ini (detik; NaN bila belum tersedia). */
  getCurrentTime(): number;
  /** Durasi sumber (detik; NaN bila belum tersedia). */
  getDuration(): number;
  dispose(): void;
}

function clamp01(v: number): number {
  if (Number.isFinite(v)) return Math.min(1, Math.max(0, v));
  return 0.3;
}

function makeWebSlot(url: string): AmbientSlot {
  const audio = new Audio();
  audio.src = url;
  audio.load();
  audio.loop = true; // jaring pengaman — crossfade yang utama
  return {
    play: () => {
      const p = audio.play();
      if (p && typeof p.then === "function") {
        p.then(() => {
          ambientPendingWeb = false;
          ambientAudible = true;
          emitAmbientStatus();
        }).catch(() => {
          // Autoplay policy (belum ada interaksi user) → tunggu gestur pertama.
          if (!ambientAudible) {
            ambientPendingWeb = true;
            emitAmbientStatus();
          }
        });
      } else {
        ambientPendingWeb = false;
        ambientAudible = true;
        emitAmbientStatus();
      }
    },
    pause: () => audio.pause(),
    seekTo: (sec) => {
      try {
        audio.currentTime = sec;
      } catch {
        // abaikan
      }
    },
    setVolume: (v) => {
      try {
        audio.volume = clamp01(v);
      } catch {
        // abaikan
      }
    },
    getCurrentTime: () => (Number.isFinite(audio.currentTime) ? audio.currentTime : NaN),
    getDuration: () => (Number.isFinite(audio.duration) ? audio.duration : NaN),
    dispose: () => {
      try {
        audio.pause();
        audio.removeAttribute("src");
        audio.load();
      } catch {
        // abaikan
      }
    },
  };
}

function makeNativeSlot(url: string): AmbientSlot {
  let player: AudioPlayer | null = null;
  try {
    player = createAudioPlayer({ uri: url });
    player.loop = true; // jaring pengaman — crossfade yang utama
  } catch {
    player = null;
  }
  return {
    play: () => {
      try {
        player?.play();
        ambientPendingWeb = false;
        ambientAudible = true;
      } catch {
        // abaikan — backsound hanya pemanis
      }
    },
    pause: () => {
      try {
        player?.pause();
      } catch {
        // abaikan
      }
    },
    seekTo: (sec) => {
      try {
        player?.seekTo(sec).catch(() => {});
      } catch {
        // abaikan
      }
    },
    setVolume: (v) => {
      try {
        if (player) player.volume = clamp01(v);
      } catch {
        // abaikan
      }
    },
    getCurrentTime: () => {
      try {
        return player ? player.currentTime : NaN;
      } catch {
        return NaN;
      }
    },
    getDuration: () => {
      try {
        return player ? player.duration : NaN;
      } catch {
        return NaN;
      }
    },
    dispose: () => {
      try {
        player?.pause();
        player?.remove();
      } catch {
        // abaikan
      }
      player = null;
    },
  };
}

let ambientSlots: [AmbientSlot | null, AmbientSlot | null] = [null, null];
/** Slot yang sedang terdengar (0 atau 1). */
let ambientActiveIndex = 0;

function ambientVolume(): number {
  return clamp01(ambientSpec?.volume ?? 0.3);
}

/** Buat ulang kedua slot untuk URL saat ini (dipanggil saat ganti tema). */
function rebuildAmbientSlots(): void {
  for (const slot of ambientSlots) slot?.dispose();
  ambientSlots = [null, null];
  ambientFading = false;
  ambientActiveIndex = 0;
  if (!ambientSpec) return;
  ambientLoadedUrl = ambientSpec.url;
  ambientSlots = [makeSlot(ambientSpec.url), makeSlot(ambientSpec.url)];
}

function makeSlot(url: string): AmbientSlot {
  return IS_WEB ? makeWebSlot(url) : makeNativeSlot(url);
}

function startAmbientTick(): void {
  if (ambientTick) return;
  ambientTick = setInterval(() => {
    try {
      tickAmbient();
    } catch {
      // jangan biarkan error timer merusak aplikasi
    }
  }, AMBIENT_TICK_MS);
}

function stopAmbientTick(): void {
  if (ambientTick) {
    clearInterval(ambientTick);
    ambientTick = null;
  }
}

/** Volume target slot saat crossfade selesai (0 = senyap). */
function slotVolume(index: number): number {
  return index === ambientActiveIndex ? ambientVolume() : 0;
}

/** Posisi slot aktif: [currentTime, duration]. */
function activePosition(): [number, number] {
  const slot = ambientSlots[ambientActiveIndex];
  if (!slot) return [NaN, NaN];
  return [slot.getCurrentTime(), slot.getDuration()];
}

function beginCrossfade(): void {
  const active = ambientSlots[ambientActiveIndex];
  if (!active || ambientFading) return;
  const incomingIndex = (ambientActiveIndex + 1) % 2;
  if (!ambientSlots[incomingIndex]) {
    if (ambientLoadedUrl) ambientSlots[incomingIndex] = makeSlot(ambientLoadedUrl);
  }
  const incoming = ambientSlots[incomingIndex];
  if (!incoming) return;
  ambientFading = true;
  crossfadeStartMs = Date.now();
  // Slot kedua mulai dari awal, volume 0, lalu naik selama fade.
  incoming.seekTo(0);
  incoming.setVolume(0);
  incoming.play();
}

/**
 * Tick berkala backsound: (1) jalankan ramp crossfade yang sedang berjalan,
 * (2) deteksi mendekati akhir durasi → mulai crossfade ke slot lain supaya
 * perulangan tidak terdengar putus (PLAN-029).
 */
function tickAmbient(): void {
  if (!enabled || !ambientEnabled || !ambientSpec) return;
  const volume = ambientVolume();
  const active = ambientSlots[ambientActiveIndex];
  const incomingIndex = (ambientActiveIndex + 1) % 2;
  const incoming = ambientSlots[incomingIndex];
  if (!active) return;

  if (ambientFading && incoming) {
    const p = Math.min(1, (Date.now() - crossfadeStartMs) / (AMBIENT_FADE_SECONDS * 1000));
    active.setVolume(volume * (1 - p));
    incoming.setVolume(volume * p);
    if (p >= 1) {
      // Selesai: slot lama berhenti & kembali ke awal, slot baru jadi aktif.
      active.pause();
      active.seekTo(0);
      active.setVolume(0);
      ambientActiveIndex = incomingIndex;
      ambientFading = false;
    }
    return;
  }

  // Tidak sedang fade — cek apakah sudah mendekati akhir durasi.
  const [cur, dur] = activePosition();
  if (!Number.isFinite(cur) || !Number.isFinite(dur) || dur <= 0) return; // metadata belum siap
  if (ambientLoadedUrl && ambientSlots[incomingIndex] === null) {
    ambientSlots[incomingIndex] = makeSlot(ambientLoadedUrl);
  }
  // Fade tidak boleh lebih dari ~20% durasi (aman untuk loop pendek).
  const fade = Math.min(AMBIENT_FADE_SECONDS, dur * 0.2);
  if (fade > 0.2 && dur - cur <= fade) {
    beginCrossfade();
  }
}

function startAmbient(): void {
  if (!enabled || !ambientEnabled || !ambientSpec) {
    stopAmbient();
    return;
  }
  try {
    if (ambientLoadedUrl !== ambientSpec.url) rebuildAmbientSlots();
    if (!ambientSlots[0]) rebuildAmbientSlots();
    const active = ambientSlots[ambientActiveIndex];
    if (!active) return;
    active.setVolume(ambientVolume());
    active.play();
    startAmbientTick();
    if (IS_WEB) bindWebAmbientGesture();
  } catch (err) {
    loggerWarn("Backsound tema gagal diputar", err);
  }
}

function stopAmbient(): void {
  ambientPendingWeb = false;
  ambientAudible = false;
  ambientFading = false;
  stopAmbientTick();
  for (const slot of ambientSlots) slot?.pause();
  emitAmbientStatus();
}

/** Web: coba mulai lagi backsound yang diblokir autoplay saat user berinteraksi. */
function retryAmbientOnGesture(): void {
  if (IS_WEB && enabled && ambientEnabled && ambientSpec && !ambientAudible) {
    startAmbient();
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
  startAmbient();
}

// ---------------------------------------------------------------------------
// Status backsound (web) — dipakai hint "ketuk layar untuk memutar suara latar"
// ---------------------------------------------------------------------------
/** Listener status: `true` = autoplay diblokir browser, menunggu gestur user. */
export type AmbientStatusListener = (blocked: boolean) => void;
const ambientStatusListeners = new Set<AmbientStatusListener>();

function isAmbientBlocked(): boolean {
  return IS_WEB && ambientPendingWeb && enabled && ambientEnabled && !!ambientSpec;
}

function emitAmbientStatus(): void {
  const blocked = isAmbientBlocked();
  for (const l of ambientStatusListeners) l(blocked);
}

/**
 * Berlangganan status backsound (web: diblokir autoplay atau tidak).
 * Listener langsung dipanggil dengan status saat ini. Kembalikan fungsi untuk
 * berhenti berlangganan.
 */
export function subscribeAmbientStatus(listener: AmbientStatusListener): () => void {
  ambientStatusListeners.add(listener);
  listener(isAmbientBlocked());
  return () => {
    ambientStatusListeners.delete(listener);
  };
}

/**
 * Pastikan backsound sedang diputar (PLAN-028): dipanggil saat layar game
 * mendapat fokus. Di web, masuk ke layar game terjadi dalam konteks gestur
 * user (ketukan tombol), jadi peluang autoplay disetujui browser lebih besar —
 * kalau sebelumnya diblokir, ini mencoba lagi.
 */
export function ensureAmbientPlaying(): void {
  if (enabled && ambientEnabled && ambientSpec && !ambientAudible) {
    startAmbient();
  }
}

// ---------------------------------------------------------------------------
// Web: HTMLAudioElement dengan error handling lengkap
// ---------------------------------------------------------------------------
let webAudios: Partial<Record<SoundName, HTMLAudioElement>> = {};
let webInitPromise: Promise<void> | null = null;
/** Efek yang diminta sebelum inisialisasi selesai — diputar ulang begitu siap. */
let webPendingPlays = new Set<SoundName>();

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
    loggerWarn("Gagal resolve URI asset suara (web)", err);
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
      // Efek yang sempat diminta saat init belum selesai (user tap sangat
      // cepat di awal) — putar ulang sekali sekarang supaya tidak "hilang".
      const pending = [...webPendingPlays];
      webPendingPlays = new Set();
      for (const name of pending) playWeb(name);
    })();
  }
  return webInitPromise;
}

function playWeb(name: SoundName): void {
  // Jaring pengaman: kalau play() dipanggil sebelum init selesai (user tap
  // sangat cepat), catat dulu — diputar ulang setelah init selesai — dan
  // pastikan inisialisasi tetap berjalan (promise disimpan, tidak dobel kerja).
  if (!webInitPromise) void initWebSounds();
  const audio = webAudios[name];
  if (!audio) {
    if (webInitPromise) webPendingPlays.add(name);
    return;
  }
  try {
    audio.currentTime = 0;
    // Kepribadian suara tema aktif (rate & volume relatif). Playback rate
    // diset terpisah: di sebagian browser, set sebelum media siap bisa
    // melempar — play() harus tetap dicoba apa pun yang terjadi.
    audio.volume = currentVolume;
    try {
      audio.playbackRate = currentRate;
    } catch {
      // non-fatal — rate tetap normal
    }
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
 * berubah). `null`/`undefined` = hentikan backsound. Backsound hanya diputar
 * kalau efek suara (setSoundEnabled) DAN toggle backsound (setAmbientEnabled)
 * sama-sama nyala.
 */
export function setAmbientSound(spec?: AmbientSoundSpec | null): void {
  ambientSpec = spec ?? null;
  if (enabled && ambientEnabled && ambientSpec) applyAmbient();
  else stopAmbient();
}

/** Baca preferensi suara tersimpan (default: nyala). Panggil sekali di App. */
export async function loadSoundPrefs(): Promise<void> {
  try {
    const stored = await AsyncStorage.getItem(SOUND_KEY);
    if (stored !== null) enabled = stored === "true";
  } catch (err) {
    loggerWarn("Gagal membaca preferensi suara dari storage", err);
  } finally {
    soundPrefsReady = true;
    maybeResolvePrefs();
  }
}

export async function setSoundEnabled(value: boolean): Promise<void> {
  enabled = value;
  // Backsound ikut mati/nyala mengikuti toggle suara (dan toggle backsound).
  if (value && ambientEnabled) applyAmbient();
  else stopAmbient();
  try {
    await AsyncStorage.setItem(SOUND_KEY, String(value));
  } catch (err) {
    loggerWarn("Gagal menyimpan preferensi suara", err);
  }
}

/** Apakah toggle backsound tema sedang nyala (default: true). */
export function isAmbientEnabled(): boolean {
  return ambientEnabled;
}

/** Baca preferensi backsound tersimpan (default: nyala). */
export async function loadAmbientPrefs(): Promise<void> {
  try {
    const stored = await AsyncStorage.getItem(AMBIENT_KEY);
    if (stored !== null) ambientEnabled = stored === "true";
  } catch (err) {
    loggerWarn("Gagal membaca preferensi backsound dari storage", err);
  } finally {
    ambientPrefsReady = true;
    maybeResolvePrefs();
  }
}

/**
 * Switch backsound tema di halaman Pengaturan — terpisah dari efek suara.
 * Mati → backsound langsung berhenti; nyala → backsound tema aktif diputar
 * lagi (selama efek suara juga nyala).
 */
export async function setAmbientEnabled(value: boolean): Promise<void> {
  ambientEnabled = value;
  if (value && enabled) applyAmbient();
  else stopAmbient();
  try {
    await AsyncStorage.setItem(AMBIENT_KEY, String(value));
  } catch (err) {
    loggerWarn("Gagal menyimpan preferensi backsound", err);
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
    // Web juga memuat preferensi tersimpan (efek suara & backsound).
    void loadSoundPrefs();
    void loadAmbientPrefs();
    return;
  }
  try {
    void setAudioModeAsync({ playsInSilentMode: true }).catch(() => {});
  } catch {
    // Platform tanpa expo-audio — diabaikan.
  }
  void loadSoundPrefs();
  void loadAmbientPrefs();
}

function getNativePlayer(name: SoundName): AudioPlayer | null {
  if (nativePlayers === null) nativePlayers = {};
  const existing = nativePlayers[name];
  if (existing) return existing;
  try {
    const player = createAudioPlayer(SOUND_SOURCES[name] as any);
    player.volume = currentVolume;
    try {
      player.playbackRate = currentRate;
    } catch {
      // playbackRate readonly di beberapa device (getter-only)
    }
    nativePlayers[name] = player;
    return player;
  } catch (err) {
    loggerWarn("Gagal membuat player native", name, err);
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
    try {
      if (player.playbackRate !== currentRate) player.playbackRate = currentRate;
    } catch {
      // playbackRate readonly di beberapa device
    }
    if (player.volume !== currentVolume) player.volume = currentVolume;
    player.play();
  } catch {
    // Abaikan error playback — suara hanya pemanis.
  }
}
