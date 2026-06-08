-- Per-habit reminders: opt-in toggle + the local time of day to nudge.
-- reminder_time is a LOCAL wall-clock time (HH:MM:SS), scheduled on the
-- device against the habit's active_days.
alter table public.habits
  add column if not exists reminder_enabled boolean not null default false;

alter table public.habits
  add column if not exists reminder_time time;
