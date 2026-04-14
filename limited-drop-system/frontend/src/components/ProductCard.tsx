import React, { useState } from 'react';
import { Product } from '../types';
import { StockDisplay } from './StockDisplay';
import { ReserveButton } from './ReserveButton';
import { CountdownTimer } from './CountdownTimer';
import { useReservation } from '../hooks/useReservation';

interface ProductCardProps {
  product: Product;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const { state, reserve, checkout, cancel, reset } = useReservation();
  const [quantity, setQuantity] = useState(1);

  const isLoading = state.status === 'loading';
  const isSoldOut = product.stock === 0;
  const maxQty = Math.min(product.stock, 3);

  const handleReserve = (): void => {
    reserve(product.id, quantity);
  };

  const handleExpire = (): void => {
    reset();
  };

  const adjustQty = (delta: number) => {
    setQuantity((q) => Math.max(1, Math.min(maxQty, q + delta)));
  };

  return (
    <div
      style={{
        borderRadius: '18px',
        overflow: 'hidden',
        boxShadow: '0 4px 24px rgba(0,0,0,0.10)',
        backgroundColor: '#fff',
        fontFamily: 'system-ui, sans-serif',
        transition: 'box-shadow 0.2s',
      }}
    >
      {/* Product Image */}
      <div style={{ position: 'relative', backgroundColor: '#f3f4f6' }}>
        <img
          src={product.imageUrl ?? `https://placehold.co/480x260/f3f4f6/9ca3af?text=${encodeURIComponent(product.name)}`}
          alt={product.name}
          style={{ width: '100%', height: '260px', objectFit: 'cover', display: 'block' }}
          onError={(e) => {
            (e.target as HTMLImageElement).src = `https://placehold.co/480x260/f3f4f6/9ca3af?text=Limited+Drop`;
          }}
        />

        {/* Sold-out overlay */}
        {isSoldOut && (
          <div
            style={{
              position: 'absolute', inset: 0,
              backgroundColor: 'rgba(0,0,0,0.6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <span style={{ color: '#fff', fontSize: '26px', fontWeight: 900, letterSpacing: '0.15em', textTransform: 'uppercase' }}>
              Sold Out
            </span>
          </div>
        )}

        {/* Badges */}
        <div style={{ position: 'absolute', top: '12px', left: '12px', display: 'flex', gap: '6px' }}>
          <span style={badgeStyle('#111827')}>Limited Drop</span>
          {!isSoldOut && product.stock <= 3 && (
            <span style={badgeStyle('#dc2626')}>Only {product.stock} left!</span>
          )}
          {product.stock > 0 && product.stock / product.totalStock <= 0.3 && product.stock > 3 && (
            <span style={badgeStyle('#d97706')}>Low Stock</span>
          )}
        </div>

        {/* Price tag */}
        <div
          style={{
            position: 'absolute', bottom: '12px', right: '12px',
            backgroundColor: 'rgba(0,0,0,0.75)',
            backdropFilter: 'blur(4px)',
            color: '#fff',
            fontSize: '18px',
            fontWeight: 900,
            padding: '6px 14px',
            borderRadius: '8px',
          }}
        >
          ${product.price.toFixed(2)}
        </div>
      </div>

      {/* Product Info */}
      <div style={{ padding: '22px 22px 20px' }}>
        <h2 style={{ margin: '0 0 6px', fontSize: '20px', fontWeight: 800, color: '#111827', lineHeight: 1.3 }}>
          {product.name}
        </h2>
        {product.description && (
          <p style={{ margin: '0 0 14px', fontSize: '13px', color: '#6b7280', lineHeight: 1.6 }}>
            {product.description}
          </p>
        )}

        <StockDisplay stock={product.stock} totalStock={product.totalStock} />

        {/* ── Quantity selector (only when idle/error and in stock) ── */}
        {(state.status === 'idle' || state.status === 'error') && !isSoldOut && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', marginTop: '4px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>Quantity</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0', border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden' }}>
              <button
                onClick={() => adjustQty(-1)}
                disabled={quantity <= 1}
                style={{
                  width: '36px', height: '36px',
                  border: 'none',
                  backgroundColor: quantity <= 1 ? '#f9fafb' : '#fff',
                  color: quantity <= 1 ? '#d1d5db' : '#111827',
                  fontSize: '18px',
                  fontWeight: 700,
                  cursor: quantity <= 1 ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                −
              </button>
              <span
                style={{
                  width: '40px', height: '36px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '15px', fontWeight: 800, color: '#111827',
                  borderLeft: '1px solid #e5e7eb', borderRight: '1px solid #e5e7eb',
                  backgroundColor: '#f9fafb',
                }}
              >
                {quantity}
              </span>
              <button
                onClick={() => adjustQty(1)}
                disabled={quantity >= maxQty}
                style={{
                  width: '36px', height: '36px',
                  border: 'none',
                  backgroundColor: quantity >= maxQty ? '#f9fafb' : '#fff',
                  color: quantity >= maxQty ? '#d1d5db' : '#111827',
                  fontSize: '18px',
                  fontWeight: 700,
                  cursor: quantity >= maxQty ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                +
              </button>
            </div>
            <span style={{ fontSize: '12px', color: '#9ca3af' }}>
              Total: <strong style={{ color: '#111827' }}>${(product.price * quantity).toFixed(2)}</strong>
            </span>
          </div>
        )}

        {/* ── Reserved state ── */}
        {state.status === 'reserved' && (
          <>
            <CountdownTimer expiresAt={state.reservation.expiresAt} onExpire={handleExpire} />
            <div
              style={{
                padding: '12px 14px',
                backgroundColor: '#f0fdf4',
                border: '1px solid #bbf7d0',
                borderRadius: '8px',
                marginBottom: '12px',
                fontSize: '13px',
                color: '#166534',
                fontWeight: 600,
              }}
            >
              ✓ Reserved {state.reservation.quantity} unit{state.reservation.quantity > 1 ? 's' : ''} — complete checkout before the timer ends!
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <div style={{ flex: 1 }}>
                <ReserveButton
                  onClick={checkout}
                  loading={isLoading}
                  disabled={isLoading}
                  label="Complete Checkout"
                />
              </div>
            </div>
            <button
              onClick={cancel}
              disabled={isLoading}
              style={{
                marginTop: '8px',
                width: '100%',
                padding: '10px',
                background: 'none',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                fontSize: '13px',
                color: '#6b7280',
              }}
            >
              {isLoading ? 'Cancelling…' : 'Cancel reservation'}
            </button>
          </>
        )}

        {/* ── Expired state ── */}
        {state.status === 'expired' && (
          <div
            style={{
              padding: '16px',
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '8px',
              marginBottom: '12px',
              textAlign: 'center',
            }}
          >
            <p style={{ margin: '0 0 4px', fontWeight: 700, color: '#dc2626' }}>⏰ Reservation Expired</p>
            <p style={{ margin: '0 0 12px', fontSize: '13px', color: '#6b7280' }}>
              Your 5-minute hold ended and stock was released.
            </p>
            <button
              onClick={reset}
              style={{
                padding: '8px 20px',
                backgroundColor: '#111827', color: '#fff',
                border: 'none', borderRadius: '6px',
                cursor: 'pointer', fontSize: '13px', fontWeight: 700,
              }}
            >
              Try again
            </button>
          </div>
        )}

        {/* ── Completed state ── */}
        {state.status === 'completed' && (
          <div
            style={{
              padding: '20px',
              backgroundColor: '#f0fdf4',
              border: '1px solid #bbf7d0',
              borderRadius: '8px',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>🎉</div>
            <p style={{ margin: '0 0 4px', fontSize: '18px', fontWeight: 900, color: '#166534' }}>Order Confirmed!</p>
            <p style={{ margin: 0, fontSize: '13px', color: '#6b7280' }}>
              Check "My Orders" tab for details.
            </p>
          </div>
        )}

        {/* ── Error state ── */}
        {state.status === 'error' && (
          <div
            style={{
              padding: '12px',
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '8px',
              marginBottom: '12px',
              fontSize: '13px',
              color: '#dc2626',
            }}
          >
            {state.message}
          </div>
        )}

        {/* ── Reserve button (idle / error) ── */}
        {(state.status === 'idle' || state.status === 'error') && (
          <ReserveButton
            onClick={handleReserve}
            loading={isLoading}
            disabled={isSoldOut || isLoading}
            label={isSoldOut ? 'Sold Out' : `Reserve ${quantity > 1 ? `${quantity} units` : 'Now'}`}
          />
        )}
      </div>
    </div>
  );
};

const badgeStyle = (bg: string): React.CSSProperties => ({
  backgroundColor: bg,
  color: '#fff',
  fontSize: '10px',
  fontWeight: 700,
  padding: '4px 10px',
  borderRadius: '4px',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
});
