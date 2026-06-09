-- Room creators (rooms.owner_id) must be able to post signals even when
-- room_members.role was incorrectly left as 'member' (ON CONFLICT DO NOTHING).

CREATE OR REPLACE FUNCTION public.can_post_signal(_room_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.room_members
    WHERE room_id = _room_id AND user_id = _user_id
      AND status = 'active'
      AND role IN ('owner', 'provider')
  )
  OR EXISTS (
    SELECT 1 FROM public.rooms
    WHERE id = _room_id AND owner_id = _user_id
  );
$$;

-- Backfill owner role for room creators stuck as members
UPDATE public.room_members rm
SET role = 'owner'
FROM public.rooms r
WHERE rm.room_id = r.id
  AND rm.user_id = r.owner_id
  AND rm.role IS DISTINCT FROM 'owner';

-- Future inserts: upsert owner membership instead of silent skip
CREATE OR REPLACE FUNCTION public.tg_room_after_insert_owner()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.room_members (room_id, user_id, role, status, joined_at, approved_at)
  VALUES (NEW.id, NEW.owner_id, 'owner', 'active', now(), now())
  ON CONFLICT (room_id, user_id) DO UPDATE SET
    role = 'owner',
    status = 'active',
    approved_at = COALESCE(room_members.approved_at, now());

  IF NEW.type = 'private' AND NEW.code IS NULL THEN
    UPDATE public.rooms SET code = public.generate_room_code() WHERE id = NEW.id AND code IS NULL;
  END IF;

  RETURN NEW;
END $$;
