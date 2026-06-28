-- 007_drop_legacy_tables.sql
-- Remove tables that no migration and no application code reference. Confirmed
-- empty (0 rows) and unrecognised — leftover experiments, not part of this app.
drop table if exists organisations;
drop table if exists countries;
