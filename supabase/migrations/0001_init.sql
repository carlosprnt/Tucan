-- Tucan initial schema: profiles, habits, completions.
-- Model: a completion is the PRESENCE of a (non-deleted) row. Binary done/not.
-- Soft-delete (`deleted`) + `updated_at` exist so the Legend-State Supabase sync
-- plugin can diff changes since last sync and replay tombstones.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  theme_pref text not null default 'auto' check (theme_pref in ('light', 'dark', 'auto')),
  reminder_enabled boolean not null default false,
  reminder_time time,
  is_premium boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted boolean not null default false
);

create table if not exists public.habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  description text,
  icon text,                              -- key into the monochrome icon set
  color text,                             -- null = monochrome (premium gate otherwise)
  start_date date not null,
  sort_order integer not null default 0,
  archived_at timestamptz,                -- soft "archive" (keeps history)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted boolean not null default false
);

create table if not exists public.completions (
  id uuid primary key default gen_random_uuid(),
  habit_id uuid not null references public.habits (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade, -- denormalized for RLS
  date date not null,                     -- LOCAL day (YYYY-MM-DD), never a timestamp
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted boolean not null default false,
  unique (habit_id, date)
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

create index if not exists habits_user_idx on public.habits (user_id);
create index if not exists completions_habit_date_idx on public.completions (habit_id, date);
create index if not exists completions_user_date_idx on public.completions (user_id, date);

-- ---------------------------------------------------------------------------
-- updated_at / created_at maintenance (server is the source of truth on times)
-- ---------------------------------------------------------------------------

create or replace function public.handle_times()
returns trigger
language plpgsql
as $$
begin
  if (tg_op = 'INSERT') then
    new.created_at := coalesce(new.created_at, now());
    new.updated_at := now();
  else
    new.created_at := old.created_at;
    new.updated_at := now();
  end if;
  return new;
end;
$$;

create trigger handle_times_profiles
  before insert or update on public.profiles
  for each row execute function public.handle_times();

create trigger handle_times_habits
  before insert or update on public.habits
  for each row execute function public.handle_times();

create trigger handle_times_completions
  before insert or update on public.completions
  for each row execute function public.handle_times();

-- ---------------------------------------------------------------------------
-- Profile on signup (server-side, cannot be skipped by the client)
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, new.raw_user_meta_data ->> 'full_name')
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Row Level Security: every row is scoped to its owner.
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.habits enable row level security;
alter table public.completions enable row level security;

-- profiles (owner = id)
create policy profiles_select_own on public.profiles
  for select to authenticated using ((select auth.uid()) = id);
create policy profiles_insert_own on public.profiles
  for insert to authenticated with check ((select auth.uid()) = id);
create policy profiles_update_own on public.profiles
  for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

-- habits (owner = user_id)
create policy habits_select_own on public.habits
  for select to authenticated using ((select auth.uid()) = user_id);
create policy habits_insert_own on public.habits
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy habits_update_own on public.habits
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy habits_delete_own on public.habits
  for delete to authenticated using ((select auth.uid()) = user_id);

-- completions (owner = user_id)
create policy completions_select_own on public.completions
  for select to authenticated using ((select auth.uid()) = user_id);
create policy completions_insert_own on public.completions
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy completions_update_own on public.completions
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy completions_delete_own on public.completions
  for delete to authenticated using ((select auth.uid()) = user_id);
