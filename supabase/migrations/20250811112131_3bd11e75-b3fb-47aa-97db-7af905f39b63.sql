
-- 1) Create table for per-user notifications
create table if not exists public.user_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  type text not null default 'system',
  title text not null,
  message text not null,
  is_read boolean not null default false,
  priority text not null default 'medium',
  link_url text,
  source text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2) Enable RLS
alter table public.user_notifications enable row level security;

-- 3) RLS Policies: users manage only their own notifications
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'user_notifications'
      and policyname = 'Users can view their own notifications'
  ) then
    create policy "Users can view their own notifications"
      on public.user_notifications
      for select
      using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'user_notifications'
      and policyname = 'Users can create their own notifications'
  ) then
    create policy "Users can create their own notifications"
      on public.user_notifications
      for insert
      with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'user_notifications'
      and policyname = 'Users can update their own notifications'
  ) then
    create policy "Users can update their own notifications"
      on public.user_notifications
      for update
      using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'user_notifications'
      and policyname = 'Users can delete their own notifications'
  ) then
    create policy "Users can delete their own notifications"
      on public.user_notifications
      for delete
      using (auth.uid() = user_id);
  end if;
end$$;

-- 4) Helpful indexes for fast list + unread count
create index if not exists idx_user_notifications_user_read_created
  on public.user_notifications (user_id, is_read, created_at desc);

-- Optional GIN on metadata for advanced filtering/search later
create index if not exists idx_user_notifications_metadata_gin
  on public.user_notifications using gin (metadata);

-- 5) Keep updated_at fresh on updates, reusing existing helper
-- (function public.update_updated_at_column() already exists in your DB)
drop trigger if exists trg_user_notifications_updated_at on public.user_notifications;
create trigger trg_user_notifications_updated_at
  before update on public.user_notifications
  for each row execute function public.update_updated_at_column();

-- 6) Ensure full row data for realtime UPDATE payloads
alter table public.user_notifications replica identity full;
