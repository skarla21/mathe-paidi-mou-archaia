-- Return the account email from the same transaction that stores the new hash.
-- Postgres cannot replace a function with a different return type.

drop function if exists public.consume_password_reset(text, text);

create function public.consume_password_reset(
  p_token_hash text,
  p_password_hash text
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_email text;
begin
  select user_id into v_user_id
  from public.password_reset_tokens
  where token_hash = p_token_hash
    and expires_at > now()
  limit 1;

  if v_user_id is null then
    return null;
  end if;

  perform 1 from public.users where id = v_user_id for update;

  perform 1 from public.password_reset_tokens
  where token_hash = p_token_hash
    and user_id = v_user_id
    and expires_at > now();

  if not found then
    return null;
  end if;

  update public.users
  set password_hash = p_password_hash
  where id = v_user_id;

  if not found then
    raise exception 'user missing for password reset';
  end if;

  select email into v_email
  from public.users
  where id = v_user_id;

  if v_email is null or length(trim(v_email)) = 0 then
    raise exception 'user email missing for password reset';
  end if;

  delete from public.password_reset_tokens
  where user_id = v_user_id;

  return v_email;
end;
$$;

revoke all on function public.consume_password_reset(text, text) from public, anon, authenticated;
grant execute on function public.consume_password_reset(text, text) to service_role;
