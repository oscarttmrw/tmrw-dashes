-- Upload log: one row per CSV upload, stores processed JSON data
CREATE TABLE IF NOT EXISTS public.upload_log (
  id            UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  source        TEXT        NOT NULL CHECK (source IN ('tableau', 'hubspot', 'stripe', 'zendesk', 'priorities')),
  uploaded_at   TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  record_count  INTEGER     DEFAULT 0,
  strategy      TEXT        NOT NULL DEFAULT 'full-replace',
  uploaded_by   UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  data          JSONB       NOT NULL DEFAULT '[]'::jsonb
);

CREATE INDEX IF NOT EXISTS upload_log_source_uploaded_at_idx
  ON public.upload_log (source, uploaded_at DESC);

-- Row-level security
ALTER TABLE public.upload_log ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read all uploads
CREATE POLICY "Authenticated users can read upload_log"
  ON public.upload_log FOR SELECT
  TO authenticated
  USING (true);

-- Authenticated users can insert their own uploads
CREATE POLICY "Authenticated users can insert upload_log"
  ON public.upload_log FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = uploaded_by);

-- Service role bypasses RLS automatically
