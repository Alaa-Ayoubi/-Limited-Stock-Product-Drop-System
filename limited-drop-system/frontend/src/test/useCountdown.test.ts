import { renderHook, act } from '@testing-library/react';
import { useCountdown } from '../hooks/useCountdown';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

describe('useCountdown', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return formatted time correctly', () => {
    const futureDate = new Date(Date.now() + 5 * 60 * 1000).toISOString();
    const { result } = renderHook(() => useCountdown(futureDate));

    expect(result.current.secondsLeft).toBeGreaterThan(0);
    expect(result.current.isExpired).toBe(false);
    expect(result.current.formattedTime).toMatch(/^\d{2}:\d{2}$/);
  });

  it('should decrement every second', () => {
    const futureDate = new Date(Date.now() + 10_000).toISOString();
    const { result } = renderHook(() => useCountdown(futureDate));

    const initial = result.current.secondsLeft;

    act(() => {
      vi.advanceTimersByTime(3_000);
    });

    expect(result.current.secondsLeft).toBeLessThanOrEqual(initial - 2);
  });

  it('should mark as expired when time runs out', () => {
    const pastDate = new Date(Date.now() - 1000).toISOString();
    const { result } = renderHook(() => useCountdown(pastDate));

    expect(result.current.isExpired).toBe(true);
    expect(result.current.secondsLeft).toBe(0);
  });

  it('should return zeros for null expiresAt', () => {
    const { result } = renderHook(() => useCountdown(null));
    expect(result.current.secondsLeft).toBe(0);
    expect(result.current.isExpired).toBe(true);
  });
});
