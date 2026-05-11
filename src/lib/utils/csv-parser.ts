/**
 * CSV parsing wrapper around PapaParse for the TMRW dashboard.
 */

import Papa from 'papaparse';

export interface ParseResult<T> {
  data: T[];
  errors: string[];
  meta: { fields: string[] };
}

/**
 * Parse a CSV File into typed rows.
 * Expects the first row to be a header row.
 */
export function parseCSV<T>(file: File): Promise<ParseResult<T>> {
  return new Promise((resolve) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: true,
      complete(results) {
        const errors = results.errors.map(
          (e) => `Row ${e.row ?? '?'}: ${e.message}`
        );
        resolve({
          data: results.data as T[],
          errors,
          meta: { fields: results.meta.fields ?? [] },
        });
      },
      error(err: Error) {
        resolve({
          data: [],
          errors: [err.message],
          meta: { fields: [] },
        });
      },
    });
  });
}

/**
 * Validate that all required columns are present in the parsed fields.
 */
export function validateColumns(
  fields: string[],
  required: string[]
): { valid: boolean; missing: string[] } {
  const fieldSet = new Set(fields.map((f) => f.trim().toLowerCase()));
  const missing = required.filter(
    (col) => !fieldSet.has(col.trim().toLowerCase())
  );
  return { valid: missing.length === 0, missing };
}
