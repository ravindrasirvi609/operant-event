import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { UseQueryResult } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';
import { AsyncBoundary } from './async-boundary';

function fakeQuery<T>(overrides: Partial<UseQueryResult<T>>): UseQueryResult<T> {
  return {
    isPending: false,
    isError: false,
    error: null,
    data: undefined,
    refetch: vi.fn(),
    ...overrides,
  } as unknown as UseQueryResult<T>;
}

describe('AsyncBoundary', () => {
  it('shows a loading state while the query is pending', () => {
    render(<AsyncBoundary query={fakeQuery({ isPending: true })}>{() => <div>Data</div>}</AsyncBoundary>);

    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.queryByText('Data')).not.toBeInTheDocument();
  });

  it('shows the error message and a retry button when the query errors', async () => {
    const refetch = vi.fn();
    const user = userEvent.setup();
    render(
      <AsyncBoundary query={fakeQuery({ isError: true, error: new Error('Forbidden'), refetch })}>
        {() => <div>Data</div>}
      </AsyncBoundary>,
    );

    expect(screen.getByRole('alert')).toHaveTextContent('Forbidden');
    await user.click(screen.getByRole('button', { name: 'Retry' }));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('renders the empty slot when the data is an empty array', () => {
    render(
      <AsyncBoundary query={fakeQuery<string[]>({ data: [] })} empty={<div>No results yet</div>}>
        {(data) => <div>{data.length} results</div>}
      </AsyncBoundary>,
    );

    expect(screen.getByText('No results yet')).toBeInTheDocument();
  });

  it('renders children with the data when the query succeeds with non-empty data', () => {
    render(
      <AsyncBoundary query={fakeQuery<string[]>({ data: ['a', 'b'] })} empty={<div>No results yet</div>}>
        {(data) => <div>{data.length} results</div>}
      </AsyncBoundary>,
    );

    expect(screen.getByText('2 results')).toBeInTheDocument();
  });

  it('uses a custom isEmpty predicate when provided, instead of the array-length default', () => {
    render(
      <AsyncBoundary
        query={fakeQuery<{ count: number }>({ data: { count: 0 } })}
        empty={<div>Nothing here</div>}
        isEmpty={(data) => data.count === 0}
      >
        {(data) => <div>{data.count} items</div>}
      </AsyncBoundary>,
    );

    expect(screen.getByText('Nothing here')).toBeInTheDocument();
  });
});
