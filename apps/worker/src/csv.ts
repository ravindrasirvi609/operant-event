import { stringify } from 'csv-stringify/sync';
import { parse } from 'csv-parse/sync';

/** A real CSV library handles quoting/escaping correctly (embedded commas, quotes, newlines) — hand-rolling this is an easy source of subtle bugs. */
export function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) {
    return '';
  }
  return stringify(rows, { header: true });
}

export function fromCsv(csv: string): Record<string, string>[] {
  return parse(csv, { columns: true, skip_empty_lines: true, trim: true });
}
