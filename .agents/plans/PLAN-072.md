# PLAN-072: Sync Worktree Rules

## Status: DONE ✅

## Masalah
Freebuff preview server jalan dari worktree (`/home/daytona/worktrees/th7bsf1qw672k88b278frrjgzx8cvg0n/`), 
BUKAN dari `/home/daytona/codebase/`. Semua file edits di codebase perlu di-sync ke worktree.

## Aturan
- Setelah edit file di `/home/daytona/codebase/`, WAJIB copy ke worktree:
  `cp <file> /home/daytona/worktrees/th7bsf1qw672k88b278frrjgzx8cvg0n/<file>`
- Worktree path bisa berubah — cek dengan: `ps aux | grep "expo start" | grep -v grep`
- Jangan asumsi file sudah sync — selalu verify dengan diff
