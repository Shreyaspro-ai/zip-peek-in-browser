alter table public.city_state add column if not exists metrics jsonb not null default '{"water_security":60,"flood_safety":60,"budget":2480,"wellbeing":70,"leakage":12}'::jsonb;
alter table public.city_state add column if not exists constructive_count integer not null default 0;
alter table public.city_state add column if not exists destructive_count integer not null default 0;
alter table public.city_state add column if not exists last_action_at timestamptz;

create or replace function public.num_input(_inputs jsonb, _name text, _default numeric)
returns numeric language sql immutable set search_path = public as $$
  select coalesce((select (e->>'value')::numeric from jsonb_array_elements(coalesce(_inputs->'values','[]'::jsonb)) e
    where e->>'name' = _name and (e->>'value') ~ '^-?[0-9]+(\.[0-9]+)?$' limit 1), _default)
$$;

create or replace function public.evaluate_city_action(_page text, _action text, _inputs jsonb, _keys text[])
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  st public.city_state;
  m jsonb; score numeric := 0; reasons text[] := '{}'; cost numeric := 0;
  verdict text; d numeric; k text; cur numeric; changes jsonb := '{}'::jsonb;
  total numeric; dev numeric := 0; a numeric; mn numeric := 100; nm text; share numeric;
  rain numeric; pop numeric; alloc numeric; inv numeric; ratio numeric; tool text; v numeric;
  dw numeric := 0; df numeric := 0; dwell numeric := 0; dl numeric := 0;
begin
  st := public.ensure_city_state();
  m := st.metrics;
  if st.last_action_at is not null and now() - st.last_action_at < interval '3 seconds' then
    return jsonb_build_object('verdict','ignored','score',0,'reasons',array['Too fast — wait a moment between actions.'],'deltas',st.deltas,'metrics',m);
  end if;

  if _action = 'apply-allocation' then
    total := 0;
    foreach nm in array array['Azure Lake','Greenbank','Canal District','Ripple Bay'] loop
      a := public.num_input(_inputs, nm || ' allocation', 25);
      total := total + a; mn := least(mn, a);
    end loop;
    foreach nm in array array['Azure Lake','Greenbank','Canal District','Ripple Bay'] loop
      share := case nm when 'Greenbank' then 32.6 when 'Azure Lake' then 22.6 when 'Canal District' then 25.8 else 19 end;
      dev := dev + abs(public.num_input(_inputs, nm || ' allocation', 25) * 100 / greatest(total,1) - share);
    end loop;
    score := 50 - dev * 2 - abs(total - 100) * 1.5;
    if abs(total-100) > 5 then reasons := reasons || format('Allocations add up to %s%%, not 100%%.', total); end if;
    if mn < 10 then score := score - 40; reasons := reasons || 'A district gets under 10% of the water — residents go dry.'; end if;
    if dev <= 10 then reasons := reasons || 'Water shared fairly by population.'; else reasons := reasons || 'Split doesn''t match where people live.'; end if;
    dw := score / 5; dwell := score / 8;
  elsif _action = 'apply-reuse' then
    v := public.num_input(_inputs, 'Reuse target', 40);
    cost := v * 4;
    score := least((v - 15) * 2.5, 60);
    reasons := reasons || format('Reusing %s%% of wastewater saves fresh water.', v);
    dw := score / 4;
  elsif _action = 'run-simulation' then
    rain := public.num_input(_inputs, 'Rainfall Change', -20);
    pop := public.num_input(_inputs, 'Population Growth', 15);
    alloc := public.num_input(_inputs, 'Water Allocation', 120);
    inv := public.num_input(_inputs, 'Infrastructure Investment', 1800);
    ratio := alloc * (1 + rain / 200) / (120 * (1 + pop / 100));
    score := (ratio - 1) * 120 + (inv - 1500) / 40;
    if ratio < 0.9 then reasons := reasons || 'Supply can''t keep up with demand in this future.';
    elsif ratio > 1.4 then score := score - 30; reasons := reasons || 'Over-extracting water — wasteful and unsustainable.';
    else reasons := reasons || 'Supply meets demand.'; end if;
    if inv < 1000 then reasons := reasons || 'Infrastructure investment is too low.'; end if;
    dw := score / 6; df := (inv - 1500) / 200;
  elsif _action = 'run-crisis' then
    score := 5; reasons := reasons || 'Practice run — preparing helps a little.'; df := 1;
  elsif _action = 'activate-response' then
    cost := 60; score := 35; reasons := reasons || 'Emergency response protects residents.'; df := 6; dwell := 3;
  elsif _action = 'apply-plan' then
    tool := coalesce(_inputs->>'tool', 'Housing');
    if tool = 'Housing' then
      cost := 120;
      if (m->>'flood_safety')::numeric < 55 then score := -35; reasons := reasons || 'More housing without drainage raises flood risk.'; df := -6;
      else score := 15; reasons := reasons || 'New homes added; drainage can cope.'; df := -2; end if;
      dwell := 2;
    elsif tool = 'Green space' then cost := 80; score := 35; reasons := reasons || 'Green space soaks up rain and improves wellbeing.'; df := 4; dwell := 4;
    elsif tool = 'Drainage' then cost := 100; score := 40; reasons := reasons || 'Drainage cuts flood risk.'; df := 7;
    else cost := 60; score := 30; reasons := reasons || 'Permeable paths reduce runoff.'; df := 4; end if;
  elsif _action = 'repair' then
    cost := 12;
    if (m->>'leakage')::numeric <= 3 then score := -10; reasons := reasons || 'Leakage is already minimal — wasted budget.';
    else score := 40; reasons := reasons || 'Leak fixed — less water lost.'; dl := -3; dw := 4; end if;
  else
    return jsonb_build_object('verdict','neutral','score',0,'reasons',array['No effect.'],'deltas',st.deltas,'metrics',m);
  end if;

  if cost > (m->>'budget')::numeric then
    score := -50; reasons := array['Not enough budget — this would bankrupt the city.']; cost := 0; dw := -2; df := 0; dl := 0; dwell := -3;
  end if;

  score := round(least(greatest(score, -100), 100));
  verdict := case when score >= 10 then 'constructive' when score <= -10 then 'destructive' else 'neutral' end;

  m := jsonb_build_object(
    'water_security', least(greatest((m->>'water_security')::numeric + dw, 0), 100),
    'flood_safety', least(greatest((m->>'flood_safety')::numeric + df, 0), 100),
    'wellbeing', least(greatest((m->>'wellbeing')::numeric + dwell + score/20, 0), 100),
    'leakage', least(greatest((m->>'leakage')::numeric + dl, 0), 40),
    'budget', (m->>'budget')::numeric - cost);

  if array_length(_keys,1) > 200 then _keys := _keys[1:200]; end if;
  foreach k in array coalesce(_keys,'{}') loop
    if length(k) > 200 then continue; end if;
    d := round((score / 25 * (0.6 + random() * 0.8))::numeric, 2);
    cur := least(greatest(coalesce((st.deltas->>k)::numeric,0) + d, -40), 60);
    st.deltas := jsonb_set(st.deltas, array[k], to_jsonb(cur), true);
  end loop;

  update public.city_state set deltas = st.deltas, metrics = m, actions_count = actions_count + 1,
    constructive_count = constructive_count + (verdict='constructive')::int,
    destructive_count = destructive_count + (verdict='destructive')::int,
    last_action_at = now(), updated_at = now()
  where user_id = auth.uid();

  update public.profiles set points = greatest(points + (score/10)::int, 0), updated_at = now() where id = auth.uid();

  insert into public.activity_log (user_id, page, action, details)
  values (auth.uid(), left(_page,50), left(_action,50), jsonb_build_object('verdict',verdict,'score',score,'reasons',reasons,'cost',cost,'metrics',m));

  return jsonb_build_object('verdict',verdict,'score',score,'reasons',reasons,'cost',cost,'deltas',st.deltas,'metrics',m,'points',(score/10)::int);
end $$;

revoke execute on function public.evaluate_city_action(text,text,jsonb,text[]) from public, anon;
grant execute on function public.evaluate_city_action(text,text,jsonb,text[]) to authenticated;

create or replace function public.reset_city()
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.city_state set deltas = '{}'::jsonb, actions_count = 0, constructive_count = 0, destructive_count = 0,
    metrics = '{"water_security":60,"flood_safety":60,"budget":2480,"wellbeing":70,"leakage":12}'::jsonb,
    seed = floor(random()*2147483647)::int, updated_at = now()
  where user_id = auth.uid();
end $$;