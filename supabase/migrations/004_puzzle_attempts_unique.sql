-- 004_puzzle_attempts_unique.sql
-- Adds a UNIQUE constraint on (user_id, puzzle_id) to support
-- the upsert pattern in /api/puzzles/attempt.
-- Without this constraint, onConflict upserts silently fail.

alter table public.puzzle_attempts
  add constraint puzzle_attempts_user_puzzle_unique unique (user_id, puzzle_id);
