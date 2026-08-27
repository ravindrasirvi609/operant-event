import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PaymentModeBranch } from './payment-mode-branch';
import type { CreateOrderResult, Order } from '@/lib/registrations/types';

function renderWithQueryClient(ui: React.ReactElement) {
  const queryClient = new QueryClient();
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

const order: Order = {
  id: 'order_1',
  conferenceId: 'conf_1',
  registrationId: 'reg_1',
  orderNumber: 'ORD-000001',
  subtotal: 100,
  discount: 0,
  tax: 0,
  total: 100,
  currency: 'USD',
  status: 'PENDING',
};

describe('PaymentModeBranch', () => {
  it('renders a gateway checkout link when the response carries checkoutUrl', () => {
    const result: CreateOrderResult = { order, checkoutUrl: 'https://gateway.example/checkout/abc' };
    renderWithQueryClient(<PaymentModeBranch orderResult={result} orderId={order.id} />);

    expect(screen.getByRole('link', { name: /continue to payment/i })).toHaveAttribute(
      'href',
      'https://gateway.example/checkout/abc',
    );
  });

  it('renders manual payment instructions and proof upload when the response carries manualPaymentInstructions', () => {
    const result: CreateOrderResult = { order, manualPaymentInstructions: true };
    renderWithQueryClient(<PaymentModeBranch orderResult={result} orderId={order.id} />);

    expect(screen.getByText(/manual payment/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/proof file/i)).toBeInTheDocument();
  });

  it('trusts the response shape over a disagreeing externally-fetched payment mode prop', () => {
    const result: CreateOrderResult = { order, checkoutUrl: 'https://gateway.example/checkout/xyz' };
    renderWithQueryClient(<PaymentModeBranch orderResult={result} orderId={order.id} settingsPaymentMode="MANUAL" />);

    expect(screen.getByRole('link', { name: /continue to payment/i })).toBeInTheDocument();
    expect(screen.queryByText(/manual payment/i)).not.toBeInTheDocument();
  });
});
