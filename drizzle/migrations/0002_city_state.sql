create table public.city_state (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  seed integer not null default floor(random()*2147483647)::int,
  deltas jsonb not null default '{}'::jsonb,
  actions_count integer not null default 0,
  updated_at timestamptz not null default now()
);
grant select on public.city_state to authenticated;
grant all on public.city_state to service_role;
alter table public.city_state enable row level security;
create policy "own city read" on public.city_state for select to authenticated using (auth.uid() = user_id);

insert into public.city_state (user_id) select id from public.profiles on conflict do nothing;

create or replace function public.ensure_city_state() returns public.city_state
language plpgsql security definer set search_path = public as $$
declare r public.city_state;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  insert into public.profiles (id) values (auth.uid()) on conflict do nothing;
  insert into public.city_state (user_id) values (auth.uid()) on conflict do nothing;
  select * into r from public.city_state where user_id = auth.uid();
  return r;
end $$;

create or replace function public.apply_city_action(_page text, _action text, _keys text[], _intensity numeric)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  st public.city_state;
  k text;
  i numeric := least(greatest(coalesce(_intensity,1), 0.5), 5);
  changes jsonb := '{}'::jsonb;
  cur numeric; d numeric;
begin
  st := public.ensure_city_state();
  if array_length(_keys,1) > 200 then _keys := _keys[1:200]; end if;
  foreach k in array coalesce(_keys, '{}') loop
    if length(k) > 200 then continue; end if;
    d := round((i * (0.4 + random()) * (case when random() < 0.8 then 1 else -1 end))::numeric, 2);
    cur := coalesce((st.deltas->>k)::numeric, 0);
    cur := least(greatest(cur + d, -40), 60);
    st.deltas := jsonb_set(st.deltas, array[k], to_jsonb(cur), true);
    changes := jsonb_set(changes, array[k], to_jsonb(d), true);
  end loop;
  update public.city_state set deltas = st.deltas, actions_count = actions_count + 1, updated_at = now()
    where user_id = auth.uid();
  insert into public.activity_log (user_id, page, action, details)
    values (auth.uid(), left(_page,50), left(_action,50), jsonb_build_object('intensity', i, 'changed', coalesce(array_length(_keys,1),0)));
  return jsonb_build_object('deltas', st.deltas, 'changes', changes, 'actions_count', st.actions_count + 1);
end $$;

create or replace function public.reset_city() returns void
language plpgsql security definer set search_path = public as $$
begin
  update public.city_state set deltas = '{}'::jsonb, actions_count = 0, seed = floor(random()*2147483647)::int, updated_at = now()
  where user_id = auth.uid();
end $$;

revoke execute on function public.ensure_city_state() from public, anon;
revoke execute on function public.apply_city_action(text,text,text[],numeric) from public, anon;
revoke execute on function public.reset_city() from public, anon;
grant execute on function public.ensure_city_state() to authenticated;
grant execute on function public.apply_city_action(text,text,text[],numeric) to authenticated;
grant execute on function public.reset_city() to authenticated;

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, display_name, avatar_url)
  values (new.id, new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email,'@',1)),
    new.raw_user_meta_data->>'avatar_url')
  on conflict (id) do nothing;
  insert into public.city_state (user_id) values (new.id) on conflict do nothing;
  return new;
end $$;