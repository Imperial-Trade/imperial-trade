-- =====================================================================
-- Pattern Stream Rooms - Foundation Schema
-- =====================================================================
-- Public/Private provider rooms with messenger-grade chat, structured
-- signal-as-message cards, asset request workflow, Stripe Connect
-- monetization, per-room notifications, audit trail, and full RLS.
-- =====================================================================

-- ---------------------------------------------------------------------
-- ENUM TYPES
-- ---------------------------------------------------------------------

DO $$ BEGIN
  CREATE TYPE public.room_type AS ENUM ('public', 'private');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE public.room_role AS ENUM ('owner', 'admin', 'provider', 'member');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE public.room_member_status AS ENUM ('pending', 'active', 'muted', 'timed_out', 'banned');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE public.room_invite_type AS ENUM ('link', 'code', 'qr');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE public.room_message_type AS ENUM ('text', 'media', 'signal', 'system');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE public.room_message_delete_scope AS ENUM ('self', 'all');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE public.room_audit_category AS ENUM (
    'name', 'description', 'avatar', 'rules', 'invite', 'plan',
    'background', 'member', 'role', 'monetization', 'notifications', 'capacity'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE public.room_signal_status AS ENUM (
    'pending', 'active', 'closed_win', 'closed_loss', 'canceled'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE public.room_signal_source AS ENUM ('manual', 'engine');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE public.room_signal_update_type AS ENUM (
    'tp_hit', 'sl_hit', 'edit', 'cancel', 'note'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE public.room_asset_request_status AS ENUM (
    'requested', 'in_progress', 'approved', 'denied', 'done'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE public.room_subscription_plan AS ENUM ('monthly', 'quarterly', 'yearly');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE public.room_subscription_status AS ENUM (
    'active', 'trialing', 'past_due', 'canceled', 'gifted', 'paused'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ---------------------------------------------------------------------
-- HELPER: short code generator (4-digit-ish for vanity, paired with token)
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.generate_room_code()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  candidate text;
  exists_count int;
  attempts int := 0;
BEGIN
  LOOP
    candidate := lpad(floor(random() * 10000)::text, 4, '0');
    SELECT COUNT(*) INTO exists_count FROM public.rooms WHERE code = candidate;
    IF exists_count = 0 THEN
      RETURN candidate;
    END IF;
    attempts := attempts + 1;
    IF attempts > 50 THEN
      candidate := lpad(floor(random() * 100000000)::text, 8, '0');
      RETURN candidate;
    END IF;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_invite_token()
RETURNS text
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN encode(gen_random_bytes(24), 'base64')
    || replace(replace(replace(encode(gen_random_bytes(8), 'base64'), '/', ''), '+', ''), '=', '');
END;
$$;

-- ---------------------------------------------------------------------
-- ROOMS
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.rooms (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id        uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type            public.room_type NOT NULL DEFAULT 'public',
  name            text NOT NULL CHECK (length(name) BETWEEN 1 AND 64),
  slug            text NOT NULL UNIQUE,
  code            text UNIQUE,
  description     text CHECK (length(coalesce(description, '')) <= 280),
  avatar_url      text,
  background_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  monetization    text NOT NULL DEFAULT 'free' CHECK (monetization IN ('free', 'paid')),
  capacity        integer NOT NULL DEFAULT 120 CHECK (capacity > 0),
  plan_tier       text NOT NULL DEFAULT 'free' CHECK (plan_tier IN ('free', 'tier1', 'tier2', 'custom')),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rooms_owner_id ON public.rooms(owner_id);
CREATE INDEX IF NOT EXISTS idx_rooms_type ON public.rooms(type);
CREATE INDEX IF NOT EXISTS idx_rooms_created_at ON public.rooms(created_at DESC);

-- ---------------------------------------------------------------------
-- ROOM MEMBERS
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.room_members (
  room_id              uuid NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  user_id              uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role                 public.room_role NOT NULL DEFAULT 'member',
  status               public.room_member_status NOT NULL DEFAULT 'active',
  invited_by           uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  invited_via          public.room_invite_type,
  invite_self_referral text,
  mute_until           timestamptz,
  timeout_until        timestamptz,
  ban_reason           text,
  last_read_message_id uuid,
  rules_accepted_at    timestamptz,
  joined_at            timestamptz NOT NULL DEFAULT now(),
  approved_at          timestamptz,
  approved_by          uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  PRIMARY KEY (room_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_room_members_user ON public.room_members(user_id);
CREATE INDEX IF NOT EXISTS idx_room_members_status ON public.room_members(room_id, status);

-- ---------------------------------------------------------------------
-- ROOM INVITES
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.room_invites (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id      uuid NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  type         public.room_invite_type NOT NULL,
  token        text NOT NULL UNIQUE,
  short_code   text,
  max_uses     integer,
  used_count   integer NOT NULL DEFAULT 0,
  expires_at   timestamptz,
  created_by   uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  revoked_at   timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_room_invites_room ON public.room_invites(room_id);
CREATE INDEX IF NOT EXISTS idx_room_invites_token ON public.room_invites(token);

-- ---------------------------------------------------------------------
-- ROOM RULES
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.room_rules (
  room_id    uuid PRIMARY KEY REFERENCES public.rooms(id) ON DELETE CASCADE,
  version    integer NOT NULL DEFAULT 1,
  content    text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- ---------------------------------------------------------------------
-- ROOM AUDIT EVENTS (drives system messages in chat)
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.room_audit_events (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id    uuid NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  actor_id   uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  category   public.room_audit_category NOT NULL,
  summary    text NOT NULL,
  payload    jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_room_audit_events_room ON public.room_audit_events(room_id, created_at DESC);

-- ---------------------------------------------------------------------
-- ROOM MESSAGES
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.room_messages (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id            uuid NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  user_id            uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  parent_message_id  uuid REFERENCES public.room_messages(id) ON DELETE CASCADE,
  type               public.room_message_type NOT NULL DEFAULT 'text',
  content            jsonb NOT NULL DEFAULT '{}'::jsonb,
  signal_id          uuid,
  audit_event_id     uuid REFERENCES public.room_audit_events(id) ON DELETE SET NULL,
  edited_at          timestamptz,
  deleted_for        public.room_message_delete_scope,
  deleted_at         timestamptz,
  deleted_by         uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_room_messages_room ON public.room_messages(room_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_room_messages_parent ON public.room_messages(parent_message_id);
CREATE INDEX IF NOT EXISTS idx_room_messages_signal ON public.room_messages(signal_id);

-- ---------------------------------------------------------------------
-- ROOM MESSAGE REACTIONS
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.room_message_reactions (
  message_id uuid NOT NULL REFERENCES public.room_messages(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  emoji      text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (message_id, user_id, emoji)
);

CREATE INDEX IF NOT EXISTS idx_message_reactions_message ON public.room_message_reactions(message_id);

-- ---------------------------------------------------------------------
-- ROOM MESSAGE DELIVERY (drives delivery indicators)
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.room_message_delivery (
  message_id uuid NOT NULL REFERENCES public.room_messages(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status     text NOT NULL CHECK (status IN ('sent', 'delivered', 'read')),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (message_id, user_id)
);

-- ---------------------------------------------------------------------
-- ROOM SIGNALS
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.room_signals (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id      uuid NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  provider_id  uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  symbol       text NOT NULL,
  side         text NOT NULL CHECK (side IN ('buy', 'sell')),
  entry        numeric(18, 6) NOT NULL,
  sl           numeric(18, 6),
  tps          jsonb NOT NULL DEFAULT '[]'::jsonb,
  status       public.room_signal_status NOT NULL DEFAULT 'active',
  pips         numeric(10, 2) NOT NULL DEFAULT 0,
  source       public.room_signal_source NOT NULL DEFAULT 'manual',
  notes        text,
  closed_at    timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_room_signals_room ON public.room_signals(room_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_room_signals_status ON public.room_signals(room_id, status);
CREATE INDEX IF NOT EXISTS idx_room_signals_provider ON public.room_signals(provider_id);

-- Multi-room signal posting
CREATE TABLE IF NOT EXISTS public.room_signal_links (
  signal_id uuid NOT NULL REFERENCES public.room_signals(id) ON DELETE CASCADE,
  room_id   uuid NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (signal_id, room_id)
);

-- ---------------------------------------------------------------------
-- ROOM SIGNAL UPDATES (TP/SL hit, edit, cancel)
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.room_signal_updates (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  signal_id  uuid NOT NULL REFERENCES public.room_signals(id) ON DELETE CASCADE,
  type       public.room_signal_update_type NOT NULL,
  value      jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_signal_updates_signal ON public.room_signal_updates(signal_id, created_at DESC);

-- ---------------------------------------------------------------------
-- ROOM ASSET REQUESTS
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.room_asset_requests (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id            uuid NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  requested_by       uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  asset              text NOT NULL,
  note               text,
  status             public.room_asset_request_status NOT NULL DEFAULT 'requested',
  assigned_to        uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  internal_notes     text,
  resolved_by        uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  resolved_signal_id uuid REFERENCES public.room_signals(id) ON DELETE SET NULL,
  resolved_at        timestamptz,
  created_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_asset_requests_room ON public.room_asset_requests(room_id, status);
CREATE INDEX IF NOT EXISTS idx_asset_requests_requester ON public.room_asset_requests(requested_by);

-- ---------------------------------------------------------------------
-- ROOM NOTIFICATION PREFS
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.room_notification_prefs (
  room_id    uuid NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  signals    boolean NOT NULL DEFAULT true,
  tp         boolean NOT NULL DEFAULT true,
  sl         boolean NOT NULL DEFAULT true,
  mentions   boolean NOT NULL DEFAULT true,
  chat       boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (room_id, user_id)
);

-- ---------------------------------------------------------------------
-- ROOM SUBSCRIPTIONS (Stripe-backed)
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.room_subscriptions (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id                  uuid NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  user_id                  uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  plan                     public.room_subscription_plan,
  stripe_subscription_id   text,
  stripe_customer_id       text,
  stripe_price_id          text,
  status                   public.room_subscription_status NOT NULL DEFAULT 'active',
  current_period_end       timestamptz,
  grace_until              timestamptz,
  created_at               timestamptz NOT NULL DEFAULT now(),
  canceled_at              timestamptz,
  UNIQUE(room_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_room_subs_user ON public.room_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_room_subs_stripe_sub ON public.room_subscriptions(stripe_subscription_id);

-- ---------------------------------------------------------------------
-- ROOM PRICING (per-room paid plan config managed by owner)
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.room_pricing (
  room_id              uuid PRIMARY KEY REFERENCES public.rooms(id) ON DELETE CASCADE,
  monthly_price_cents  integer,
  quarterly_price_cents integer,
  yearly_price_cents   integer,
  monthly_stripe_price_id text,
  quarterly_stripe_price_id text,
  yearly_stripe_price_id text,
  currency             text NOT NULL DEFAULT 'usd',
  discount_percent     integer DEFAULT 0 CHECK (discount_percent BETWEEN 0 AND 90),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- PROVIDER PAYOUTS (Stripe Connect)
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.provider_payouts (
  provider_id            uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  stripe_account_id      text UNIQUE,
  stripe_account_status  text,
  charges_enabled        boolean NOT NULL DEFAULT false,
  payouts_enabled        boolean NOT NULL DEFAULT false,
  details_submitted      boolean NOT NULL DEFAULT false,
  balance_cents          integer NOT NULL DEFAULT 0,
  last_payout_at         timestamptz,
  updated_at             timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- REPORTS / BLOCKS / SECURITY AUDIT
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.room_reports (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id            uuid NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  target_user_id     uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  target_message_id  uuid REFERENCES public.room_messages(id) ON DELETE SET NULL,
  reporter_id        uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  reason             text NOT NULL,
  status             text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'dismissed', 'actioned')),
  resolved_by        uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  resolved_at        timestamptz,
  created_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_room_reports_room ON public.room_reports(room_id);

CREATE TABLE IF NOT EXISTS public.room_blocks (
  room_id    uuid NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  blocker_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  blocked_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (room_id, blocker_id, blocked_id)
);

CREATE TABLE IF NOT EXISTS public.room_security_audit (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id    uuid REFERENCES public.rooms(id) ON DELETE SET NULL,
  actor_id   uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  event      text NOT NULL,
  payload    jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- TIMESTAMP TRIGGERS
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_rooms_updated_at ON public.rooms;
CREATE TRIGGER trg_rooms_updated_at BEFORE UPDATE ON public.rooms
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_room_signals_updated_at ON public.room_signals;
CREATE TRIGGER trg_room_signals_updated_at BEFORE UPDATE ON public.room_signals
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_room_pricing_updated_at ON public.room_pricing;
CREATE TRIGGER trg_room_pricing_updated_at BEFORE UPDATE ON public.room_pricing
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------
-- HELPER FUNCTIONS (security definer for safe use in policies)
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_room_active_member(_room_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.room_members
    WHERE room_id = _room_id
      AND user_id = _user_id
      AND status IN ('active', 'muted', 'timed_out')
  );
$$;

CREATE OR REPLACE FUNCTION public.is_room_member_any(_room_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.room_members
    WHERE room_id = _room_id AND user_id = _user_id
  );
$$;

CREATE OR REPLACE FUNCTION public.is_room_pending(_room_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.room_members
    WHERE room_id = _room_id AND user_id = _user_id AND status = 'pending'
  );
$$;

CREATE OR REPLACE FUNCTION public.room_user_role(_room_id uuid, _user_id uuid)
RETURNS public.room_role
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT role FROM public.room_members
  WHERE room_id = _room_id AND user_id = _user_id LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_room_staff(_room_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.room_members
    WHERE room_id = _room_id
      AND user_id = _user_id
      AND status = 'active'
      AND role IN ('owner', 'admin', 'provider')
  );
$$;

CREATE OR REPLACE FUNCTION public.is_room_owner(_room_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.room_members
    WHERE room_id = _room_id AND user_id = _user_id AND role = 'owner' AND status = 'active'
  );
$$;

CREATE OR REPLACE FUNCTION public.can_post_signal(_room_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.room_members
    WHERE room_id = _room_id AND user_id = _user_id
      AND status = 'active'
      AND role IN ('owner', 'provider')
  );
$$;

-- Pending members see only the latest N messages (no scrollback)
CREATE OR REPLACE FUNCTION public.pending_message_horizon(_room_id uuid, _user_id uuid, _limit int DEFAULT 30)
RETURNS timestamptz
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT created_at FROM public.room_messages
  WHERE room_id = _room_id
    AND deleted_for IS DISTINCT FROM 'all'
  ORDER BY created_at DESC
  OFFSET _limit LIMIT 1;
$$;

-- ---------------------------------------------------------------------
-- ENABLE RLS
-- ---------------------------------------------------------------------

ALTER TABLE public.rooms                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_members            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_invites            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_rules              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_audit_events       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_messages           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_message_reactions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_message_delivery   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_signals            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_signal_links       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_signal_updates     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_asset_requests     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_notification_prefs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_subscriptions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_pricing            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_payouts        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_reports            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_blocks             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_security_audit     ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------
-- POLICIES: rooms
-- Anyone authenticated can browse rooms (public + private discovery cards).
-- Only owner can update / delete.
-- Authenticated users can insert (becomes owner via service or trigger).
-- ---------------------------------------------------------------------

DROP POLICY IF EXISTS rooms_select ON public.rooms;
CREATE POLICY rooms_select ON public.rooms
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS rooms_insert ON public.rooms;
CREATE POLICY rooms_insert ON public.rooms
  FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS rooms_update ON public.rooms;
CREATE POLICY rooms_update ON public.rooms
  FOR UPDATE TO authenticated
  USING (public.is_room_owner(id, auth.uid()))
  WITH CHECK (public.is_room_owner(id, auth.uid()));

DROP POLICY IF EXISTS rooms_delete ON public.rooms;
CREATE POLICY rooms_delete ON public.rooms
  FOR DELETE TO authenticated
  USING (owner_id = auth.uid());

-- ---------------------------------------------------------------------
-- POLICIES: room_members
-- Members can read other members in their rooms.
-- Pending users can read staff.
-- Joining: user can insert their own row as 'pending' (private) or 'active' (public).
-- Staff can update status (approve/reject/mute/ban). Owner can update role.
-- ---------------------------------------------------------------------

DROP POLICY IF EXISTS room_members_select ON public.room_members;
CREATE POLICY room_members_select ON public.room_members
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_room_member_any(room_id, auth.uid())
  );

DROP POLICY IF EXISTS room_members_insert_self ON public.room_members;
CREATE POLICY room_members_insert_self ON public.room_members
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS room_members_update ON public.room_members;
CREATE POLICY room_members_update ON public.room_members
  FOR UPDATE TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_room_staff(room_id, auth.uid())
  )
  WITH CHECK (
    user_id = auth.uid()
    OR public.is_room_staff(room_id, auth.uid())
  );

DROP POLICY IF EXISTS room_members_delete ON public.room_members;
CREATE POLICY room_members_delete ON public.room_members
  FOR DELETE TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_room_staff(room_id, auth.uid())
  );

-- ---------------------------------------------------------------------
-- POLICIES: room_invites
-- Members of the room can read invites; staff can create/revoke.
-- ---------------------------------------------------------------------

DROP POLICY IF EXISTS room_invites_select ON public.room_invites;
CREATE POLICY room_invites_select ON public.room_invites
  FOR SELECT TO authenticated
  USING (public.is_room_active_member(room_id, auth.uid()));

DROP POLICY IF EXISTS room_invites_insert ON public.room_invites;
CREATE POLICY room_invites_insert ON public.room_invites
  FOR INSERT TO authenticated
  WITH CHECK (public.is_room_staff(room_id, auth.uid()));

DROP POLICY IF EXISTS room_invites_update ON public.room_invites;
CREATE POLICY room_invites_update ON public.room_invites
  FOR UPDATE TO authenticated
  USING (public.is_room_staff(room_id, auth.uid()))
  WITH CHECK (public.is_room_staff(room_id, auth.uid()));

DROP POLICY IF EXISTS room_invites_delete ON public.room_invites;
CREATE POLICY room_invites_delete ON public.room_invites
  FOR DELETE TO authenticated
  USING (public.is_room_staff(room_id, auth.uid()));

-- ---------------------------------------------------------------------
-- POLICIES: room_rules
-- ---------------------------------------------------------------------

DROP POLICY IF EXISTS room_rules_select ON public.room_rules;
CREATE POLICY room_rules_select ON public.room_rules
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS room_rules_upsert ON public.room_rules;
CREATE POLICY room_rules_upsert ON public.room_rules
  FOR ALL TO authenticated
  USING (public.is_room_owner(room_id, auth.uid()))
  WITH CHECK (public.is_room_owner(room_id, auth.uid()));

-- ---------------------------------------------------------------------
-- POLICIES: room_audit_events
-- Members read; system writes via triggers (security definer).
-- ---------------------------------------------------------------------

DROP POLICY IF EXISTS room_audit_select ON public.room_audit_events;
CREATE POLICY room_audit_select ON public.room_audit_events
  FOR SELECT TO authenticated
  USING (
    public.is_room_active_member(room_id, auth.uid())
    OR public.is_room_pending(room_id, auth.uid())
  );

DROP POLICY IF EXISTS room_audit_insert ON public.room_audit_events;
CREATE POLICY room_audit_insert ON public.room_audit_events
  FOR INSERT TO authenticated
  WITH CHECK (public.is_room_staff(room_id, auth.uid()));

-- ---------------------------------------------------------------------
-- POLICIES: room_messages
-- ---------------------------------------------------------------------

DROP POLICY IF EXISTS room_messages_select ON public.room_messages;
CREATE POLICY room_messages_select ON public.room_messages
  FOR SELECT TO authenticated
  USING (
    -- active member of this room: full access (excluding hard-deleted)
    (public.is_room_active_member(room_id, auth.uid())
     AND deleted_for IS DISTINCT FROM 'all')
    OR
    -- pending member: only latest N non-deleted messages (excluding signal type)
    (public.is_room_pending(room_id, auth.uid())
     AND deleted_for IS DISTINCT FROM 'all'
     AND type IN ('text', 'media', 'system')
     AND created_at >= COALESCE(public.pending_message_horizon(room_id, auth.uid(), 30), 'epoch'))
  );

DROP POLICY IF EXISTS room_messages_insert ON public.room_messages;
CREATE POLICY room_messages_insert ON public.room_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND public.is_room_active_member(room_id, auth.uid())
  );

DROP POLICY IF EXISTS room_messages_update ON public.room_messages;
CREATE POLICY room_messages_update ON public.room_messages
  FOR UPDATE TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_room_staff(room_id, auth.uid())
  )
  WITH CHECK (
    user_id = auth.uid()
    OR public.is_room_staff(room_id, auth.uid())
  );

-- ---------------------------------------------------------------------
-- POLICIES: room_message_reactions
-- ---------------------------------------------------------------------

DROP POLICY IF EXISTS reactions_select ON public.room_message_reactions;
CREATE POLICY reactions_select ON public.room_message_reactions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.room_messages m
      WHERE m.id = message_id
        AND (
          public.is_room_active_member(m.room_id, auth.uid())
          OR public.is_room_pending(m.room_id, auth.uid())
        )
    )
  );

DROP POLICY IF EXISTS reactions_insert ON public.room_message_reactions;
CREATE POLICY reactions_insert ON public.room_message_reactions
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.room_messages m
      WHERE m.id = message_id
        AND public.is_room_active_member(m.room_id, auth.uid())
    )
  );

DROP POLICY IF EXISTS reactions_delete ON public.room_message_reactions;
CREATE POLICY reactions_delete ON public.room_message_reactions
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- ---------------------------------------------------------------------
-- POLICIES: room_message_delivery
-- ---------------------------------------------------------------------

DROP POLICY IF EXISTS delivery_select ON public.room_message_delivery;
CREATE POLICY delivery_select ON public.room_message_delivery
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.room_messages m
      WHERE m.id = message_id
        AND m.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS delivery_upsert ON public.room_message_delivery;
CREATE POLICY delivery_upsert ON public.room_message_delivery
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ---------------------------------------------------------------------
-- POLICIES: room_signals
-- ---------------------------------------------------------------------

DROP POLICY IF EXISTS signals_select ON public.room_signals;
CREATE POLICY signals_select ON public.room_signals
  FOR SELECT TO authenticated
  USING (
    public.is_room_active_member(room_id, auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.room_signal_links l
      WHERE l.signal_id = room_signals.id
        AND public.is_room_active_member(l.room_id, auth.uid())
    )
  );

DROP POLICY IF EXISTS signals_insert ON public.room_signals;
CREATE POLICY signals_insert ON public.room_signals
  FOR INSERT TO authenticated
  WITH CHECK (
    provider_id = auth.uid()
    AND public.can_post_signal(room_id, auth.uid())
  );

DROP POLICY IF EXISTS signals_update ON public.room_signals;
CREATE POLICY signals_update ON public.room_signals
  FOR UPDATE TO authenticated
  USING (
    provider_id = auth.uid()
    OR public.is_room_owner(room_id, auth.uid())
  )
  WITH CHECK (
    provider_id = auth.uid()
    OR public.is_room_owner(room_id, auth.uid())
  );

-- ---------------------------------------------------------------------
-- POLICIES: room_signal_links
-- ---------------------------------------------------------------------

DROP POLICY IF EXISTS signal_links_select ON public.room_signal_links;
CREATE POLICY signal_links_select ON public.room_signal_links
  FOR SELECT TO authenticated
  USING (public.is_room_active_member(room_id, auth.uid()));

DROP POLICY IF EXISTS signal_links_insert ON public.room_signal_links;
CREATE POLICY signal_links_insert ON public.room_signal_links
  FOR INSERT TO authenticated
  WITH CHECK (
    public.can_post_signal(room_id, auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.room_signals s
      WHERE s.id = signal_id AND s.provider_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS signal_links_delete ON public.room_signal_links;
CREATE POLICY signal_links_delete ON public.room_signal_links
  FOR DELETE TO authenticated
  USING (public.is_room_owner(room_id, auth.uid()));

-- ---------------------------------------------------------------------
-- POLICIES: room_signal_updates
-- ---------------------------------------------------------------------

DROP POLICY IF EXISTS signal_updates_select ON public.room_signal_updates;
CREATE POLICY signal_updates_select ON public.room_signal_updates
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.room_signals s
      WHERE s.id = signal_id
        AND (
          public.is_room_active_member(s.room_id, auth.uid())
          OR EXISTS (
            SELECT 1 FROM public.room_signal_links l
            WHERE l.signal_id = s.id
              AND public.is_room_active_member(l.room_id, auth.uid())
          )
        )
    )
  );

DROP POLICY IF EXISTS signal_updates_insert ON public.room_signal_updates;
CREATE POLICY signal_updates_insert ON public.room_signal_updates
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.room_signals s
      WHERE s.id = signal_id
        AND (s.provider_id = auth.uid() OR public.is_room_owner(s.room_id, auth.uid()))
    )
  );

-- ---------------------------------------------------------------------
-- POLICIES: room_asset_requests
-- ---------------------------------------------------------------------

DROP POLICY IF EXISTS asset_req_select ON public.room_asset_requests;
CREATE POLICY asset_req_select ON public.room_asset_requests
  FOR SELECT TO authenticated
  USING (
    requested_by = auth.uid()
    OR public.is_room_staff(room_id, auth.uid())
  );

DROP POLICY IF EXISTS asset_req_insert ON public.room_asset_requests;
CREATE POLICY asset_req_insert ON public.room_asset_requests
  FOR INSERT TO authenticated
  WITH CHECK (
    requested_by = auth.uid()
    AND public.is_room_active_member(room_id, auth.uid())
  );

DROP POLICY IF EXISTS asset_req_update ON public.room_asset_requests;
CREATE POLICY asset_req_update ON public.room_asset_requests
  FOR UPDATE TO authenticated
  USING (public.is_room_staff(room_id, auth.uid()))
  WITH CHECK (public.is_room_staff(room_id, auth.uid()));

-- ---------------------------------------------------------------------
-- POLICIES: room_notification_prefs
-- ---------------------------------------------------------------------

DROP POLICY IF EXISTS notif_prefs_select ON public.room_notification_prefs;
CREATE POLICY notif_prefs_select ON public.room_notification_prefs
  FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS notif_prefs_upsert ON public.room_notification_prefs;
CREATE POLICY notif_prefs_upsert ON public.room_notification_prefs
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ---------------------------------------------------------------------
-- POLICIES: room_subscriptions
-- ---------------------------------------------------------------------

DROP POLICY IF EXISTS room_subs_select ON public.room_subscriptions;
CREATE POLICY room_subs_select ON public.room_subscriptions
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_room_owner(room_id, auth.uid())
  );

-- inserts/updates handled by edge functions (service role)

-- ---------------------------------------------------------------------
-- POLICIES: room_pricing
-- ---------------------------------------------------------------------

DROP POLICY IF EXISTS room_pricing_select ON public.room_pricing;
CREATE POLICY room_pricing_select ON public.room_pricing
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS room_pricing_upsert ON public.room_pricing;
CREATE POLICY room_pricing_upsert ON public.room_pricing
  FOR ALL TO authenticated
  USING (public.is_room_owner(room_id, auth.uid()))
  WITH CHECK (public.is_room_owner(room_id, auth.uid()));

-- ---------------------------------------------------------------------
-- POLICIES: provider_payouts
-- ---------------------------------------------------------------------

DROP POLICY IF EXISTS payouts_select ON public.provider_payouts;
CREATE POLICY payouts_select ON public.provider_payouts
  FOR SELECT TO authenticated USING (provider_id = auth.uid());

-- ---------------------------------------------------------------------
-- POLICIES: room_reports
-- ---------------------------------------------------------------------

DROP POLICY IF EXISTS reports_select ON public.room_reports;
CREATE POLICY reports_select ON public.room_reports
  FOR SELECT TO authenticated
  USING (
    reporter_id = auth.uid()
    OR public.is_room_staff(room_id, auth.uid())
  );

DROP POLICY IF EXISTS reports_insert ON public.room_reports;
CREATE POLICY reports_insert ON public.room_reports
  FOR INSERT TO authenticated
  WITH CHECK (
    reporter_id = auth.uid()
    AND public.is_room_active_member(room_id, auth.uid())
  );

DROP POLICY IF EXISTS reports_update ON public.room_reports;
CREATE POLICY reports_update ON public.room_reports
  FOR UPDATE TO authenticated
  USING (public.is_room_staff(room_id, auth.uid()))
  WITH CHECK (public.is_room_staff(room_id, auth.uid()));

-- ---------------------------------------------------------------------
-- POLICIES: room_blocks
-- ---------------------------------------------------------------------

DROP POLICY IF EXISTS blocks_select ON public.room_blocks;
CREATE POLICY blocks_select ON public.room_blocks
  FOR SELECT TO authenticated USING (blocker_id = auth.uid());

DROP POLICY IF EXISTS blocks_insert ON public.room_blocks;
CREATE POLICY blocks_insert ON public.room_blocks
  FOR INSERT TO authenticated WITH CHECK (blocker_id = auth.uid());

DROP POLICY IF EXISTS blocks_delete ON public.room_blocks;
CREATE POLICY blocks_delete ON public.room_blocks
  FOR DELETE TO authenticated USING (blocker_id = auth.uid());

-- ---------------------------------------------------------------------
-- POLICIES: room_security_audit (read by owner only; writes via service role)
-- ---------------------------------------------------------------------

DROP POLICY IF EXISTS sec_audit_select ON public.room_security_audit;
CREATE POLICY sec_audit_select ON public.room_security_audit
  FOR SELECT TO authenticated
  USING (room_id IS NOT NULL AND public.is_room_owner(room_id, auth.uid()));

-- ---------------------------------------------------------------------
-- TRIGGER: when a room is inserted, auto-create owner membership row
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.tg_room_after_insert_owner()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.room_members (room_id, user_id, role, status, joined_at, approved_at)
  VALUES (NEW.id, NEW.owner_id, 'owner', 'active', now(), now())
  ON CONFLICT DO NOTHING;

  -- Auto-generate code for private rooms if not set
  IF NEW.type = 'private' AND NEW.code IS NULL THEN
    UPDATE public.rooms SET code = public.generate_room_code() WHERE id = NEW.id AND code IS NULL;
  END IF;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_room_after_insert ON public.rooms;
CREATE TRIGGER trg_room_after_insert
AFTER INSERT ON public.rooms
FOR EACH ROW EXECUTE FUNCTION public.tg_room_after_insert_owner();

-- ---------------------------------------------------------------------
-- TRIGGER: writing to room_audit_events also creates a system message
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.tg_audit_to_system_message()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.room_messages (room_id, user_id, type, content, audit_event_id)
  VALUES (
    NEW.room_id,
    NULL,
    'system',
    jsonb_build_object('summary', NEW.summary, 'category', NEW.category, 'actor_id', NEW.actor_id),
    NEW.id
  );
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_audit_to_system_message ON public.room_audit_events;
CREATE TRIGGER trg_audit_to_system_message
AFTER INSERT ON public.room_audit_events
FOR EACH ROW EXECUTE FUNCTION public.tg_audit_to_system_message();

-- ---------------------------------------------------------------------
-- TRIGGER: when a signal is inserted, also insert a chat message of type 'signal'
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.tg_signal_to_message()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.room_messages (room_id, user_id, type, content, signal_id)
  VALUES (
    NEW.room_id,
    NEW.provider_id,
    'signal',
    jsonb_build_object(
      'symbol', NEW.symbol,
      'side', NEW.side,
      'entry', NEW.entry,
      'sl', NEW.sl,
      'tps', NEW.tps,
      'status', NEW.status
    ),
    NEW.id
  );
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_signal_to_message ON public.room_signals;
CREATE TRIGGER trg_signal_to_message
AFTER INSERT ON public.room_signals
FOR EACH ROW EXECUTE FUNCTION public.tg_signal_to_message();

-- ---------------------------------------------------------------------
-- TRIGGER: signal updates create a threaded message under the signal message
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.tg_signal_update_to_thread()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  parent_msg uuid;
  room uuid;
BEGIN
  SELECT m.id, m.room_id INTO parent_msg, room
  FROM public.room_messages m
  WHERE m.signal_id = NEW.signal_id AND m.type = 'signal'
  ORDER BY m.created_at ASC
  LIMIT 1;

  IF parent_msg IS NOT NULL THEN
    INSERT INTO public.room_messages (room_id, user_id, parent_message_id, type, content, signal_id)
    VALUES (
      room,
      NULL,
      parent_msg,
      'system',
      jsonb_build_object('signal_update_type', NEW.type, 'value', NEW.value),
      NEW.signal_id
    );
  END IF;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_signal_update_to_thread ON public.room_signal_updates;
CREATE TRIGGER trg_signal_update_to_thread
AFTER INSERT ON public.room_signal_updates
FOR EACH ROW EXECUTE FUNCTION public.tg_signal_update_to_thread();

-- ---------------------------------------------------------------------
-- VIEW: room_stats (aggregated stats used on cards)
-- ---------------------------------------------------------------------

CREATE OR REPLACE VIEW public.room_stats AS
SELECT
  r.id AS room_id,
  r.name,
  r.type,
  r.monetization,
  r.capacity,
  COUNT(DISTINCT m.user_id) FILTER (WHERE m.status = 'active') AS active_members,
  COUNT(DISTINCT s.id) AS total_signals,
  COUNT(DISTINCT s.id) FILTER (WHERE s.status = 'closed_win') AS wins,
  COUNT(DISTINCT s.id) FILTER (WHERE s.status = 'closed_loss') AS losses,
  COALESCE(SUM(s.pips) FILTER (WHERE s.pips > 0), 0) AS pips_gained,
  COALESCE(ABS(SUM(s.pips) FILTER (WHERE s.pips < 0)), 0) AS pips_lost,
  CASE
    WHEN (COUNT(DISTINCT s.id) FILTER (WHERE s.status IN ('closed_win', 'closed_loss'))) > 0
    THEN ROUND(
      (COUNT(DISTINCT s.id) FILTER (WHERE s.status = 'closed_win'))::numeric * 100.0
      / NULLIF(COUNT(DISTINCT s.id) FILTER (WHERE s.status IN ('closed_win', 'closed_loss')), 0),
      1
    )
    ELSE 0
  END AS win_rate,
  MAX(s.created_at) AS last_signal_at
FROM public.rooms r
LEFT JOIN public.room_members m ON m.room_id = r.id
LEFT JOIN public.room_signals s ON s.room_id = r.id
GROUP BY r.id, r.name, r.type, r.monetization, r.capacity;

GRANT SELECT ON public.room_stats TO anon, authenticated;

-- ---------------------------------------------------------------------
-- REALTIME: opt-in tables
-- ---------------------------------------------------------------------

DO $$ BEGIN
  PERFORM 1 FROM pg_publication WHERE pubname = 'supabase_realtime';
  IF FOUND THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.room_messages';
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.room_message_reactions';
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.room_signals';
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.room_signal_updates';
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.room_audit_events';
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.room_members';
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.room_message_delivery';
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.room_asset_requests';
  END IF;
EXCEPTION WHEN duplicate_object THEN null; WHEN others THEN null;
END $$;
