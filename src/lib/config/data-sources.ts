/**
 * CSV schema definitions for each external data source.
 * Used to validate uploaded files before processing.
 */

import type { CsvSchema, DataSourceConfig } from '@/lib/types/data-sources';
import { getMetricsPoweredBy } from '@/lib/utils/metric-source';

export const hubspotSchema: CsvSchema = {
  source: 'hubspot',
  // The HubSpot processor only rejects a row when Record ID is missing.
  // Every other field is optional and treated as null if absent.
  requiredColumns: [
    'Record ID',
  ],
  optionalColumns: [
    'Type',
    'Created at',
    'Case Status',
    'Primary Clinician',
    'Assigned Doctor',
    'Dashboard Unlocked',
    '"Dashboard Unlocked" Changed At',
    'Dashboard Unlocked Changed At',
    'Sex',
    'Age Range',
    'Add-ons',
    'Last Test Date',
    'Next Retest Date',
    'Email sequence triggered',
    'Last interaction > When',
    'Little Prick ID',
    'Patient ID',
    'Lead',
    'Lab Batch Tracking Number',
    'Health Story Complete',
  ],
  strippedColumns: [
    'Primary Email',
    'Email addresses',
    'Name > First',
    'Name > Last',
  ],
  canonicalColumns: [
    'hubspot_record_id',
    'record_type',
    'hubspot_created_at',
    'case_status',
    'primary_clinician',
    'assigned_doctor',
    'dashboard_unlocked',
    'dashboard_unlocked_at',
    'sex',
    'age_range',
    'add_ons',
    'last_test_date',
    'next_retest_date',
    'email_sequence_triggered',
    'last_interaction_at',
    'little_prick_id',
    'patient_id',
    'lead_status',
    'lab_batch_tracking_number',
    'health_story_complete',
  ],
};

export const stripeSchema: CsvSchema = {
  source: 'stripe',
  // Fivetran-shape Stripe export. No charge ID column (intentionally removed
  // at source). Dedup is handled by date-range-replace strategy keyed on `created`.
  // Required: CREATED, AMOUNT, STATUS — everything else optional.
  requiredColumns: [
    'CREATED',
    'AMOUNT',
    'STATUS',
  ],
  optionalColumns: [
    'AMOUNT_REFUNDED',
    'APPLICATION',
    'APPLICATION_FEE_AMOUNT',
    'CALCULATED_STATEMENT_DESCRIPTOR',
    'CAPTURED',
    'CURRENCY',
    'DESCRIPTION',
    'FAILURE_CODE',
    'FRAUD_DETAILS_USER_REPORT',
    'FRAUD_DETAILS_STRIPE_REPORT',
    'LIVEMODE',
    'METADATA',
    'OUTCOME_NETWORK_STATUS',
    'OUTCOME_RISK_LEVEL',
    'OUTCOME_SELLER_MESSAGE',
    'OUTCOME_TYPE',
    'PAID',
    'REFUNDED',
    'INVOICE_ID',
    '_FIVETRAN_SYNCED',
    'OUTCOME_NETWORK_DECLINE_CODE',
    'FAILURE_BALANCE_TRANSACTION_ID',
    'AMOUNT_CAPTURED',
  ],
  strippedColumns: [],
  canonicalColumns: [
    'amount',
    'amount_refunded',
    'application',
    'application_fee_amount',
    'calculated_statement_descriptor',
    'captured',
    'created',
    'currency',
    'description',
    'failure_code',
    'fraud_details_user_report',
    'fraud_details_stripe_report',
    'livemode',
    'metadata',
    'outcome_network_status',
    'outcome_risk_level',
    'outcome_seller_message',
    'outcome_type',
    'paid',
    'refunded',
    'status',
    'invoice_id',
    'fivetran_synced',
    'outcome_network_decline_code',
    'failure_balance_transaction_id',
    'amount_captured',
  ],
};

export const zendeskSchema: CsvSchema = {
  source: 'zendesk',
  // The Zendesk processor only rejects a row when ID is missing. Everything
  // else is optional and parsed into the canonical columns when present.
  requiredColumns: [
    'ID',
  ],
  optionalColumns: [
    'Created at',
    'Status',
    'Priority',
    'Assignee',
    'Group',
    'Subject',
    'Satisfaction Score',
    // First-reply time variants observed across Zendesk export configs:
    'First reply time in minutes',
    'First reply time (in minutes)',
    'First reply time (min)',
    'First reply time',
    // Full-resolution time variants:
    'Full resolution time in minutes within business hours',
    'Full resolution time in minutes',
    'Full resolution time (in minutes)',
    'Full resolution time (min)',
    'Full resolution time',
  ],
  strippedColumns: [
    'Requester',
    'Requester email',
    'Requester external id',
    'Organization',
    'Description',
  ],
  canonicalColumns: [
    'zendesk_ticket_id',
    'zendesk_created_at',
    'status',
    'priority',
    'assignee',
    'group_name',
    'subject',
    'first_reply_time_minutes',
    'full_resolution_time_minutes',
    'satisfaction_score',
  ],
};

export const tableauSchema: CsvSchema = {
  source: 'tableau',
  // The Tableau processor rejects a row only when Member Id OR Measure Names
  // is missing — those identify the row and the metric it carries.
  requiredColumns: [
    'Member Id',
    'Measure Names',
  ],
  optionalColumns: [
    'Measure Values',
    'Created At',
    'CASE_STATUS',
    'CASE_TYPE',
    'Person Type',
    'Initial Subscription Date',
    'First Purchase Date',
    'Dashboard Published At',
    'First Result Ready At',
  ],
  strippedColumns: [
    'Email',
  ],
  canonicalColumns: [
    'member_id',
    'measure_name',
    'measure_value',
    'case_status',
    'person_type',
    'event_date',
  ],
};

export const metaAdsSchema: CsvSchema = {
  source: 'meta_ads',
  // Daily aggregate paid Meta performance. One row per day for now.
  // When Campaign Name (OTW) lands, this becomes (date, campaign_name) composite.
  requiredColumns: [
    'Date',
    ['Spend ($)', 'Spend'],
  ],
  optionalColumns: [
    'Impressions',
    'CTR (%)',
    'Clicks',
    'Landing Page Views',
    'Cost per LPV ($)',
    'Conversions (Leads)',
    'Cost per Conversion ($)',
    'Video Views',
    'Post Engagements',
    // OTW: 'Campaign Name'
  ],
  strippedColumns: [],
  canonicalColumns: [
    'date',
    'spend',
    'impressions',
    'ctr',
    'clicks',
    'landing_page_views',
    'cost_per_lpv',
    'conversions_leads',
    'cost_per_conversion',
    'video_views',
    'post_engagements',
  ],
};

export const socialOrganicSchema: CsvSchema = {
  source: 'social_organic',
  // Accepts EITHER:
  //   - Followers sheet: Platform | Followers | Notes   (no date — uses upload date)
  //   - Views sheet:     Date | Platform | Page Views | Video Views | Post Engagements
  // The processor detects shape by column signature.
  // Required check just ensures Platform exists (true in both shapes).
  requiredColumns: [
    'Platform',
  ],
  optionalColumns: [
    'Date',
    'Followers',
    'Notes',
    'Page Views',
    'Video Views',
    'Post Engagements',
  ],
  strippedColumns: [],
  canonicalColumns: [
    'date',
    'platform',
    'metric_name',
    'metric_value',
    'notes',
  ],
};

export const pelagoniaSchema: CsvSchema = {
  source: 'pelagonia',
  // The Pelagonia processor accepts any one of Opportunity ID / Appointment
  // ID / Contact ID as the record-id source. Nothing else is hard-required —
  // the processor populates from whichever columns are present.
  requiredColumns: [
    ['Opportunity ID', 'Appointment ID', 'Contact ID'],
  ],
  optionalColumns: [
    'Opportunity ID',
    'Appointment ID',
    'Contact ID',
    'Stage',
    'Value',
    'Created At',
    'Won At',
    'Calls Booked',
    'Appointment Status',
    'Appointment Date',
    'Pipeline',
    'Pipeline Stage',
    'Status',
    'Calendar',
    'Calendar Name',
    'Source',
    'Owner',
    'Assigned User',
  ],
  strippedColumns: [],
  canonicalColumns: [
    'pelagonia_record_id',
    'record_type',
    'pelagonia_created_at',
    'appointment_date',
    'status',
    'pipeline_stage',
    'calendar_name',
    'source',
    'assigned_user',
    'value',
  ],
};

/**
 * All schemas indexed by source name for easy lookup.
 */
export const dataSourceSchemas: Record<string, CsvSchema> = {
  hubspot: hubspotSchema,
  stripe: stripeSchema,
  zendesk: zendeskSchema,
  tableau: tableauSchema,
  meta_ads: metaAdsSchema,
  social_organic: socialOrganicSchema,
  pelagonia: pelagoniaSchema,
};

/**
 * Get the schema for a given data source.
 */
export function getSchema(source: string): CsvSchema | undefined {
  return dataSourceSchemas[source];
}

/**
 * Case-insensitive header validation. Returns the list of required-column
 * descriptors that no header satisfies. A required column may be a single
 * name or an array of acceptable variants (any one variant matching the
 * headers satisfies the requirement). Both sides are lowercased + trimmed
 * before compare — same pattern the processors use for their lc lookup.
 */
export function validateRequiredColumns(
  schema: CsvSchema,
  headers: string[]
): string[] {
  const norm = headers.map(h => h.toLowerCase().trim());
  const missing: string[] = [];
  for (const req of schema.requiredColumns) {
    const variants = Array.isArray(req) ? req : [req];
    const found = variants.some(v => norm.includes(v.toLowerCase().trim()));
    if (!found) missing.push(variants[0]);
  }
  return missing;
}

/**
 * Per-source configuration including export steps and powered metrics.
 */
export const dataSourceConfigs: Record<string, DataSourceConfig> = {
  tableau: {
    name: 'Tableau',
    exportSteps: [
      'Open the Oracle Pipeline Tableau workbook (link to be confirmed with Mark).',
      "Navigate to the 'Member Pipeline' sheet.",
      'Click Worksheet → Export → Data.',
      "In the export dialog choose 'Comma-Separated Values' or 'Microsoft Excel'.",
      'Confirm the export includes: Member Id, Email, Created At, Measure Names, Measure Values, plus optional columns for case status, person type, and dates.',
      'Save the file with a clear name e.g. tableau-export-2026-05-12.csv.',
      'Drop the file into the upload zone below.',
    ],
    poweredMetrics: getMetricsPoweredBy('tableau'),
  },
  hubspot: {
    name: 'HubSpot',
    exportSteps: [
      'Log in to HubSpot at app.hubspot.com.',
      'In the top navigation click Contacts → Contacts.',
      'Top-right click Actions → Export contacts.',
      'Tick these properties: Record ID, Type, Created at, Primary Email, Case Status, Primary Clinician, Assigned Doctor, Dashboard Unlocked, \'"Dashboard Unlocked" Changed At\', Sex, Age Range, Add-ons, Last Test Date, Next Retest Date, Email sequence triggered, Last interaction > When, Little Prick ID, Patient ID, Lead, Lab Batch Tracking Number, Name > First, Name > Last.',
      'Choose CSV as the file format.',
      'Click Export and wait for the download email (1–3 minutes).',
      'Drop the downloaded file into the upload zone below.',
    ],
    poweredMetrics: getMetricsPoweredBy('hubspot'),
  },
  stripe: {
    name: 'Stripe',
    exportSteps: [
      'Export Stripe charges from your Fivetran-managed pipeline.',
      'Required columns: CREATED, AMOUNT, STATUS.',
      'Optional but recommended: AMOUNT_REFUNDED, INVOICE_ID, OUTCOME_TYPE, OUTCOME_NETWORK_STATUS, CURRENCY, CAPTURED, PAID, REFUNDED, _FIVETRAN_SYNCED, AMOUNT_CAPTURED.',
      'NOTE: amounts are in cents (Fivetran/API representation), not dollars.',
      'Drop the CSV into the Stripe upload zone.',
    ],
    poweredMetrics: getMetricsPoweredBy('stripe'),
  },
  zendesk: {
    name: 'Zendesk',
    exportSteps: [
      'Log in to your Zendesk account.',
      'Click the Zendesk Products icon → Explore.',
      'Open the Zendesk Support dataset → Tickets report.',
      'Ensure the report includes: ID, Status, Priority, Via, Ticket type, Created at, Updated at, Solved at, Assignee, Group, Tags, Satisfaction Score, First reply time in minutes, First reply time in minutes within business hours, First resolution time in minutes, Full resolution time in minutes within business hours, Requester wait time in minutes within business hours, Reopens, Replies, Assignee stations, Group stations.',
      'Set the date filter to the period you are uploading.',
      'Click the export icon → Export as Excel.',
      'Drop the downloaded .xlsx file into the upload zone below.',
    ],
    poweredMetrics: getMetricsPoweredBy('zendesk'),
  },
  meta_ads: {
    name: 'Meta Ads',
    exportSteps: [
      'Open the TMRW_MARKETING_DATA workbook.',
      'Locate the "Meta Ads" sheet — one row per day with daily aggregate ad performance.',
      'Save just that sheet as CSV or XLSX (File → Save As → select sheet only).',
      'Drop the file into the Meta Ads upload zone.',
      'Required columns: Date, Spend ($). Optional: Impressions, CTR (%), Clicks, Landing Page Views, Cost per LPV ($), Conversions (Leads), Cost per Conversion ($), Video Views, Post Engagements.',
    ],
    poweredMetrics: getMetricsPoweredBy('meta_ads'),
  },
  social_organic: {
    name: 'Social Organic',
    exportSteps: [
      'Open the TMRW_MARKETING_DATA workbook.',
      'Two sheets feed this source — upload them one at a time:',
      '  • "Social Media Followers" — Platform, Followers, Notes (uploaded date used as snapshot date).',
      '  • "Social Media Views"     — Date, Platform, Page Views, Video Views, Post Engagements.',
      'Save the sheet as CSV or XLSX, then drop into the Social Organic upload zone.',
    ],
    poweredMetrics: getMetricsPoweredBy('social_organic'),
  },
  pelagonia: {
    name: 'Pelagonia (GoHighLevel)',
    exportSteps: [
      'Log in to your GoHighLevel account.',
      'Navigate to CRM → Pipelines (or Opportunities).',
      'Select the relevant pipeline for TMRW.',
      'Click the Export icon or use the bulk export option.',
      'Ensure the export includes: Opportunity ID, Stage, Value, Contact ID, Created At, plus optional fields Won At, Calls Booked, Appointment Status.',
      'Save as CSV.',
      'Drop the file into the upload zone below.',
    ],
    poweredMetrics: getMetricsPoweredBy('pelagonia'),
  },
};
