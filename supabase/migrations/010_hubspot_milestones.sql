-- 010_hubspot_milestones.sql
-- Add the member-journey milestone fields from Dan's new HubSpot CRM export
-- ("prove it works" dataset). hubspot_contacts is a full-replace source, so
-- adding columns is additive — existing rows read null until the next upload.
--
-- Notes:
--   * escript_sent_at is a DATE (the export now carries "eScript Sent At"),
--     kept alongside the legacy boolean escript_sent for back-compat.
--   * hubspot_record_id stores the export's "Record ID" — a stable member key
--     for later linking (e.g. CSAT → member).

alter table hubspot_contacts
  add column if not exists hubspot_record_id                 text,
  add column if not exists escript_sent_at                   timestamptz,
  add column if not exists blood_requisition_sent_date       timestamptz,
  add column if not exists blood_dashboard_published_date    timestamptz,
  add column if not exists xp_shipped_date                   timestamptz,
  add column if not exists epi_results_received_date         timestamptz,
  add column if not exists pp_shipped_date                   timestamptz,
  add column if not exists medical_plan_sent_at              timestamptz,
  add column if not exists retest_blood_requisition_sent_date timestamptz,
  add column if not exists retest_blood_results_received_date timestamptz,
  add column if not exists retest_epi_results_back_date      timestamptz,
  add column if not exists retest_dashboard_published_date   timestamptz;
