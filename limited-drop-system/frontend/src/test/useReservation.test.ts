import { renderHook, act } from '@testing-library/react';
import { useReservation } from '../hooks/useReservation';
import { reservationsApi, checkoutApi } from '../api/client';
import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('../api/client', () => ({
  reservationsApi: { create: vi.fn() },
  checkoutApi: { checkout: vi.fn() },
}));

const mockReservationsApi = reservationsApi as { create: ReturnType<typeof vi.fn> };
const mockCheckoutApi = checkoutApi as { checkout: ReturnType<typeof vi.fn> };

describe('useReservation', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should start in idle state', () => {
    const { result } = renderHook(() => useReservation());
    expect(result.current.state.status).toBe('idle');
  });

  it('should set reserved state on successful reserve', async () => {
    const mockReservation = {
      id: 'res-1',
      status: 'ACTIVE',
      expiresAt: new Date(Date.now() + 300_000).toISOString(),
      product: { name: 'Test', price: 99 },
    };

    mockReservationsApi.create.mockResolvedValue({ success: true, data: mockReservation });

    const { result } = renderHook(() => useReservation());

    await act(async () => {
      await result.current.reserve('product-1', 1);
    });

    expect(result.current.state.status).toBe('reserved');
  });

  it('should set error state when reserve fails', async () => {
    mockReservationsApi.create.mockRejectedValue(new Error('Insufficient stock'));

    const { result } = renderHook(() => useReservation());

    await act(async () => {
      await result.current.reserve('product-1', 1);
    });

    expect(result.current.state.status).toBe('error');
    if (result.current.state.status === 'error') {
      expect(result.current.state.message).toBe('Insufficient stock');
    }
  });

  it('should set expired state when checkout response contains expired', async () => {
    const mockReservation = {
      id: 'res-1',
      status: 'ACTIVE',
      expiresAt: new Date(Date.now() + 300_000).toISOString(),
    };
    mockReservationsApi.create.mockResolvedValue({ success: true, data: mockReservation });
    mockCheckoutApi.checkout.mockRejectedValue(new Error('Reservation has expired'));

    const { result } = renderHook(() => useReservation());

    await act(async () => {
      await result.current.reserve('product-1', 1);
    });

    await act(async () => {
      await result.current.checkout();
    });

    expect(result.current.state.status).toBe('expired');
  });

  it('should reset to idle on reset()', async () => {
    mockReservationsApi.create.mockRejectedValue(new Error('Error'));

    const { result } = renderHook(() => useReservation());

    await act(async () => {
      await result.current.reserve('product-1', 1);
    });

    expect(result.current.state.status).toBe('error');

    act(() => result.current.reset());

    expect(result.current.state.status).toBe('idle');
  });
});
