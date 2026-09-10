create table if not exists public.user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null default '',
  display_name text not null default '',
  avatar_url text not null default '',
  role text not null default '',
  phone text not null default '',
  school text not null default '',
  major text not null default '',
  gpa text not null default '',
  location text not null default '',
  website text not null default '',
  github text not null default '',
  education_period text not null default '',
  career_title text not null default '',
  career_period text not null default '',
  career_summary text not null default '',
  photo_data text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_profiles add column if not exists email text not null default '';
alter table public.user_profiles add column if not exists display_name text not null default '';
alter table public.user_profiles add column if not exists avatar_url text not null default '';
alter table public.user_profiles add column if not exists role text not null default '';
alter table public.user_profiles add column if not exists phone text not null default '';
alter table public.user_profiles add column if not exists school text not null default '';
alter table public.user_profiles add column if not exists major text not null default '';
alter table public.user_profiles add column if not exists gpa text not null default '';
alter table public.user_profiles add column if not exists location text not null default '';
alter table public.user_profiles add column if not exists website text not null default '';
alter table public.user_profiles add column if not exists github text not null default '';
alter table public.user_profiles add column if not exists education_period text not null default '';
alter table public.user_profiles add column if not exists career_title text not null default '';
alter table public.user_profiles add column if not exists career_period text not null default '';
alter table public.user_profiles add column if not exists career_summary text not null default '';
alter table public.user_profiles add column if not exists photo_data text not null default '';
alter table public.user_profiles add column if not exists created_at timestamptz not null default now();
alter table public.user_profiles add column if not exists updated_at timestamptz not null default now();

create table if not exists public.experiences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  meta text not null default '',
  summary text not null default '',
  evidence text not null default '',
  star_situation text not null default '',
  star_task text not null default '',
  star_action text not null default '',
  star_result text not null default '',
  chips jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.archive_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('achievement', 'asset')),
  title text not null,
  detail text not null default '',
  issuer text not null default '',
  grade text not null default '',
  acquired_at text not null default '',
  file_name text not null default '',
  file_type text not null default '',
  file_data text not null default '',
  ocr_text text not null default '',
  tone text not null default 'mint',
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.archive_items add column if not exists issuer text not null default '';
alter table public.archive_items add column if not exists grade text not null default '';
alter table public.archive_items add column if not exists acquired_at text not null default '';
alter table public.archive_items add column if not exists file_name text not null default '';
alter table public.archive_items add column if not exists file_type text not null default '';
alter table public.archive_items add column if not exists file_data text not null default '';
alter table public.archive_items add column if not exists ocr_text text not null default '';

create table if not exists public.education_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  school text not null default '',
  major text not null default '',
  degree text not null default '',
  gpa text not null default '',
  started_at text not null default '',
  ended_at text not null default '',
  description text not null default '',
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.career_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  company text not null default '',
  role text not null default '',
  started_at text not null default '',
  ended_at text not null default '',
  summary text not null default '',
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.essays (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  company text not null,
  role text not null default '',
  status text not null default '작성 중',
  current_step integer not null default 0,
  max_step integer not null default 0,
  active_question integer not null default 0,
  source_url text not null default '',
  source_text text not null default '',
  source_file text not null default '',
  job_post_url text not null default '',
  job_post_file text not null default '',
  jd_url text not null default '',
  jd_file text not null default '',
  blind_mode boolean not null default true,
  ai_rules text not null default '',
  reference_file text not null default '',
  reference_text text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.essay_questions (
  id uuid primary key default gen_random_uuid(),
  essay_id uuid not null references public.essays(id) on delete cascade,
  position integer not null,
  prompt text not null,
  char_limit integer not null default 600,
  theme text not null default '',
  draft text not null default '',
  feedback text not null default '',
  annotations jsonb not null default '[]'::jsonb,
  needs_regeneration boolean not null default false,
  updated_at timestamptz not null default now(),
  unique (essay_id, position)
);

create table if not exists public.question_experiences (
  question_id uuid not null references public.essay_questions(id) on delete cascade,
  experience_id uuid not null references public.experiences(id) on delete cascade,
  position integer not null default 0,
  primary key (question_id, experience_id)
);

create table if not exists public.applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  company text not null,
  role text not null default '',
  submitted_at text not null default '',
  status text not null default '지원 예정',
  essay_id uuid references public.essays(id) on delete set null,
  updated_at timestamptz not null default now()
);

-- Process Tracking: applications can carry a job title and link to an Interview Set.
alter table public.applications add column if not exists job_title text not null default '';

-- interview_sessions doubles as the "Interview Set" entity: a named, standalone
-- collection of Q&A that may optionally be linked to an essay and/or an application.
create table if not exists public.interview_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  application_id uuid references public.applications(id) on delete set null,
  mode text not null default 'application_prep',
  difficulty text not null default 'standard',
  question_count integer not null default 0,
  followup_depth integer not null default 1,
  status text not null default 'draft',
  readiness integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.interview_sessions add column if not exists essay_id uuid references public.essays(id) on delete set null;
alter table public.interview_sessions add column if not exists name text not null default '';
alter table public.interview_sessions add column if not exists company text not null default '';
alter table public.interview_sessions add column if not exists role text not null default '';
alter table public.interview_sessions add column if not exists source_type text not null default 'manual';
alter table public.interview_sessions add column if not exists question_category text not null default '';
alter table public.interview_sessions add column if not exists jd_provided boolean not null default false;
alter table public.interview_sessions add column if not exists jd_text text not null default '';

-- Now that applications.essay_id exists, applications can also reference the
-- Interview Set (interview_sessions row) prepared for that application.
alter table public.applications add column if not exists interview_set_id uuid references public.interview_sessions(id) on delete set null;

create table if not exists public.interview_answer_assets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  question_cluster_id text not null,
  cluster_label text not null,
  representative_experience_id uuid references public.experiences(id) on delete set null,
  core_message text not null default '',
  talking_points jsonb not null default '{}'::jsonb,
  full_answer text not null default '',
  followup_questions jsonb not null default '[]'::jsonb,
  archive_grounding jsonb not null default '{}'::jsonb,
  weak_spots jsonb not null default '[]'::jsonb,
  readiness text not null default 'missing',
  updated_at timestamptz not null default now(),
  unique (user_id, question_cluster_id)
);

create table if not exists public.interview_questions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid references public.interview_sessions(id) on delete cascade,
  application_id uuid references public.applications(id) on delete set null,
  question_type text not null default 'COMMON',
  competency_id text not null default '',
  question_cluster_id text not null default '',
  source_type text not null default 'COMMON',
  source_id text not null default '',
  question_text text not null,
  difficulty text not null default 'standard',
  parent_question_id uuid references public.interview_questions(id) on delete cascade,
  matched_answer_asset_id uuid references public.interview_answer_assets(id) on delete set null,
  status text not null default 'missing',
  feedback jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.interview_questions add column if not exists answer_text text not null default '';
alter table public.interview_questions add column if not exists followup_text text not null default '';
alter table public.interview_questions add column if not exists position integer not null default 0;

create table if not exists public.interview_answer_contexts (
  answer_asset_id uuid not null references public.interview_answer_assets(id) on delete cascade,
  experience_id uuid references public.experiences(id) on delete set null,
  material_id text not null default '',
  result_id text not null default '',
  output_id text not null default '',
  skill_id text not null default '',
  primary key (answer_asset_id, material_id, result_id, output_id, skill_id)
);

create table if not exists public.interview_weak_spots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  application_id uuid references public.applications(id) on delete cascade,
  source_type text not null default 'ARCHIVE',
  source_id text not null default '',
  description text not null,
  severity text not null default 'medium',
  resolved_at timestamptz,
  archive_update_needed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_experiences_user on public.experiences(user_id, updated_at desc);
create index if not exists idx_archive_items_user on public.archive_items(user_id, kind, position);
create index if not exists idx_education_entries_user on public.education_entries(user_id, position);
create index if not exists idx_career_entries_user on public.career_entries(user_id, position);
create index if not exists idx_essays_user on public.essays(user_id, updated_at desc);
create index if not exists idx_questions_essay on public.essay_questions(essay_id, position);
create index if not exists idx_applications_user on public.applications(user_id, updated_at desc);
create index if not exists idx_interview_sessions_user on public.interview_sessions(user_id, updated_at desc);
create index if not exists idx_interview_sessions_essay on public.interview_sessions(essay_id);
create index if not exists idx_applications_interview_set on public.applications(interview_set_id);
create index if not exists idx_interview_assets_user on public.interview_answer_assets(user_id, question_cluster_id);
create index if not exists idx_interview_questions_user on public.interview_questions(user_id, created_at desc);
create index if not exists idx_interview_questions_session on public.interview_questions(session_id, created_at);
create index if not exists idx_interview_weak_spots_user on public.interview_weak_spots(user_id, resolved_at, updated_at desc);

alter table public.user_profiles enable row level security;
alter table public.experiences enable row level security;
alter table public.archive_items enable row level security;
alter table public.education_entries enable row level security;
alter table public.career_entries enable row level security;
alter table public.essays enable row level security;
alter table public.essay_questions enable row level security;
alter table public.question_experiences enable row level security;
alter table public.applications enable row level security;
alter table public.interview_sessions enable row level security;
alter table public.interview_answer_assets enable row level security;
alter table public.interview_questions enable row level security;
alter table public.interview_answer_contexts enable row level security;
alter table public.interview_weak_spots enable row level security;

drop policy if exists "users read own profile" on public.user_profiles;
drop policy if exists "users insert own profile" on public.user_profiles;
drop policy if exists "users update own profile" on public.user_profiles;
drop policy if exists "users manage own experiences" on public.experiences;
drop policy if exists "users manage own archive items" on public.archive_items;
drop policy if exists "users manage own education entries" on public.education_entries;
drop policy if exists "users manage own career entries" on public.career_entries;
drop policy if exists "users manage own essays" on public.essays;
drop policy if exists "users manage own applications" on public.applications;
drop policy if exists "users manage own questions" on public.essay_questions;
drop policy if exists "users manage own question links" on public.question_experiences;
drop policy if exists "users manage own interview sessions" on public.interview_sessions;
drop policy if exists "users manage own interview assets" on public.interview_answer_assets;
drop policy if exists "users manage own interview questions" on public.interview_questions;
drop policy if exists "users manage own interview weak spots" on public.interview_weak_spots;
drop policy if exists "users manage own interview answer contexts" on public.interview_answer_contexts;

create policy "users read own profile" on public.user_profiles for select using (auth.uid() = id);
create policy "users insert own profile" on public.user_profiles for insert with check (auth.uid() = id);
create policy "users update own profile" on public.user_profiles for update using (auth.uid() = id);

create policy "users manage own experiences" on public.experiences for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users manage own archive items" on public.archive_items for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users manage own education entries" on public.education_entries for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users manage own career entries" on public.career_entries for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users manage own essays" on public.essays for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users manage own applications" on public.applications for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users manage own interview sessions" on public.interview_sessions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users manage own interview assets" on public.interview_answer_assets for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users manage own interview questions" on public.interview_questions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users manage own interview weak spots" on public.interview_weak_spots for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "users manage own questions" on public.essay_questions
  for all
  using (exists (select 1 from public.essays where essays.id = essay_questions.essay_id and essays.user_id = auth.uid()))
  with check (exists (select 1 from public.essays where essays.id = essay_questions.essay_id and essays.user_id = auth.uid()));

create policy "users manage own question links" on public.question_experiences
  for all
  using (
    exists (
      select 1
      from public.essay_questions q
      join public.essays e on e.id = q.essay_id
      where q.id = question_experiences.question_id and e.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.essay_questions q
      join public.essays e on e.id = q.essay_id
      where q.id = question_experiences.question_id and e.user_id = auth.uid()
    )
  );

create policy "users manage own interview answer contexts" on public.interview_answer_contexts
  for all
  using (
    exists (
      select 1
      from public.interview_answer_assets a
      where a.id = interview_answer_contexts.answer_asset_id and a.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.interview_answer_assets a
      where a.id = interview_answer_contexts.answer_asset_id and a.user_id = auth.uid()
    )
  );
