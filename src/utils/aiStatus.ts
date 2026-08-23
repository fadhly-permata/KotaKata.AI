import { useCallback, useEffect, useRef, useState } from "react";
import type { AiStreamCallback } from "./aiProvider";

/**
 * Status AI yang bermakna untuk manusia (revisi urgent).
 *
 * Dua bagian:
 * 1. `aiPhaseLabel` — pesan ramah per fase (untuk header status singkat).
 * 2. `useAiThinking` — hook streaming ala aplikasi chat AI: teks berpikir
 *    model diakumulasi UTUH (bukan potongan acak), dirapikan whitespace-nya,
 *    lalu tampil mengalir mengikuti keadaan model secara real-time.
 */

export type AiPhase = "" | "thinking" | "writing";

export function aiPhaseLabel(phase: AiPhase, elapsedSec: number): string {
  if (phase === "writing") return "✍️ AI sedang menulis jawaban…";
  if (phase === "thinking") {
    if (elapsedSec < 8) return "💭 AI membaca soal dan petunjuknya…";
    if (elapsedSec < 20) return "💭 AI menganalisis kata & clue…";
    if (elapsedSec < 40) return "💭 AI menyusun beberapa kemungkinan jawaban…";
    return "💭 AI masih berpikir keras — model reasoning memang butuh waktu…";
  }
  return "";
}

/**
 * Hook streaming thinking ala aplikasi chat AI.
 * - Mengumpulkan seluruh teks reasoning secara berurutan (konteks utuh,
 *   kalimat mengalir — tidak lagi terpotong acak di tengah kata).
 * - Update UI di-throttle ~120ms agar hemat render tetap terasa live.
 * - `tail(n)` mengambil potongan akhir pada batas SPASI sehingga kalimat
 *   yang tampil selalu utuh terbaca.
 */
export function useAiThinking(): {
  text: string;
  phase: AiPhase;
  elapsed: number;
  tail: (maxChars: number) => string;
  onDelta: AiStreamCallback;
  reset: () => void;
} {
  const [text, setText] = useState("");
  const [phase, setPhase] = useState<AiPhase>("");
  const [elapsed, setElapsed] = useState(0);
  const bufRef = useRef("");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleFlush = () => {
    if (timerRef.current) return;
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      // Rapikan whitespace agar kalimat mengalir natural seperti di aplikasi chat.
      setText(bufRef.current.replace(/\s+/g, " ").trim());
    }, 120);
  };

  const onDelta = useCallback<AiStreamCallback>((chunk) => {
    if (chunk.thinking) {
      setPhase("thinking");
      bufRef.current += chunk.text;
      scheduleFlush();
    } else {
      setPhase("writing");
    }
  }, []);

  const reset = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    bufRef.current = "";
    setText("");
    setPhase("");
    setElapsed(0);
  }, []);

  // Timer detik berjalan selama AI aktif — user tahu proses masih hidup.
  useEffect(() => {
    if (!phase) {
      setElapsed(0);
      return;
    }
    const iv = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(iv);
  }, [phase]);

  const tail = useCallback(
    (maxChars: number) => {
      const t = text;
      if (t.length <= maxChars) return t;
      const cut = t.slice(-maxChars);
      const spaceIdx = cut.indexOf(" ");
      // Mulai dari batas spasi supaya kalimat pertama yang tampil utuh.
      return "…" + (spaceIdx > 0 ? cut.slice(spaceIdx + 1) : cut);
    },
    [text],
  );

  return { text, phase, elapsed, tail, onDelta, reset };
}
