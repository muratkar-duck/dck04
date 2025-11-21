ALTER TABLE public.scripts
  ADD COLUMN IF NOT EXISTS genres text[] NULL,
  ADD COLUMN IF NOT EXISTS tags text[] NULL,
  ADD COLUMN IF NOT EXISTS eras text[] NULL,
  ADD COLUMN IF NOT EXISTS locations text[] NULL,
  ADD COLUMN IF NOT EXISTS content_warnings text[] NULL;
