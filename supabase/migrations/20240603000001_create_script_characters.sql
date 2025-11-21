CREATE TABLE IF NOT EXISTS public.script_characters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  script_id uuid NOT NULL REFERENCES public.scripts (id) ON DELETE CASCADE,
  name text NOT NULL,
  role text NOT NULL,
  genders text[] NOT NULL DEFAULT '{}',
  races text[] NOT NULL DEFAULT '{}',
  start_age int NULL,
  end_age int NULL,
  any_age boolean NOT NULL DEFAULT true,
  description text NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.script_characters ENABLE ROW LEVEL SECURITY;

-- Owner tüm işlemleri yapabilsin
CREATE POLICY "writer_can_manage_own_characters"
  ON public.script_characters
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.scripts s
      WHERE s.id = script_id
        AND s.primary_owner_id = auth.uid()
    )
  );
