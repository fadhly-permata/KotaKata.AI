# PLAN-088 — B.AI deepseek-v4-flash: reasoning model butuh max_completion_tokens

## Status
DONE

## Deskripsi (laporan pemilik + verifikasi langsung via curl)
Provider B.AI dengan model deepseek-v4-flash: requestAIRevision mengembalikan
"Respons AI tidak valid: tidak ada JSON."

## Akar masalah (terverifikasi via curl langsung ke API)
deepseek-v4-flash adalah **reasoning model** — punya `reasoning_content` +
`reasoning_tokens`. Tanpa `max_completion_tokens`, token reasoning menghabiskan
SELURUH budget → `content` kosong, `finish_reason: "length"`.

Contoh nyata:
- `max_tokens: 10` → reasoning_tokens: 10, content: ""
- `max_tokens: 500` → reasoning_tokens: 500, content: ""
- `max_completion_tokens: 4800` → reasoning_tokens: 3771, content: JSON valid ✅

## Perbaikan
- Deteksi `deepseek-v4-flash` / `deepseek-r1` sebagai reasoning model di regex
  `isReasoningStyle` (bergabung dengan `gpt-5*` / `o1/3/4`).
- Request dikirim dengan `max_completion_tokens` (bukan `max_tokens`) +
  multiplier ×8 (600 → 4800) sehingga reasoning token tidak menghabiskan
  seluruh budget.
- Test unit diperbarui: deepseek-v4-flash di bai wajib pakai
  `max_completion_tokens` (76 pass).
- Verifikasi langsung ke API: curl dengan `max_completion_tokens: 4800`
  mengembalikan JSON valid + `finish_reason: "stop"`.
