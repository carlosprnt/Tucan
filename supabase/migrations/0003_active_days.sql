-- Which weekdays a habit applies to, as a bitmask: bit0=Mon ... bit6=Sun.
-- 127 = all seven days (the previous behavior).
alter table public.habits
  add column if not exists active_days smallint not null default 127;
