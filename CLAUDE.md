@AGENTS.md

# Tucan

Minimalist, monochrome habit tracker for iOS. Binary habits (done / not done),
with a dot grid as the hero element. Offline-first: marking a habit is instant
and syncs to Supabase in the background.

## Stack

- **Expo SDK 56** (RN 0.85, React 19.2, New Architecture). Routes via **Expo Router** (file-based, `src/app/`).
- **Supabase** (Postgres + Auth + RLS). Auth gate: Google + Apple via native id-token (`signInWithIdToken`). Apple is behind `EXPO_PUBLIC_ENABLE_APPLE_AUTH` until its Supabase provider is configured; default builds ship Google-only.
- **Legend-State v3** (beta) + `@legendapp/state/sync-plugins/supabase` for the offline-first store.
- **MMKV v4** (`createMMKV`) — native key/value store: Supabase session + Legend-State persistence + (later) widget App Group cache.
- **Unistyles 3** for theming (monochrome light/dark tokens; babel plugin in `babel.config.js`).

## Layout

- `src/app/` — routes only.
- `src/lib/` — `supabase.ts` (MMKV-backed session), `mmkv.ts`, `date.ts` (local-day `YYYY-MM-DD` helpers).
- `src/theme/` — `themes.ts` tokens, `unistyles.ts` config (imported once at top of `src/app/_layout.tsx`).
- `src/store/` — Legend-State observables + sync (built in the data-layer step).
- `src/types/database.ts` — hand-authored to match the schema; regenerate from Supabase when the project exists.
- `supabase/migrations/` — schema, RLS, triggers (`0001_init.sql`).

## Key rules

- A completion = **presence of a non-deleted row**. `date` is the **local** calendar day, never a UTC timestamp.
- Soft-delete (`deleted`) + `updated_at` on all tables so the sync plugin can diff/replay.
- Total = count of completions (no streaks). `%` = done / (today − start_date + 1).
- RLS on all tables (`auth.uid()`). Color is the only premium gate in v1.

## Design principles

- **Hierarchy comes from size and weight, never color.** Numerals (date, total) dominate.
- **One functional accent (red).** It means: today, attention, destructive. Never decoration, never routine buttons (e.g. Save is monochrome).
- **The diamond dot grid is the hero** on every data surface (cards, detail, overview) — ideally on auth and empty states too.
- **Every data screen has four designed states:** loading (skeleton, gated on `isStoreHydrated()`), empty (title + body + CTA), populated, error.
- **Dotted separators** over solid hairlines. Generous spacing. **Tactile:** meaningful state changes fire a haptic (`@/lib/haptics`).
- Glyph is the 4-point diamond (`@/lib/glyph`), drawn via `react-native-svg` (whole grids in one `<Svg>`).

## Voice (copy)

- Plain, warm, second person. Short. Verbs over nouns.
- Never leak implementation words to users: no "notification fires", "soft-delete"/"hide", "row", "sync", or raw error messages. Log errors; show a friendly line.
- Empty states motivate and point at the next action. Errors are recoverable.

## Commands

```bash
EXPO_OFFLINE=1 npx tsc --noEmit     # typecheck (network to Expo API is blocked here; offline flag required)
EXPO_OFFLINE=1 npx expo lint        # lint
EXPO_OFFLINE=1 npx expo export --platform ios --output-dir /tmp/x   # validate Metro bundle headlessly
```

## Constraints

- Env vars: `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY` (see `.env.example`).
- Native modules (MMKV, Unistyles, Google/Apple auth, widgets) require a **custom dev build** — Expo Go won't run them. iOS builds happen on the user's machine or EAS (no macOS in this environment).
