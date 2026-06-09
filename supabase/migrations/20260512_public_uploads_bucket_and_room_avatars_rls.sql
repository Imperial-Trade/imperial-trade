-- ----------------------------------------------------------------------------
-- public_uploads: shared public bucket for Pattern Stream / Insight assets.
--
-- Path conventions (enforced by the RLS policies below):
--   room-avatars/<user_id>/<file>                    -- room owner during create
--   room-messages/<room_id>/<user_id>/<file>         -- room members in chat
--
-- Public read for everything in the bucket; writes are scoped to the
-- authenticated user's own folder under each prefix.
-- ----------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'public_uploads',
  'public_uploads',
  true,
  20971520,
  null
)
on conflict (id) do nothing;

drop policy if exists "public_uploads_public_select" on storage.objects;
create policy "public_uploads_public_select"
on storage.objects
for select
using (bucket_id = 'public_uploads');

-- Room avatars -- write scoped to '<bucket>/room-avatars/<auth.uid>/...'.
drop policy if exists "public_uploads_room_avatars_insert" on storage.objects;
create policy "public_uploads_room_avatars_insert"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'public_uploads'
  and name like 'room-avatars/' || auth.uid()::text || '/%'
);

drop policy if exists "public_uploads_room_avatars_update" on storage.objects;
create policy "public_uploads_room_avatars_update"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'public_uploads'
  and name like 'room-avatars/' || auth.uid()::text || '/%'
)
with check (
  bucket_id = 'public_uploads'
  and name like 'room-avatars/' || auth.uid()::text || '/%'
);

drop policy if exists "public_uploads_room_avatars_delete" on storage.objects;
create policy "public_uploads_room_avatars_delete"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'public_uploads'
  and name like 'room-avatars/' || auth.uid()::text || '/%'
);

-- Room message media -- write scoped to '<bucket>/room-messages/<room_id>/<auth.uid>/...'.
drop policy if exists "public_uploads_room_messages_insert" on storage.objects;
create policy "public_uploads_room_messages_insert"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'public_uploads'
  and name like 'room-messages/%/' || auth.uid()::text || '/%'
);

drop policy if exists "public_uploads_room_messages_update" on storage.objects;
create policy "public_uploads_room_messages_update"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'public_uploads'
  and name like 'room-messages/%/' || auth.uid()::text || '/%'
)
with check (
  bucket_id = 'public_uploads'
  and name like 'room-messages/%/' || auth.uid()::text || '/%'
);

drop policy if exists "public_uploads_room_messages_delete" on storage.objects;
create policy "public_uploads_room_messages_delete"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'public_uploads'
  and name like 'room-messages/%/' || auth.uid()::text || '/%'
);
