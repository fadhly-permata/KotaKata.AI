import AsyncStorage from "@react-native-async-storage/async-storage";
import { createAudioPlayer, setAudioModeAsync } from "expo-audio";
import type { AudioPlayer } from "expo-audio";
import { loggerWarn } from "./logger";

/**
 * Efek suara game — wrapper tipis di atas expo-audio.
 *
 * - Player dibuat LAZY (baru saat suara pertama kali dimainkan), satu per
 *   suara, lalu dipakai ulang dengan seekTo(0) + play() supaya bisa dibunyikan
 *   beruntun cepat (mis. mengetik huruf).
 * - Preferensi hidup/mati disimpan di AsyncStorage ("kotakata.soundEnabled")
 *   dan dibaca sekali saat app start lewat loadSoundPrefs()/initSound().
 * - Semua akses native dibungkus try/catch — kalau platform tidak mendukung
 *   (mis. test/script Node), efek suara tidak pernah merusak aplikasi.
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

let enabled = true;
let players: Partial<Record<SoundName, AudioPlayer>> | null = null;
let initStarted = false;

export function isSoundEnabled(): boolean {
  return enabled;
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
  try {
    await AsyncStorage.setItem(SOUND_KEY, String(value));
  } catch {
    // Preferensi hanya lokal — gagal simpan tidak fatal.
  }
}

/**
 * Inisialisasi audio saat app start: biarkan suara berbunyi walau iPhone
 * dalam mode silent, lalu muat preferensi. Aman dipanggil berkali-kali.
 */
export function initSound(): void {
  if (initStarted) return;
  initStarted = true;
  try {
    void setAudioModeAsync({ playsInSilentMode: true }).catch(() => {});
  } catch {
    // Platform tanpa expo-audio — diabaikan.
  }
  void loadSoundPrefs();
}

function getPlayer(name: SoundName): AudioPlayer | null {
  if (players === null) players = {};
  const existing = players[name];
  if (existing) return existing;
  try {
    const player = createAudioPlayer(SOUND_SOURCES[name] as any);
    player.volume = 1;
    players[name] = player;
    return player;
  } catch (err) {
    loggerWarn("Gagal memuat efek suara", name, err);
    return null;
  }
}

/** Mainkan efek suara (no-op kalau dimatikan / platform tidak mendukung). */
export function play(name: SoundName): void {
  if (!enabled) return;
  const player = getPlayer(name);
  if (!player) return;
  try {
    // seekTo(0) + play = replay dari awal untuk bunyi beruntun cepat.
    player.seekTo(0);
    player.play();
  } catch {
    // Abaikan error playback — suara hanya pemanis.
  }
}
