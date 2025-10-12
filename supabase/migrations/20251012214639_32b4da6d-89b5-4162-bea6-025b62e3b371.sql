-- =============================================
-- FIX: Standardize user_type_enum from 'member' to 'user'
-- =============================================

-- Step 1: Drop trigger and policies
DROP TRIGGER IF EXISTS trg_sync_public_profiles_insupd ON public.profiles;
DROP POLICY IF EXISTS "Educators can create live sessions" ON public.live_sessions;
DROP POLICY IF EXISTS "Educators can delete their own live sessions" ON public.live_sessions;
DROP POLICY IF EXISTS "Educators can manage their own live sessions" ON public.live_sessions;
DROP POLICY IF EXISTS "Educators can manage their own course modules" ON public.course_modules;
DROP POLICY IF EXISTS "Admins can manage all course modules" ON public.course_modules;
DROP POLICY IF EXISTS "Educators can manage their own module videos" ON public.module_videos;
DROP POLICY IF EXISTS "Admins can manage all module videos" ON public.module_videos;
DROP POLICY IF EXISTS "Anyone can view educator and admin trade alerts" ON public.trade_alerts;
DROP POLICY IF EXISTS "Educators and admins can create trade alerts" ON public.trade_alerts;
DROP POLICY IF EXISTS "Educators can manage their own videos" ON public.videos;
DROP POLICY IF EXISTS "Admins can manage all videos" ON public.videos;

-- Step 2: Convert BOTH tables to text
ALTER TABLE public.profiles ALTER COLUMN user_type TYPE text;
ALTER TABLE public.public_profiles ALTER COLUMN user_type TYPE text;

-- Step 3: Update data in BOTH tables
UPDATE public.profiles SET user_type = 'user' WHERE user_type = 'member';
UPDATE public.public_profiles SET user_type = 'user' WHERE user_type = 'member';

-- Step 4: Drop old enum and create new one
DROP TYPE IF EXISTS user_type_enum CASCADE;
CREATE TYPE user_type_enum AS ENUM ('user', 'educator', 'admin');

-- Step 5: Convert BOTH tables back to enum
ALTER TABLE public.profiles ALTER COLUMN user_type TYPE user_type_enum USING user_type::user_type_enum;
ALTER TABLE public.public_profiles ALTER COLUMN user_type TYPE user_type_enum USING user_type::user_type_enum;

-- Step 6: Recreate trigger
CREATE TRIGGER trg_sync_public_profiles_insupd AFTER INSERT OR UPDATE OF display_name, real_name, role, avatar_url, user_type, access_level, community_tier, trader_level, account_status ON public.profiles FOR EACH ROW EXECUTE FUNCTION sync_public_profiles();

-- Step 7: Recreate policies
CREATE POLICY "Educators can create live sessions" ON public.live_sessions FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND (profiles.user_type = 'educator'::user_type_enum OR profiles.access_level = ANY (ARRAY['admin'::access_level_enum, 'moderator'::access_level_enum]))));
CREATE POLICY "Educators can delete their own live sessions" ON public.live_sessions FOR DELETE USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND (profiles.user_type = 'educator'::user_type_enum OR profiles.access_level = ANY (ARRAY['admin'::access_level_enum, 'moderator'::access_level_enum]))));
CREATE POLICY "Educators can manage their own live sessions" ON public.live_sessions FOR UPDATE USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND (profiles.user_type = 'educator'::user_type_enum OR profiles.access_level = ANY (ARRAY['admin'::access_level_enum, 'moderator'::access_level_enum]))));
CREATE POLICY "Educators can manage their own course modules" ON public.course_modules FOR ALL USING ((created_by = auth.uid()) AND (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND (profiles.user_type = 'educator'::user_type_enum OR profiles.access_level = ANY (ARRAY['admin'::access_level_enum, 'moderator'::access_level_enum])))));
CREATE POLICY "Admins can manage all course modules" ON public.course_modules FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.access_level = 'admin'::access_level_enum));
CREATE POLICY "Educators can manage their own module videos" ON public.module_videos FOR ALL USING ((EXISTS (SELECT 1 FROM course_modules WHERE course_modules.id = module_videos.module_id AND course_modules.created_by = auth.uid())) AND (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND (profiles.user_type = 'educator'::user_type_enum OR profiles.access_level = ANY (ARRAY['admin'::access_level_enum, 'moderator'::access_level_enum])))));
CREATE POLICY "Admins can manage all module videos" ON public.module_videos FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.access_level = 'admin'::access_level_enum));
CREATE POLICY "Anyone can view educator and admin trade alerts" ON public.trade_alerts FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = trade_alerts.user_id AND profiles.user_type = ANY (ARRAY['educator'::user_type_enum, 'admin'::user_type_enum])));
CREATE POLICY "Educators and admins can create trade alerts" ON public.trade_alerts FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND (profiles.user_type = ANY (ARRAY['educator'::user_type_enum, 'admin'::user_type_enum]) OR profiles.access_level = ANY (ARRAY['admin'::access_level_enum, 'moderator'::access_level_enum]))));
CREATE POLICY "Educators can manage their own videos" ON public.videos FOR ALL USING ((created_by = auth.uid()) AND (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND (profiles.user_type = 'educator'::user_type_enum OR profiles.access_level = ANY (ARRAY['admin'::access_level_enum, 'moderator'::access_level_enum])))));
CREATE POLICY "Admins can manage all videos" ON public.videos FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.access_level = 'admin'::access_level_enum));

-- Step 8: Update handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE computed_role text; computed_user_type user_type_enum; computed_access_level access_level_enum;
BEGIN
  computed_role := CASE WHEN NEW.raw_user_meta_data->>'access_level' = 'admin' THEN 'admin' WHEN NEW.raw_user_meta_data->>'role' = 'admin' THEN 'admin' WHEN NEW.raw_user_meta_data->>'role' = 'educator' THEN 'educator' WHEN NEW.raw_user_meta_data->>'role' = 'user' THEN 'user' ELSE 'user' END;
  computed_user_type := CASE WHEN NEW.raw_user_meta_data->>'user_type' = 'admin' THEN 'admin'::user_type_enum WHEN NEW.raw_user_meta_data->>'user_type' = 'educator' THEN 'educator'::user_type_enum WHEN NEW.raw_user_meta_data->>'account_type' = 'educator' THEN 'educator'::user_type_enum WHEN NEW.raw_user_meta_data->>'account_type' = 'user' THEN 'user'::user_type_enum ELSE 'user'::user_type_enum END;
  computed_access_level := CASE WHEN NEW.raw_user_meta_data->>'access_level' = 'admin' THEN 'admin'::access_level_enum WHEN NEW.raw_user_meta_data->>'role' = 'admin' THEN 'admin'::access_level_enum WHEN NEW.raw_user_meta_data->>'access_level' = 'moderator' THEN 'moderator'::access_level_enum WHEN NEW.raw_user_meta_data->>'role' = 'educator' THEN 'moderator'::access_level_enum WHEN NEW.raw_user_meta_data->>'account_type' = 'educator' THEN 'moderator'::access_level_enum WHEN NEW.raw_user_meta_data->>'access_level' = 'user' THEN 'user'::access_level_enum ELSE 'user'::access_level_enum END;
  INSERT INTO public.profiles (id, real_name, display_name, role, user_type, access_level, account_status, registration_source, phone_number) VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', NEW.email, 'User'), NULL, computed_role, computed_user_type, computed_access_level, COALESCE((NEW.raw_user_meta_data->>'account_status')::account_status_enum, 'active'::account_status_enum), COALESCE((NEW.raw_user_meta_data->>'registration_source')::registration_source_enum, 'direct'::registration_source_enum), NEW.raw_user_meta_data->>'phone_number');
  RETURN NEW;
END;
$function$;