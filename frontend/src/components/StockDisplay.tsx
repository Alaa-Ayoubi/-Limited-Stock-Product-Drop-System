import React from 'react';

interface StockDisplayProps {
  stock: number;
  totalStock: number;
}

export const StockDisplay: React.FC<StockDisplayProps> = ({ stock, totalStock }) => {
  const percentage = totalStock > 0 ? (stock / totalStock) * 100 : 0;
  const isSoldOut = stock === 0;
  const isLow = stock > 0 && stock <= 3;

  return (
    <div style={{ marginBottom: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
        <span style={{ fontSize: '14px', color: '#6b7280' }}>Stock remaining</span>
        <span
          style={{
            fontSize: '14px',
            fontWeight: 700,
            color: isSoldOut ? '#ef4444' : isLow ? '#f59e0b' : '#10b981',
          }}
        >
          {isSoldOut ? 'SOLD OUT' : isLow ? `Only ${stock} left!` : `${stock} / ${totalStock}`}
        </span>
      </div>
      <div
        style={{
          width: '100%',
          height: '8px',
          backgroundColor: '#e5e7eb',
          borderRadius: '4px',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${percentage}%`,
            height: '100%',
            backgroundColor: isSoldOut ? '#ef4444' : isLow ? '#f59e0b' : '#10b981',
            borderRadius: '4px',
            transition: 'width 0.5s ease',
          }}
        />
      </div>
    </div>
  );
};
