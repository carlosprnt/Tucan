-- Security hardening for the schema functions (per Supabase advisors).

-- Pin search_path so the trigger function can't be influenced by role settings.
alter function public.handle_times() set search_path = '';

-- handle_new_user is a SECURITY DEFINER trigger function; it must not be
-- callable as an RPC by anon/authenticated. Triggers still fire regardless.
revoke execute on function public.handle_new_user() from public;
revoke execute on function public.handle_new_user() from anon;
revoke execute on function public.handle_new_user() from authenticated;
