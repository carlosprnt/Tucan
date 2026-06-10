-- The original `unique (habit_id, date)` counts soft-deleted rows too, which
-- breaks the offline-first toggle:
--
--   * Marking a day "not done" is a SOFT delete (deleted = true) — the row stays
--     in Postgres.
--   * Legend-State replays that tombstone by REMOVING the row from the local
--     store, so on re-check `findCompletion` no longer sees it and inserts a
--     fresh row.
--   * The soft-deleted row still occupies (habit_id, date) in Postgres, so the
--     insert fails with `duplicate key value violates unique constraint
--     "completions_habit_id_date_key"` — the re-check never persists.
--
-- Fix: uniqueness should apply only to ACTIVE (non-deleted) completions. This
-- lets soft-deleted tombstones accumulate while still guaranteeing at most one
-- "done" row per habit per local day.
alter table public.completions
  drop constraint if exists completions_habit_id_date_key;

create unique index if not exists completions_active_habit_date_key
  on public.completions (habit_id, date)
  where deleted = false;
