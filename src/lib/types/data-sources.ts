export type DataSourceName = 'hubspot' | 'stripe' | 'zendesk' | 'tableau' | 'meta_ads' | 'social_followers' | 'social_views' | 'pelagonia' | 'manual';

/**
 * A required column may be expressed as a single name or an array of
 * acceptable variants (any one match satisfies the requirement, compared
 * case-insensitively). Use the array form when an export tool ships multiple
 * spellings of the same logical field (e.g. "Amount Spent" vs "Amount Spent (AUD)").
 */
export type RequiredColumn = string | string[];

export interface CsvSchema {
  source: DataSourceName;
  requiredColumns: RequiredColumn[];
  optionalColumns: string[];
  strippedColumns: string[];
  /** Authoritative list of typed columns in the Supabase table (snake_case, excludes id/batch_id/inserted_at). */
  canonicalColumns: string[];
}

export interface DataSourceConfig {
  name: string;
  exportSteps: string[];
  poweredMetrics: string[];
}

export interface UploadResult {
  success: boolean;
  source: DataSourceName;
  recordCount: number;
  columnCount: number;
  newRecords: number;
  updatedRecords: number;
  errors: string[];
  timestamp: string;
}

export interface RefreshLog {
  source: DataSourceName;
  lastRefreshed: string | null;
  recordCount: number;
  columnCount: number;
  nextRecommended: string | null;
}
