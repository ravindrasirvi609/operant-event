import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { FormField } from './form-field';

describe('FormField', () => {
  it('associates the label with the input via htmlFor/id', () => {
    render(
      <FormField label="Email" htmlFor="email">
        <input id="email" />
      </FormField>,
    );

    expect(screen.getByLabelText('Email')).toBeInTheDocument();
  });

  it('does not render an error region when no error is given', () => {
    render(
      <FormField label="Email" htmlFor="email">
        <input id="email" />
      </FormField>,
    );

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('renders the error message in an alert region when given', () => {
    render(
      <FormField label="Email" htmlFor="email" error="Enter a valid email address.">
        <input id="email" />
      </FormField>,
    );

    expect(screen.getByRole('alert')).toHaveTextContent('Enter a valid email address.');
  });
});
