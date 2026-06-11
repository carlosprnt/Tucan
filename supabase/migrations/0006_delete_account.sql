-- Full account deletion, callable by the signed-in user from the app.
--
-- profiles, habits and completions all reference auth.users(id) ON DELETE
-- CASCADE, so removing the auth user wipes every trace of the account. This
-- runs as SECURITY DEFINER (owner privileges) because a normal authenticated
-- role can't delete from auth.users; auth.uid() still scopes it to the caller.
create or replace function public.delete_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from auth.users where id = auth.uid();
end;
$$;

revoke all on function public.delete_account() from public, anon;
grant execute on function public.delete_account() to authenticated;
