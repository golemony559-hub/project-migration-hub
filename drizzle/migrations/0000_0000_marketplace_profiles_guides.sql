CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL DEFAULT 'New member',
  bio text NOT NULL DEFAULT '',
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.profiles TO anon;
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles are publicly readable" ON public.profiles FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Users can create their own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE TABLE public.guides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  summary text NOT NULL,
  description text NOT NULL DEFAULT '',
  category text NOT NULL,
  format text NOT NULL DEFAULT 'Guide' CHECK (format IN ('Ebook', 'Guide', 'Playbook', 'Checklist', 'Template')),
  reading_time_minutes integer CHECK (reading_time_minutes IS NULL OR reading_time_minutes > 0),
  price_cents integer NOT NULL DEFAULT 0 CHECK (price_cents >= 0),
  currency_code text NOT NULL DEFAULT 'USD' CHECK (currency_code ~ '^[A-Z]{3}$'),
  file_path text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT published_guides_require_file CHECK (status <> 'published' OR file_path IS NOT NULL)
);
GRANT SELECT ON public.guides TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.guides TO authenticated;
GRANT ALL ON public.guides TO service_role;
ALTER TABLE public.guides ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Published guides are public" ON public.guides FOR SELECT TO anon, authenticated USING (status = 'published');
CREATE POLICY "Creators can read their own guides" ON public.guides FOR SELECT TO authenticated USING (auth.uid() = creator_id);
CREATE POLICY "Creators can add their own guides" ON public.guides FOR INSERT TO authenticated WITH CHECK (auth.uid() = creator_id);
CREATE POLICY "Creators can update their own guides" ON public.guides FOR UPDATE TO authenticated USING (auth.uid() = creator_id) WITH CHECK (auth.uid() = creator_id);
CREATE POLICY "Creators can delete their own guides" ON public.guides FOR DELETE TO authenticated USING (auth.uid() = creator_id);
CREATE INDEX guides_published_created_idx ON public.guides (created_at DESC) WHERE status = 'published';
CREATE INDEX guides_creator_created_idx ON public.guides (creator_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (
    NEW.id,
    COALESCE(NULLIF(NEW.raw_user_meta_data ->> 'full_name', ''), NULLIF(NEW.raw_user_meta_data ->> 'name', ''), 'New member')
  );
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created_profile
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_profile();

CREATE POLICY "Creators can read their private guide files" ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'creator-guides' AND split_part(name, '/', 1) = auth.uid()::text);
CREATE POLICY "Creators can upload their private guide files" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'creator-guides' AND split_part(name, '/', 1) = auth.uid()::text);
CREATE POLICY "Creators can update their private guide files" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'creator-guides' AND split_part(name, '/', 1) = auth.uid()::text)
WITH CHECK (bucket_id = 'creator-guides' AND split_part(name, '/', 1) = auth.uid()::text);
CREATE POLICY "Creators can delete their private guide files" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'creator-guides' AND split_part(name, '/', 1) = auth.uid()::text);
