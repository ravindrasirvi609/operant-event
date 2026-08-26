'use client';

import { useState } from 'react';
import type { ConferenceFormField } from '@/lib/conferences/form-field.types';

interface DynamicFormFieldProps {
  field: ConferenceFormField;
  value: unknown;
  onChange: (value: unknown) => void;
  error?: string;
  /** Injected so this component never needs to know how uploads are actually performed. */
  uploadFile?: (file: File) => Promise<string>;
}

function optionsOf(field: ConferenceFormField): string[] {
  return Array.isArray(field.optionsJson) ? field.optionsJson : [];
}

/**
 * Renders exactly one `ConferenceFormField` as a real, interactive
 * control. Shared between the organizer's field preview (Phase 1) and
 * the author's submission wizard (Phase 2) so the two never drift on
 * what a given `fieldType` actually renders as.
 */
export function DynamicFormField({ field, value, onChange, error, uploadFile }: DynamicFormFieldProps) {
  const [uploading, setUploading] = useState(false);
  const inputId = `form-field-${field.fieldKey}`;
  const errorId = `${inputId}-error`;

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !uploadFile) {
      return;
    }
    setUploading(true);
    try {
      const fileId = await uploadFile(file);
      onChange(fileId);
    } finally {
      setUploading(false);
    }
  }

  function renderControl() {
    switch (field.fieldType) {
      case 'TEXT':
      case 'URL':
        return (
          <input
            id={inputId}
            type={field.fieldType === 'URL' ? 'url' : 'text'}
            className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
            value={typeof value === 'string' ? value : ''}
            onChange={(event) => onChange(event.target.value)}
            aria-describedby={error ? errorId : undefined}
          />
        );
      case 'LONG_TEXT':
      case 'RICH_TEXT':
        return (
          <textarea
            id={inputId}
            className="w-full rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm"
            rows={4}
            value={typeof value === 'string' ? value : ''}
            onChange={(event) => onChange(event.target.value)}
            aria-describedby={error ? errorId : undefined}
          />
        );
      case 'NUMBER':
        return (
          <input
            id={inputId}
            type="number"
            className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
            value={typeof value === 'number' ? value : ''}
            onChange={(event) => onChange(event.target.value === '' ? undefined : Number(event.target.value))}
            aria-describedby={error ? errorId : undefined}
          />
        );
      case 'DATE':
        return (
          <input
            id={inputId}
            type="date"
            className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
            value={typeof value === 'string' ? value : ''}
            onChange={(event) => onChange(event.target.value)}
            aria-describedby={error ? errorId : undefined}
          />
        );
      case 'CHECKBOX':
        return (
          <input
            id={inputId}
            type="checkbox"
            className="size-4 rounded border-input"
            checked={Boolean(value)}
            onChange={(event) => onChange(event.target.checked)}
            aria-describedby={error ? errorId : undefined}
          />
        );
      case 'SELECT':
        return (
          <select
            id={inputId}
            className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
            value={typeof value === 'string' ? value : ''}
            onChange={(event) => onChange(event.target.value)}
            aria-describedby={error ? errorId : undefined}
          >
            <option value="" disabled>
              Select…
            </option>
            {optionsOf(field).map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        );
      case 'RADIO':
        return (
          <div role="radiogroup" aria-label={field.label} className="space-y-1">
            {optionsOf(field).map((option) => (
              <label key={option} htmlFor={`${inputId}-${option}`} className="flex items-center gap-2 text-sm">
                <input
                  id={`${inputId}-${option}`}
                  type="radio"
                  name={inputId}
                  className="size-4"
                  checked={value === option}
                  onChange={() => onChange(option)}
                />
                {option}
              </label>
            ))}
          </div>
        );
      case 'MULTI_SELECT': {
        const selected = Array.isArray(value) ? (value as string[]) : [];
        return (
          <div className="space-y-1">
            {optionsOf(field).map((option) => (
              <label key={option} htmlFor={`${inputId}-${option}`} className="flex items-center gap-2 text-sm">
                <input
                  id={`${inputId}-${option}`}
                  type="checkbox"
                  className="size-4 rounded border-input"
                  checked={selected.includes(option)}
                  onChange={(event) =>
                    onChange(
                      event.target.checked ? [...selected, option] : selected.filter((item) => item !== option),
                    )
                  }
                />
                {option}
              </label>
            ))}
          </div>
        );
      }
      case 'FILE':
        return (
          <input
            id={inputId}
            type="file"
            className="text-sm"
            onChange={handleFileChange}
            disabled={uploading}
            aria-describedby={error ? errorId : undefined}
          />
        );
      default:
        return null;
    }
  }

  // RADIO already renders its own accessible group label via `role="radiogroup"`
  // + `aria-label`; a second visible <label> would duplicate the announcement.
  if (field.fieldType === 'RADIO') {
    return (
      <div className="space-y-1.5">
        <span className="text-sm font-medium">
          {field.label}
          {field.isRequired ? ' *' : ''}
        </span>
        {renderControl()}
        {uploading ? <p className="text-xs text-muted-foreground">Uploading…</p> : null}
        {error ? (
          <p id={errorId} role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <label htmlFor={inputId} className="text-sm font-medium">
        {field.label}
        {field.isRequired ? ' *' : ''}
      </label>
      {renderControl()}
      {uploading ? <p className="text-xs text-muted-foreground">Uploading…</p> : null}
      {error ? (
        <p id={errorId} role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
