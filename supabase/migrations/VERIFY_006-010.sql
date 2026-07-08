-- ============================================================================
-- VERIFY_006-010.sql — post-migration checks (read-only)
-- Run in the Supabase SQL Editor AFTER applying APPLY_006-010.sql.
-- Every row should show pass = true. If any row is false, that migration
-- did not land as expected.
-- ============================================================================
with checks as (
  select 1 as ord,
         'product_category_map seeded (008)'                 as check_name,
         '51'                                                as expected,
         (select count(*)::text from product_category_map)   as actual
  union all
  select 2,
         'plan_targets.ltv_assumed exists (006)',
         '1',
         (select count(*)::text from information_schema.columns
            where table_name = 'plan_targets' and column_name = 'ltv_assumed')
  union all
  select 3,
         'zendesk_data typed rebuild — channel col (009)',
         '1',
         (select count(*)::text from information_schema.columns
            where table_name = 'zendesk_data' and column_name = 'channel')
  union all
  select 4,
         'hubspot milestone cols present (010)',
         '3',
         (select count(*)::text from information_schema.columns
            where table_name = 'hubspot_contacts'
              and column_name in ('hubspot_record_id',
                                  'escript_sent_at',
                                  'retest_dashboard_published_date'))
  union all
  select 5,
         'organisations dropped (007)',
         'null',
         coalesce(to_regclass('public.organisations')::text, 'null')
  union all
  select 6,
         'countries dropped (007)',
         'null',
         coalesce(to_regclass('public.countries')::text, 'null')
)
select check_name,
       expected,
       actual,
       (actual = expected) as pass
from checks
order by ord;
