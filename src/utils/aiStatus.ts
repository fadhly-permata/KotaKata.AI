/**
 * Label status AI yang BERMakNA untuk manusia (revisi urgent).
 * Teks reasoning mentah dari model (reasoning_content) adalah monolog internal
 * yang kacau & tidak layak ditampilkan ke user — jadi kita hanya pakai sinyal
 * fase-nya (thinking/writing) lalu menampilkan pesana ramah + durasi berjalan,
 * supaya aplikasi tidak terasa stuck saat model reasoning memproses 80–160 dtk.
 */

export type AiPhase = "" | "thinking" | "writing";

export function aiPhaseLabel(phase: AiPhase, elapsedSec: number): string {
  if (phase === "writing") return "✍️ AI sedang menulis jawaban…";
  if (phase === "thinking") {
    if (elapsedSec < 8) return "💭 AI membaca soal dan petunjuknya…";
    if (elapsedSec < 20) return "💭 AI menganalisis kata & clue…";
    if (elapsedSec < 40) return "💭 AI menyusun beberapa kemungkinan jawaban…";
    return "💭 AI masih berpikir keras — model reasoning memang butuh waktu, mohon tunggu…";
  }
  return "";
}
