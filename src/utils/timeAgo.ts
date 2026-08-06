/**
 * Format selisih waktu menjadi teks singkat ("baru saja", "5 menit lalu", dst).
 * Menerima ISO string atau epoch ms.
 */
export function timeAgo(input: string | number): string {
  const time = typeof input === "string" ? new Date(input).getTime() : input;
  if (Number.isNaN(time)) return "—";
  const diff = Date.now() - time;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "baru saja";
  if (mins < 60) return `${mins} menit lalu`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} jam lalu`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} hari lalu`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks} minggu lalu`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} bulan lalu`;
  return `${Math.floor(months / 12)} tahun lalu`;
}
