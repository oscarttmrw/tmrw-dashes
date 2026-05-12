export type DataSourceName = 'hubspot' | 'stripe' | 'zendesk' | 'tableau' | 'manual';

export interface CsvSchema {
  source: DataSourceName;
  requiredColumns: string[];
  optionalColumns: string[];
  strippedColumns: string[];
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
