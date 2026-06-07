/**
 * Dev preview mode. When on, the app skips real auth and seeds example habits
 * with history so every screen can be explored without Google/Supabase.
 *
 * Enable by setting EXPO_PUBLIC_PREVIEW=1 (in .env for `expo start`, and in the
 * eas.json build profile env). Never enable in production.
 */
export const PREVIEW = process.env.EXPO_PUBLIC_PREVIEW === '1';

export const PREVIEW_USER_ID = 'preview-user';
