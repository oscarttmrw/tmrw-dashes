/**
 * CSV schema definitions for each external data source.
 * Used to validate uploaded files before processing.
 */

import type { CsvSchema, DataSourceConfig } from '@/lib/types/data-sources';
import { getMetricsPoweredBy } from '@/lib/utils/metric-source';

export const hubspotSchema: CsvSchema = {
  source: 'hubspot',
  requiredColumns: [
    'Record ID',
    'Type',
    'Created at',
    'Primary Email',
  ],
  optionalColumns: [
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
    'Email addresses',
    'Last interaction > When',
    'Little Prick ID',
    'Patient ID',
    'Lead',
    'Lab Batch Tracking Number',
    'Name > First',
    'Name > Last',
  ],
  strippedColumns: [],
};

export const stripeSchema: CsvSchema = {
  source: 'stripe',
  requiredColumns: [
    'id',
    'Created date (UTC)',
    'Amount',
    'Currency',
    'Status',
  ],
  optionalColumns: [
    'Amount Refunded',
    'Captured',
    'Converted Amount',
    'Converted Currency',
    'Decline Reason',
    'Fee',
    'Refunded date (UTC)',
    'Invoice ID',
  ],
  strippedColumns: [],
};

export const zendeskSchema: CsvSchema = {
  source: 'zendesk',
  requiredColumns: [
    'ID',
    'Status',
    'Priority',
    'Via',
    'Ticket type',
    'Created at',
    'Updated at',
    'Solved at',
    'Assignee',
    'Group',
    'Tags',
    'Satisfaction Score',
    'First reply time in minutes',
    'First reply time in minutes within business hours',
    'First resolution time in minutes',
    'Full resolution time in minutes within business hours',
    'Requester wait time in minutes within business hours',
    'Reopens',
    'Replies',
    'Assignee stations',
    'Group stations',
  ],
  optionalColumns: [
    'Subject',
    'Description',
    'Requester',
  ],
  strippedColumns: [],
};

export const tableauSchema: CsvSchema = {
  source: 'tableau',
  requiredColumns: [
    'Member Id',
    'Email',
    'Created At',
    'Measure Names',
    'Measure Values',
  ],
  optionalColumns: [
    'CASE_STATUS',
    'CASE_TYPE',
    'Person Type',
    'Initial Subscription Date',
    'First Purchase Date',
    'Dashboard Published At',
    'First Result Ready At',
  ],
  strippedColumns: [],
};

export const metaSchema: CsvSchema = {
  source: 'meta',
  requiredColumns: [
    'Day',
    'Ad set name',
    'Amount spent',
    'Impressions',
    'Clicks (all)',
  ],
  optionalColumns: [
    'Campaign name',
    'Landing page views',
    'Cost per landing page view',
    'Results',
    'Cost per result',
    'CTR (all)',
  ],
  strippedColumns: [],
};

export const pelagoniaSchema: CsvSchema = {
  source: 'pelagonia',
  requiredColumns: [
    'Opportunity ID',
    'Stage',
    'Value',
    'Contact ID',
    'Created At',
  ],
  optionalColumns: [
    'Won At',
    'Calls Booked',
    'Appointment Status',
    'Pipeline',
    'Owner',
  ],
  strippedColumns: [],
};

/**
 * All schemas indexed by source name for easy lookup.
 */
export const dataSourceSchemas: Record<string, CsvSchema> = {
  hubspot: hubspotSchema,
  stripe: stripeSchema,
  zendesk: zendeskSchema,
  tableau: tableauSchema,
  meta: metaSchema,
  pelagonia: pelagoniaSchema,
};

/**
 * Get the schema for a given data source.
 */
export function getSchema(source: string): CsvSchema | undefined {
  return dataSourceSchemas[source];
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
      'Log in to dashboard.stripe.com.',
      'Click Payments in the left navigation.',
      'Set the date range to the period you\'re uploading.',
      'Click Export (top right) → select Charges as the data type.',
      'Tick ONLY these 13 columns: id, Created date (UTC), Amount, Amount Refunded, Currency, Captured, Converted Amount, Converted Currency, Decline Reason, Fee, Refunded date (UTC), Status, Invoice ID.',
      'Privacy: aggregates only. This dashboard never holds customer-identifiable data. When customising the Stripe export, DO NOT tick Customer Email, Customer ID, Card ID, Description, or any metadata columns.',
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
  meta: {
    name: 'Meta for Business',
    exportSteps: [
      'Log in to business.facebook.com and open Ads Manager.',
      'Select the ad account for TMRW.',
      'Set your date range in the top-right date picker.',
      'Click the Breakdown dropdown → By Time → Day.',
      'Click the Columns dropdown → Customise columns. Add: Day, Ad Set Name, Amount Spent, Impressions, Clicks (All), Landing Page Views, Cost per Landing Page View, Results, Cost per Result, CTR (All).',
      'Click the Export button (top right) → Export Table Data → .csv.',
      'Drop the downloaded file into the upload zone below.',
    ],
    poweredMetrics: getMetricsPoweredBy('meta'),
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
