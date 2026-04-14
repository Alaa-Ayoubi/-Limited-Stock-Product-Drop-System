import React from 'react';

interface ReserveButtonProps {
  onClick: () => void;
  loading: boolean;
  disabled: boolean;
  label?: string;
}

export const ReserveButton: React.FC<ReserveButtonProps> = ({
  onClick,
  loading,
  disabled,
  label = 'Reserve Now',
}) => {
  const isDisabled = disabled || loading;

  return (
    <button
      onClick={onClick}
      disabled={isDisabled}
      style={{
        width: '100%',
        padding: '14px 24px',
        fontSize: '16px',
        fontWeight: 700,
        letterSpacing: '0.05em',
        textTransform: 'uppercase',
        borderRadius: '8px',
        border: 'none',
        cursor: isDisabled ? 'not-allowed' : 'pointer',
        backgroundColor: isDisabled ? '#d1d5db' : '#111827',
        color: isDisabled ? '#9ca3af' : '#ffffff',
        transition: 'all 0.2s ease',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
      }}
    >
      {loading && (
        <span
          style={{
            width: '16px',
            height: '16px',
            border: '2px solid #fff',
            borderTopColor: 'transparent',
            borderRadius: '50%',
            display: 'inline-block',
            animation: 'spin 0.8s linear infinite',
          }}
        />
      )}
      {loading ? 'Processing…' : label}

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </button>
  );
};
