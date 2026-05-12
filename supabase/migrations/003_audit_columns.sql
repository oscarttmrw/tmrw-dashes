-- Add audit / metadata columns to upload_log
-- Run this in Supabase SQL Editor if not already applied.

ALTER TABLE upload_log
  ADD COLUMN IF NOT EXISTS uploaded_by       TEXT,
  ADD COLUMN IF NOT EXISTS data_period_from  DATE,
  ADD COLUMN IF NOT EXISTS data_period_to    DATE,
  ADD COLUMN IF NOT EXISTS data_period_label TEXT,
  ADD COLUMN IF NOT EXISTS file_name         TEXT;
