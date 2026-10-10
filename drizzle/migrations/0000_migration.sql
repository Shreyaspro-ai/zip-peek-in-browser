create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  avatar_url text,
  points integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "own profile read" on public.profiles for select to authenticated using (auth.uid() = id);
create policy "own profile insert" on public.profiles for insert to authenticated with check (auth.uid() = id);
create policy "own profile update" on public.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

create table public.activity_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  page text not null,
  action text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index on public.activity_log (user_id, created_at desc);
grant select, insert, delete on public.activity_log to authenticated;
grant all on public.activity_log to service_role;
alter table public.activity_log enable row level security;
create policy "own activity read" on public.activity_log for select to authenticated using (auth.uid() = user_id);
create policy "own activity insert" on public.activity_log for insert to authenticated with check (auth.uid() = user_id);
create policy "own activity delete" on public.activity_log for delete to authenticated using (auth.uid() = user_id);

create table public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  lesson text not null,
  answer text,
  correct boolean not null,
  created_at timestamptz not null default now()
);
grant select, insert on public.quiz_attempts to authenticated;
grant all on public.quiz_attempts to service_role;
alter table public.quiz_attempts enable row level security;
create policy "own quiz read" on public.quiz_attempts for select to authenticated using (auth.uid() = user_id);
create policy "own quiz insert" on public.quiz_attempts for insert to authenticated with check (auth.uid() = user_id);

create or replace function public.award_quiz_points() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.correct then
    update public.profiles set points = points + 10, updated_at = now() where id = new.user_id;
  end if;
  return new;
end $$;
create trigger quiz_points after insert on public.quiz_attempts for each row execute function public.award_quiz_points();

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, display_name, avatar_url)
  values (new.id, new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email,'@',1)),
    new.raw_user_meta_data->>'avatar_url')
  on conflict (id) do nothing;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();