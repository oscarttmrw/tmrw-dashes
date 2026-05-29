/**
 * CSV schema definitions for each external data source.
 * Used to validate uploaded files before processing.
 */

import type { CsvSchema, DataSourceConfig, RequiredColumn } from '@/lib/types/data-sources';
import { getMetricsPoweredBy } from '@/lib/utils/metric-source';

export const hubspotContactsSchema: CsvSchema = {
  source: 'hubspot_contacts',
  // The HubSpot Contacts processor only rejects a row when Lifecycle Stage is
  // blank. Every other field is optional and treated as null if absent. The
  // export ships with ~434 columns; only ~31 are mapped, the rest are ignored.
  requiredColumns: [
    'Lifecycle Stage',
  ],
  optionalColumns: [
    'Customer Type',
    'Date entered "Customer (Lifecycle Stage Pipeline)"',
    'Close Date',
    'Create Date',
    'Membership Status',
    'Membership Start Date',
    'Churn Date',
    'Churn Reason',
    'Cancel at Period End',
    'Stripe Subscription ID',
    'Subscription Type',
    'Subscription Renewal Date',
    'Oracle Member ID',
    'escript sent to member',
    'Health Story Status',
    'Health Story Completed Date',
    'Customised Pods Sent',
    'CP Order Date',
    'CP Shipped Date',
    'Personalised Pods Shipped',
    'Blood Results (Full) Received in BP',
    'Blood Draw Date',
    'Blood Dashboard Published',
    'Clinician Review Ready Date',
    'Results Available Date',
    'Results Extracted to Oracle',
    'Epigenetics Dashboard Unlocked',
    'Epigenetics Dashboard Unlocked Date',
    'Dashboard Unlocked',
    'Dashboard Unlocked Date',
    'Last Activity Date',
    'Last Test Date',
  ],
  strippedColumns: [
    'Primary Email',
    'Email addresses',
    'Name > First',
    'Name > Last',
    'Phone Number',
    'Mobile Phone Number',
  ],
  canonicalColumns: [
    'lifecycle_stage',
    'customer_type',
    'customer_entered_at',
    'close_date',
    'create_date',
    'membership_status',
    'membership_start_date',
    'churn_date',
    'churn_reason',
    'cancel_at_period_end',
    'stripe_subscription_id',
    'subscription_type',
    'subscription_renewal_date',
    'oracle_member_id',
    'escript_sent',
    'health_story_status',
    'health_story_completed_date',
    'customised_pods_sent',
    'cp_order_date',
    'cp_shipped_date',
    'personalised_pods_shipped',
    'blood_results_received',
    'blood_draw_date',
    'blood_dashboard_published',
    'clinician_review_ready_date',
    'results_available_date',
    'results_extracted_to_oracle',
    'epigenetics_dashboard_unlocked',
    'epigenetics_dashboard_unlocked_date',
    'dashboard_unlocked',
    'dashboard_unlocked_date',
    'last_activity_date',
    'last_test_date',
  ],
};

export const ghlOpportunitiesSchema: CsvSchema = {
  source: 'ghl_opportunities',
  // GHL Opportunity export — dedup by Opportunity ID.
  requiredColumns: [
    'Opportunity ID',
    'pipeline',
    'stage',
    'status',
  ],
  optionalColumns: [
    'Contact ID',
    'Pipeline ID',
    'Pipeline Stage ID',
    'source',
    'Lead Value',
    'assigned',
    'Created on',
    'Updated on',
    'lost reason ID',
    'lost reason name',
    'Days since last stage change',
    'Days since last status change',
    'Days since last update',
  ],
  strippedColumns: [],
  canonicalColumns: [
    'opportunity_id',
    'contact_id',
    'pipeline',
    'pipeline_id',
    'stage',
    'pipeline_stage_id',
    'status',
    'source',
    'lead_value',
    'assigned',
    'created_on',
    'updated_on',
    'lost_reason_id',
    'lost_reason_name',
    'days_since_last_stage_change',
    'days_since_last_status_change',
    'days_since_last_update',
  ],
};

export const operationalDataSchema: CsvSchema = {
  source: 'operational_data',
  // Single sheet (xlsx) keyed on `date` (Excel serial). Upsert by date.
  requiredColumns: [
    'date',
    'customers_registered',
    'total_casebook',
  ],
  optionalColumns: [
    'pod_created',
    'pod_dispatched',
    'Churned members',
  ],
  strippedColumns: [],
  canonicalColumns: [
    'date',
    'customers_registered',
    'total_casebook',
    'pod_created',
    'pod_dispatched',
    'churned_members',
  ],
};

export const stripeSchema: CsvSchema = {
  source: 'stripe',
  // Stripe Invoice CSV export. Required columns are distinctive Invoice-only
  // fields so detection cannot collide with Charges-style exports or any other
  // CSV that has a bare "Status" column.
  requiredColumns: [
    ['ID', 'id'],
    ['CREATED', 'created'],
    ['AMOUNT_PAID', 'amount_paid'],
    ['BILLING_REASON', 'billing_reason'],
    ['SUBSCRIPTION_ID', 'subscription_id'],
  ],
  optionalColumns: [
    'EFFECTIVE_AT',
    'PERIOD_START',
    'PERIOD_END',
    'PRODUCT',
    'AMOUNT_DUE',
    'AMOUNT_REMAINING',
    'TOTAL',
    'TOTAL_EXCLUDING_TAX',
    'SUBTOTAL',
    'SUBTOTAL_EXCLUDING_TAX',
    'RECEIPT_NUMBER',
  ],
  strippedColumns: [
    'CUSTOMER_EMAIL',
    'CUSTOMER_NAME',
  ],
  canonicalColumns: [
    'stripe_invoice_id',
    'created',
    'effective_at',
    'period_start',
    'period_end',
    'product',
    'amount_due',
    'amount_paid',
    'amount_remaining',
    'total',
    'total_excluding_tax',
    'subtotal',
    'subtotal_excluding_tax',
    'subscription_id',
    'billing_reason',
    'receipt_number',
  ],
};

export const zendeskSchema: CsvSchema = {
  source: 'zendesk',
  // Distinctive Zendesk columns are required so detection doesn't collide
  // with any other CSV that has a bare "Status" / "ID" pair. The processor
  // itself still only rejects a row when the ticket id is blank.
  requiredColumns: [
    ['Ticket ID', 'ID', 'Zendesk Ticket ID'],
    ['Status', 'status'],
    ['Satisfaction Score', 'satisfaction_score'],
    [
      'First reply time in minutes',
      'First reply time (in minutes)',
      'First reply time (min)',
      'First reply time',
    ],
    [
      'Full resolution time in minutes within business hours',
      'Full resolution time in minutes',
      'Full resolution time (in minutes)',
      'Full resolution time (min)',
      'Full resolution time',
    ],
  ],
  optionalColumns: [
    'Created at',
    'Priority',
    'Assignee',
    'Group',
    'Subject',
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
  // TMRW_MARKETING workbook → Meta Ads sheet. Daily aggregate. One row per day.
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

export const socialFollowersSchema: CsvSchema = {
  source: 'social_followers',
  // TMRW_MARKETING workbook → Social Followers sheet.
  // No Date column — processor stamps with upload date.
  requiredColumns: [
    'Platform',
    'Followers',
  ],
  optionalColumns: [
    'Notes',
  ],
  strippedColumns: [],
  canonicalColumns: [
    'date',
    'platform',
    'followers',
    'notes',
  ],
};

export const socialViewsSchema: CsvSchema = {
  source: 'social_views',
  // TMRW_MARKETING workbook → Social Views sheet. Daily per-platform aggregate.
  // Schema now expects Platform as the first column so views can be split by
  // Facebook / Instagram / LinkedIn / etc.
  requiredColumns: [
    'Platform',
    'Date',
    ['Page Views', 'Video Views', 'Post Engagements'],
  ],
  optionalColumns: [
    'Page Views',
    'Video Views',
    'Post Engagements',
  ],
  strippedColumns: [],
  canonicalColumns: [
    'platform',
    'date',
    'page_views',
    'video_views',
    'post_engagements',
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

// The two revenue sheets share identical headers, so they can't be told apart
// by column signature — the upload UI routes them by sheet name instead. Each
// is its own source but both write to the financial_revenue table.
const financialRevenueColumns: RequiredColumn[] = [
  'Date',
  'Membership',
  'TOTAL',
];
const financialRevenueOptional = [
  'Joining Fees',
  'TMRW Stacks',
  'Supplements',
  'Peptides',
  'Advanced Tests',
];
const financialRevenueCanonical = [
  'date',
  'revenue_type',
  'membership',
  'joining_fees',
  'tmrw_stacks',
  'supplements',
  'peptides',
  'advanced_tests',
  'total',
];

export const financialRevenueNetSchema: CsvSchema = {
  source: 'financial_revenue_net',
  requiredColumns: financialRevenueColumns,
  optionalColumns: financialRevenueOptional,
  strippedColumns: [],
  canonicalColumns: financialRevenueCanonical,
};

export const financialRevenueGrossSchema: CsvSchema = {
  source: 'financial_revenue_gross',
  requiredColumns: financialRevenueColumns,
  optionalColumns: financialRevenueOptional,
  strippedColumns: [],
  canonicalColumns: financialRevenueCanonical,
};

/**
 * All schemas indexed by source name for easy lookup.
 */
export const dataSourceSchemas: Record<string, CsvSchema> = {
  hubspot_contacts: hubspotContactsSchema,
  ghl_opportunities: ghlOpportunitiesSchema,
  operational_data: operationalDataSchema,
  stripe: stripeSchema,
  zendesk: zendeskSchema,
  tableau: tableauSchema,
  meta_ads: metaAdsSchema,
  social_followers: socialFollowersSchema,
  social_views: socialViewsSchema,
  pelagonia: pelagoniaSchema,
  financial_revenue_net: financialRevenueNetSchema,
  financial_revenue_gross: financialRevenueGrossSchema,
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
  hubspot_contacts: {
    name: 'HubSpot Contacts',
    exportSteps: [
      'Log in to HubSpot at app.hubspot.com.',
      'In the top navigation click Contacts → Contacts.',
      'Top-right click Actions → Export contacts.',
      'Include the lifecycle, membership, escript, pods, blood, epigenetics, and dashboard-unlocked properties — the full ~31-column property set defined in the spec. Other columns are ignored by the processor.',
      'Choose CSV as the file format.',
      'Click Export and wait for the download email (1–3 minutes).',
      'Drop the downloaded file into the upload zone below.',
    ],
    poweredMetrics: getMetricsPoweredBy('hubspot'),
  },
  ghl_opportunities: {
    name: 'GHL Opportunities',
    exportSteps: [
      'Log in to GoHighLevel.',
      'Open CRM → Opportunities.',
      'Use the export action to download the full Opportunity list as CSV.',
      'Required columns: Opportunity ID, pipeline, stage, status. Optional: source, Created on, Lead Value, plus the "Days since…" fields.',
      'Drop the downloaded file into the upload zone below.',
    ],
    poweredMetrics: getMetricsPoweredBy('pelagonia'),
  },
  operational_data: {
    name: 'Operational Data',
    exportSteps: [
      'Open the TMRW_Operational_Data_Upload workbook.',
      'Ensure Sheet2 has rows with: date (Excel-serial), customers_registered, total_casebook, pod_created, pod_dispatched, Churned members.',
      'Save as .xlsx and drop into the upload zone below.',
    ],
    poweredMetrics: [],
  },
  stripe: {
    name: 'Stripe',
    exportSteps: [
      'Log in to dashboard.stripe.com.',
      'Click Payments in the left navigation.',
      'Set the date range to the period you\'re uploading.',
      'Click Export (top right) → select Charges as the data type.',
      'Tick the PII-clean column set: id, Created date (UTC), Amount, Amount Refunded, Currency, Captured, Converted Amount, Converted Currency, Decline Reason, Fee, Refunded date (UTC), Status, Invoice ID.',
      'Choose CSV format.',
      'Click Export and drop the downloaded file into the upload zone below.',
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
      'Open the TMRW_MARKETING workbook.',
      'Meta Ads sheet — Date, Spend ($), Impressions, CTR (%), Clicks, Landing Page Views, Cost per LPV ($), Conversions (Leads), Cost per Conversion ($), Video Views, Post Engagements.',
      'Drop the .xlsx file into the upload zone below.',
    ],
    poweredMetrics: [],
  },
  social_followers: {
    name: 'Social Followers',
    exportSteps: [
      'TMRW_MARKETING workbook → Social Followers sheet.',
      'Required columns: Platform, Followers. Optional: Notes.',
      'Snapshot date is stamped with the upload date.',
    ],
    poweredMetrics: [],
  },
  social_views: {
    name: 'Social Views',
    exportSteps: [
      'TMRW_MARKETING workbook → Social Views sheet.',
      'Required: Date and at least one of Page Views / Video Views / Post Engagements.',
    ],
    poweredMetrics: [],
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
  financial_revenue_net: {
    name: 'Financial Revenue — Net',
    exportSteps: [
      'Open the Stripe revenue workbook.',
      'Confirm the "Net Revenue" sheet has columns: Date, Membership, Joining Fees, TMRW Stacks, Supplements, Peptides, Advanced Tests, TOTAL.',
      'Dates should read like 30-Dec-2025. Monthly subtotal, blank, and grand-total rows are ignored automatically.',
      'Drop the whole .xlsx into the upload zone — the Net and Gross sheets route by name.',
    ],
    poweredMetrics: [],
  },
  financial_revenue_gross: {
    name: 'Financial Revenue — Gross (RRP)',
    exportSteps: [
      'Open the Stripe revenue workbook.',
      'Confirm the "Gross Revenue (RRP)" sheet has columns: Date, Membership, Joining Fees, TMRW Stacks, Supplements, Peptides, Advanced Tests, TOTAL.',
      'Dates should read like 30-Dec-2025. Monthly subtotal, blank, and grand-total rows are ignored automatically.',
      'Drop the whole .xlsx into the upload zone — the Net and Gross sheets route by name.',
    ],
    poweredMetrics: [],
  },
};
