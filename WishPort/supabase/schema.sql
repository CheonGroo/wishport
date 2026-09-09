-- Supabase SQL Editor에서 한 번 실행하세요.
create table if not exists public.user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null default '',
  display_name text not null default '',
  avatar_url text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_profiles enable row level security;
create policy "users can read own profile" on public.user_profiles for select using (auth.uid() = id);
create policy "users can update own profile" on public.user_profiles for update using (auth.uid() = id);
create policy "users can insert own profile" on public.user_profiles for insert with check (auth.uid() = id);
