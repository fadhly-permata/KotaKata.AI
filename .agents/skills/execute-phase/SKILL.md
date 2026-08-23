---
name: execute-phase
description: Eksekusi fase pengembangan berikutnya secara otomatis dari .agents/checkpoint.json — deteksi fase pertama berstatus "not_started", kerjakan semua tugasnya, lalu update checkpoint.json (status fase selesai, current_phase naik, timestamp) dan commit. Gunakan skill ini setiap kali user meminta "lanjut phase", "execute phase", "kerjakan fase berikutnya", atau "lanjutkan checkpoint".
---

# KotaKata.AI — Execute Next Phase (Auto-Detect)

## How to use this skill
1. Read `.agents/checkpoint.json`
2. Find the first phase with `"status": "not_started"`
3. If `current_phase` is < that phase number, update it
4. Execute all tasks listed in that phase
5. After completing → update `checkpoint.json`:
   - Set phase `"status": "completed"`
   - Set `"current_phase"` to next phase number
   - Update `"updated_at"` timestamp
6. Commit & push changes
7. Tell user "Phase X selesai. Siap lanjut Phase Y?"

## Auto-Update Mandate
> **Kamu WAJIB mengupdate `checkpoint.json` SETIAP KALI selesai mengerjakan tugas.**
> Jangan pernah melewatkan ini — user mengandalkan file ini untuk tahu progres.
> Update field: `phases[].status`, `current_phase`, `updated_at`.
