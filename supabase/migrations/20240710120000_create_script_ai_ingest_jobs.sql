CREATE TABLE IF NOT EXISTS public.script_ai_ingest_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  script_id uuid NOT NULL REFERENCES public.scripts (id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'succeeded', 'failed')),
  model text NULL,
  prompt_tokens integer NULL,
  completion_tokens integer NULL,
  error_message text NULL,
  raw_response jsonb NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS script_ai_ingest_jobs_script_idx ON public.script_ai_ingest_jobs (script_id);

ALTER TABLE public.script_ai_ingest_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "writer_can_manage_own_ai_ingest_jobs"
  ON public.script_ai_ingest_jobs
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.scripts s
      WHERE s.id = script_id
        AND s.primary_owner_id = auth.uid()
    )
  );
