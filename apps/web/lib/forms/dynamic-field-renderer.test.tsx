import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { DynamicFormField } from './dynamic-field-renderer';
import type { ConferenceFormField } from '@/lib/conferences/form-field.types';

function makeField(overrides: Partial<ConferenceFormField>): ConferenceFormField {
  return {
    id: 'field-1',
    conferenceId: 'conf-1',
    section: 'General',
    fieldKey: 'background',
    label: 'Background',
    fieldType: 'TEXT',
    isRequired: false,
    optionsJson: null,
    validationJson: null,
    sortOrder: 0,
    status: 'ACTIVE',
    ...overrides,
  };
}

/** Controlled inputs need their value fed back in to behave like real usage — this wrapper does that, recording every onChange call for assertions. */
function ControlledField({
  field,
  initialValue,
  onChangeSpy,
}: {
  field: ConferenceFormField;
  initialValue: unknown;
  onChangeSpy: (value: unknown) => void;
}) {
  const [value, setValue] = useState(initialValue);
  return (
    <DynamicFormField
      field={field}
      value={value}
      onChange={(next) => {
        setValue(next);
        onChangeSpy(next);
      }}
    />
  );
}

describe('DynamicFormField', () => {
  it.each(['TEXT', 'LONG_TEXT', 'RICH_TEXT'] as const)('%s renders a text input and reports string changes', async (fieldType) => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<ControlledField field={makeField({ fieldType, label: 'Background' })} initialValue="" onChangeSpy={onChange} />);

    await user.type(screen.getByLabelText('Background'), 'hi');

    expect(onChange).toHaveBeenLastCalledWith('hi');
  });

  it('NUMBER renders a number input and reports a numeric value', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<ControlledField field={makeField({ fieldType: 'NUMBER', label: 'Age' })} initialValue="" onChangeSpy={onChange} />);

    await user.type(screen.getByLabelText('Age'), '42');

    expect(onChange).toHaveBeenLastCalledWith(42);
  });

  it('DATE renders a date input', () => {
    render(<DynamicFormField field={makeField({ fieldType: 'DATE', label: 'Deadline' })} value="" onChange={vi.fn()} />);

    expect(screen.getByLabelText('Deadline')).toHaveAttribute('type', 'date');
  });

  it('URL renders a url input', () => {
    render(<DynamicFormField field={makeField({ fieldType: 'URL', label: 'Website' })} value="" onChange={vi.fn()} />);

    expect(screen.getByLabelText('Website')).toHaveAttribute('type', 'url');
  });

  it('CHECKBOX renders a single checkbox and reports a boolean', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<DynamicFormField field={makeField({ fieldType: 'CHECKBOX', label: 'I agree' })} value={false} onChange={onChange} />);

    await user.click(screen.getByLabelText('I agree'));

    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('SELECT renders a native select with the configured options and reports the chosen value', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(
      <DynamicFormField
        field={makeField({ fieldType: 'SELECT', label: 'Region', optionsJson: ['North', 'South'] })}
        value=""
        onChange={onChange}
      />,
    );

    await user.selectOptions(screen.getByLabelText('Region'), 'South');

    expect(onChange).toHaveBeenCalledWith('South');
  });

  it('RADIO renders one radio input per option and reports the chosen value', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(
      <DynamicFormField
        field={makeField({ fieldType: 'RADIO', label: 'Preference', optionsJson: ['Oral', 'Poster'] })}
        value=""
        onChange={onChange}
      />,
    );

    await user.click(screen.getByLabelText('Poster'));

    expect(onChange).toHaveBeenCalledWith('Poster');
  });

  it('MULTI_SELECT renders one checkbox per option and reports the array of checked values', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(
      <DynamicFormField
        field={makeField({ fieldType: 'MULTI_SELECT', label: 'Topics', optionsJson: ['AI', 'Security'] })}
        value={[]}
        onChange={onChange}
      />,
    );

    await user.click(screen.getByLabelText('AI'));

    expect(onChange).toHaveBeenCalledWith(['AI']);
  });

  it('FILE renders an upload input and reports the fileId returned by the injected uploader', async () => {
    const onChange = vi.fn();
    const uploadFile = vi.fn().mockResolvedValue('file-123');
    const user = userEvent.setup();
    render(
      <DynamicFormField
        field={makeField({ fieldType: 'FILE', label: 'Manuscript' })}
        value=""
        onChange={onChange}
        uploadFile={uploadFile}
      />,
    );

    const file = new File(['content'], 'manuscript.pdf', { type: 'application/pdf' });
    await user.upload(screen.getByLabelText('Manuscript'), file);

    expect(uploadFile).toHaveBeenCalledWith(file);
    expect(onChange).toHaveBeenCalledWith('file-123');
  });

  it('shows the required marker for a required field', () => {
    render(<DynamicFormField field={makeField({ label: 'Background', isRequired: true })} value="" onChange={vi.fn()} />);

    expect(screen.getByText('Background *')).toBeInTheDocument();
  });

  it('shows a validation error when given one', () => {
    render(
      <DynamicFormField field={makeField({ label: 'Background' })} value="" onChange={vi.fn()} error="This field is required." />,
    );

    expect(screen.getByRole('alert')).toHaveTextContent('This field is required.');
  });
});
