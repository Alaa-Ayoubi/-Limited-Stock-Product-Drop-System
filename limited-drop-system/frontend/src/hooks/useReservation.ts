import { useState } from 'react';
import { Reservation } from '../types';
import { reservationsApi, checkoutApi } from '../api/client';

type ReservationState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'reserved'; reservation: Reservation }
  | { status: 'expired' }
  | { status: 'completed' }
  | { status: 'error'; message: string };

interface UseReservationReturn {
  state: ReservationState;
  reserve: (productId: string, quantity?: number) => Promise<void>;
  checkout: () => Promise<void>;
  cancel: () => Promise<void>;
  reset: () => void;
}

export function useReservation(): UseReservationReturn {
  const [state, setState] = useState<ReservationState>({ status: 'idle' });

  const reserve = async (productId: string, quantity = 1): Promise<void> => {
    setState({ status: 'loading' });
    try {
      const response = await reservationsApi.create(productId, quantity);
      if (response.data) {
        setState({ status: 'reserved', reservation: response.data });
      } else {
        setState({ status: 'error', message: 'No reservation data returned' });
      }
    } catch (err) {
      setState({
        status: 'error',
        message: err instanceof Error ? err.message : 'Reservation failed',
      });
    }
  };

  const checkout = async (): Promise<void> => {
    if (state.status !== 'reserved') return;

    const { reservation } = state;

    // Guard: check expiry on client side before making the request
    if (new Date() > new Date(reservation.expiresAt)) {
      setState({ status: 'expired' });
      return;
    }

    setState({ status: 'loading' });
    try {
      await checkoutApi.checkout(reservation.id);
      setState({ status: 'completed' });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Checkout failed';
      if (message.toLowerCase().includes('expired')) {
        setState({ status: 'expired' });
      } else {
        setState({ status: 'error', message });
      }
    }
  };

  const cancel = async (): Promise<void> => {
    if (state.status !== 'reserved') {
      setState({ status: 'idle' });
      return;
    }
    const { reservation } = state;
    setState({ status: 'loading' });
    try {
      await reservationsApi.cancel(reservation.id);
    } catch {
      // Even if the API fails, clear the UI state
    } finally {
      setState({ status: 'idle' });
    }
  };

  const reset = (): void => setState({ status: 'idle' });

  return { state, reserve, checkout, cancel, reset };
}
