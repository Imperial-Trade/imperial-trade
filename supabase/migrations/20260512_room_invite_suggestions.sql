-- =====================================================================
-- Insight room compose: invite suggestions + batch invite RPCs
-- =====================================================================
-- Powers the Messenger-style "Add people" step of the two-step
-- CreateRoomPage. Suggests likely-invitees ranked by shared rooms and
-- batch-invites them into a freshly created room with status='pending'.
-- =====================================================================

-- ---------------------------------------------------------------------
-- suggest_room_invitees(p_query, p_limit)
-- ---------------------------------------------------------------------
-- Ranks public users by overlap with the caller (auth.uid()):
--   score = shared_rooms * 3
--         + (is_provider ? 1 : 0)
--         + (recently_active_message_in_shared_room ? 1 : 0)
-- Optional `p_query` does case-insensitive prefix/substring search on
-- public_profiles.display_name. Excludes the caller and users who are
-- already non-pending members in EVERY room the caller is in (i.e. they
-- never join anything new) — purely cosmetic for the picker.
-- =====================================================================
create or replace function public.suggest_room_invitees(
  p_query text default null,
  p_limit int default 50
)
returns table (
  user_id      uuid,
  display_name text,
  avatar_url   text,
  score        int,
  shared_rooms int,
  is_provider  boolean
)
language sql
security definer
set search_path = public
as $$
  with caller_rooms as (
    select rm.room_id
    from public.room_members rm
    where rm.user_id = auth.uid()
      and rm.status = 'active'
  ),
  candidate_overlap as (
    select
      rm.user_id,
      count(distinct rm.room_id)::int as shared_rooms
    from public.room_members rm
    where rm.user_id <> auth.uid()
      and rm.status = 'active'
      and rm.room_id in (select room_id from caller_rooms)
    group by rm.user_id
  ),
  candidate_provider as (
    select
      rm.user_id,
      bool_or(rm.role in ('owner', 'provider')) as is_provider
    from public.room_members rm
    where rm.user_id <> auth.uid()
    group by rm.user_id
  ),
  recent_activity as (
    select distinct m.user_id
    from public.room_messages m
    where m.user_id <> auth.uid()
      and m.created_at > now() - interval '14 days'
      and m.room_id in (select room_id from caller_rooms)
  ),
  ranked as (
    select
      pp.id as user_id,
      pp.display_name,
      pp.avatar_url,
      coalesce(co.shared_rooms, 0) as shared_rooms,
      coalesce(cp.is_provider, false) as is_provider,
      (
        coalesce(co.shared_rooms, 0) * 3
        + case when coalesce(cp.is_provider, false) then 1 else 0 end
        + case when ra.user_id is not null then 1 else 0 end
      ) as score
    from public.public_profiles pp
    left join candidate_overlap co on co.user_id = pp.id
    left join candidate_provider cp on cp.user_id = pp.id
    left join recent_activity ra on ra.user_id = pp.id
    where pp.id <> auth.uid()
      and (
        p_query is null
        or length(btrim(p_query)) = 0
        or pp.display_name ilike '%' || btrim(p_query) || '%'
      )
  )
  select
    user_id,
    display_name,
    avatar_url,
    score,
    shared_rooms,
    is_provider
  from ranked
  -- Always include matches even with score 0 when the user explicitly typed a query;
  -- otherwise hide cold candidates to keep the default suggestion list tight.
  where score > 0 or (p_query is not null and length(btrim(p_query)) > 0)
  order by score desc, display_name asc nulls last
  limit greatest(1, least(coalesce(p_limit, 50), 200));
$$;

revoke all on function public.suggest_room_invitees(text, int) from public;
grant execute on function public.suggest_room_invitees(text, int) to authenticated;

-- ---------------------------------------------------------------------
-- invite_room_members(p_room_id, p_user_ids[])
-- ---------------------------------------------------------------------
-- Batch-invites users to a room with status='pending', tagging the
-- caller as invited_by. Caller must currently be owner/admin/provider
-- with active membership in the target room. Existing memberships are
-- skipped (no upsert), so re-inviting is idempotent and harmless.
-- Returns the number of new pending invitations created.
-- =====================================================================
create or replace function public.invite_room_members(
  p_room_id uuid,
  p_user_ids uuid[]
)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  inserted_count int := 0;
  caller_role public.room_role;
  caller_status public.room_member_status;
begin
  if p_room_id is null then
    raise exception 'p_room_id is required';
  end if;
  if p_user_ids is null or array_length(p_user_ids, 1) is null then
    return 0;
  end if;

  select rm.role, rm.status
    into caller_role, caller_status
  from public.room_members rm
  where rm.room_id = p_room_id
    and rm.user_id = auth.uid()
  limit 1;

  if caller_role is null then
    raise exception 'not a member of this room';
  end if;
  if caller_status <> 'active' then
    raise exception 'caller membership is not active';
  end if;
  if caller_role not in ('owner', 'admin', 'provider') then
    raise exception 'insufficient permissions to invite members';
  end if;

  with new_invites as (
    insert into public.room_members (
      room_id, user_id, role, status, invited_by, invited_via
    )
    select
      p_room_id,
      uid,
      'member'::public.room_role,
      'pending'::public.room_member_status,
      auth.uid(),
      'link'::public.room_invite_type
    from unnest(p_user_ids) as t(uid)
    where uid is not null
      and uid <> auth.uid()
      and not exists (
        select 1
        from public.room_members rm
        where rm.room_id = p_room_id
          and rm.user_id = uid
      )
    returning 1
  )
  select count(*) into inserted_count from new_invites;

  return inserted_count;
end;
$$;

revoke all on function public.invite_room_members(uuid, uuid[]) from public;
grant execute on function public.invite_room_members(uuid, uuid[]) to authenticated;
