create or replace function public.reserve_rate_limit_slot(
  p_user_id uuid,
  p_action text,
  p_window_start timestamptz,
  p_limit integer
)
returns table (
  allowed boolean,
  new_count integer
)
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_count integer;
begin
  if p_limit <= 0 then
    select count
    into v_count
    from public.rate_limits
    where user_id = p_user_id
      and action = p_action
      and window_start = p_window_start;

    return query
      select false, coalesce(v_count, 0);
    return;
  end if;

  insert into public.rate_limits (user_id, action, window_start, count)
  values (p_user_id, p_action, p_window_start, 1)
  on conflict (user_id, action, window_start)
  do update
    set count = public.rate_limits.count + 1
  where public.rate_limits.count < p_limit
  returning public.rate_limits.count into v_count;

  if found then
    return query
      select true, v_count;
    return;
  end if;

  select count
  into v_count
  from public.rate_limits
  where user_id = p_user_id
    and action = p_action
    and window_start = p_window_start;

  return query
    select false, coalesce(v_count, 0);
end;
$$;
