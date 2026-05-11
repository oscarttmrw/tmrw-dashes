/**
 * CSV schema definitions for each external data source.
 * Used to validate uploaded files before processing.
 */

import type { CsvSchema } from '@/lib/types/data-sources';

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
    'charge_id',
    'created',
    'amount',
    'currency',
    'outcome_type',
    'card_country',
    'interaction_type',
  ],
  optionalColumns: [
    'card_brand',
    'failure_code',
    'failure_message',
    'description',
    'fee',
    'net',
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

/**
 * All schemas indexed by source name for easy lookup.
 */
export const dataSourceSchemas: Record<string, CsvSchema> = {
  hubspot: hubspotSchema,
  stripe: stripeSchema,
  zendesk: zendeskSchema,
  tableau: tableauSchema,
};

/**
 * Get the schema for a given data source.
 */
export function getSchema(source: string): CsvSchema | undefined {
  return dataSourceSchemas[source];
}
