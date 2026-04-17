import React from 'react';
import { useCountdown } from '../hooks/useCountdown';

interface CountdownTimerProps {
  expiresAt: string;
  onExpire?: () => void;
}

export const CountdownTimer: React.FC<CountdownTimerProps> = ({ expiresAt, onExpire }) => {
  const { formattedTime, isExpired, secondsLeft } = useCountdown(expiresAt);

  React.useEffect(() => {
    if (isExpired) onExpire?.();
  }, [isExpired, onExpire]);

  const isUrgent = secondsLeft <= 60;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '12px 16px',
        borderRadius: '8px',
        backgroundColor: isExpired ? '#fee2e2' : isUrgent ? '#fef3c7' : '#ecfdf5',
        border: `1px solid ${isExpired ? '#fca5a5' : isUrgent ? '#fcd34d' : '#6ee7b7'}`,
        marginBottom: '16px',
      }}
    >
      <span style={{ fontSize: '20px' }}>{isExpired ? '⏰' : isUrgent ? '⚡' : '⏱️'}</span>
      <div>
        <p
          style={{
            margin: 0,
            fontSize: '12px',
            color: '#6b7280',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          {isExpired ? 'Reservation expired' : 'Time remaining'}
        </p>
        <p
          style={{
            margin: 0,
            fontSize: '24px',
            fontWeight: 800,
            fontFamily: 'monospace',
            color: isExpired ? '#ef4444' : isUrgent ? '#d97706' : '#059669',
          }}
        >
          {isExpired ? '00:00' : formattedTime}
        </p>
      </div>
    </div>
  );
};
