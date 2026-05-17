-- 006_puzzle_attempts_unique.sql
-- Adds a UNIQUE constraint on (user_id, puzzle_id) to support
-- the upsert pattern in /api/puzzles/attempt.
-- The DO block keeps this migration safe if the constraint already exists.

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'puzzle_attempts_user_puzzle_unique'
      and conrelid = 'public.puzzle_attempts'::regclass
  ) then
    alter table public.puzzle_attempts
      add constraint puzzle_attempts_user_puzzle_unique unique (user_id, puzzle_id);
  end if;
end
$$;
