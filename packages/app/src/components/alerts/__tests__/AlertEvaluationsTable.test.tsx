import React from 'react';
import {
  AlertErrorType,
  AlertHistory,
  AlertState,
} from '@hyperdx/common-utils/dist/types';
import { fireEvent, screen } from '@testing-library/react';

import { AlertEvaluationsTable } from '@/components/alerts/AlertEvaluationsTable';

// Controls whether the infinite-scroll sentinel reports itself as visible.
let mockInViewport = false;
jest.mock('@mantine/hooks', () => ({
  ...jest.requireActual('@mantine/hooks'),
  useInViewport: () => ({ ref: jest.fn(), inViewport: mockInViewport }),
}));

const okWindow: AlertHistory = {
  counts: 0,
  createdAt: '2026-04-17T12:05:00.000Z',
  lastValues: [{ startTime: '2026-04-17T12:00:00.000Z', count: 3 }],
  state: AlertState.OK,
};

const errorWindow: AlertHistory = {
  counts: 0,
  createdAt: '2026-04-17T12:10:00.000Z',
  lastValues: [],
  state: AlertState.ERROR,
  errors: [
    {
      timestamp: '2026-04-17T12:11:00.000Z',
      type: AlertErrorType.QUERY_TIMEOUT,
      message:
        'Alert query did not complete within the 300s evaluation timeout.',
    },
  ],
};

const renderTable = (
  props: Partial<React.ComponentProps<typeof AlertEvaluationsTable>> = {},
) =>
  renderWithMantine(
    <AlertEvaluationsTable
      evaluations={[errorWindow, okWindow]}
      isLoading={false}
      hasNextPage={false}
      isFetchingNextPage={false}
      onLoadMore={jest.fn()}
      {...props}
    />,
  );

describe('AlertEvaluationsTable', () => {
  beforeEach(() => {
    mockInViewport = false;
  });

  it('renders one row per evaluation window with state badges', () => {
    renderTable();

    const rows = screen.getAllByTestId('alert-evaluation-row');
    expect(rows).toHaveLength(2);
    expect(screen.getByText('Error')).toBeInTheDocument();
    expect(screen.getByText('Ok')).toBeInTheDocument();
    // OK row shows the latest value
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('shows the error type label and expands to the full message', () => {
    renderTable();

    expect(screen.getByText('Query Timeout')).toBeInTheDocument();
    expect(
      screen.queryByText(/did not complete within the 300s/),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByText('Query Timeout'));

    expect(
      screen.getByText(/did not complete within the 300s/),
    ).toBeInTheDocument();
  });

  it('fetches the next page when the scroll sentinel enters the viewport', () => {
    mockInViewport = true;
    const onLoadMore = jest.fn();
    renderTable({ hasNextPage: true, onLoadMore });

    expect(
      screen.getByTestId('alert-evaluations-load-more'),
    ).toBeInTheDocument();
    expect(onLoadMore).toHaveBeenCalled();
  });

  it('does not fetch while a page is already being fetched', () => {
    mockInViewport = true;
    const onLoadMore = jest.fn();
    renderTable({ hasNextPage: true, isFetchingNextPage: true, onLoadMore });

    expect(onLoadMore).not.toHaveBeenCalled();
  });

  it('does not render the sentinel when there are no older pages', () => {
    renderTable({ hasNextPage: false });
    expect(
      screen.queryByTestId('alert-evaluations-load-more'),
    ).not.toBeInTheDocument();
  });

  it('renders an empty state when the range has no evaluations', () => {
    renderTable({ evaluations: [] });
    expect(
      screen.getByText(/No evaluations in the selected time range/),
    ).toBeInTheDocument();
  });
});
