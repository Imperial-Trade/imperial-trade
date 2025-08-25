
-- 1) Telemetry table to track usage of deprecated paths
create table if not exists public.function_deprecation_hits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id),
  function_name text not null,
  source text not null default 'edge', -- 'edge' or 'client'
  http_method text,
  route text,
  metadata jsonb,
  created_at timestamptz not null default now()
);

-- Indexes for quick dashboards
create index if not exists idx_function_deprecation_hits_fn_time
  on public.function_deprecation_hits (function_name, created_at desc);

create index if not exists idx_function_deprecation_hits_user_time
  on public.function_deprecation_hits (user_id, created_at desc);

-- 2) Enable RLS
alter table public.function_deprecation_hits enable row level security;

-- 3) Policies
-- Users can insert their own telemetry (edge functions will bypass via service role)
create policy "Users can insert their own deprecation hits"
on public.function_deprecation_hits
for insert
to authenticated
with check (auth.uid() = user_id);

-- Users can view their own telemetry
create policy "Users can view their own deprecation hits"
on public.function_deprecation_hits
for select
to authenticated
using (auth.uid() = user_id);

-- Admins & moderators can view all telemetry
create policy "Admins and moderators can view all deprecation hits"
on public.function_deprecation_hits
for select
to authenticated
using (
  public.has_role(auth.uid(), 'admin'::app_role)
  or public.has_role(auth.uid(), 'moderator'::app_role)
);
