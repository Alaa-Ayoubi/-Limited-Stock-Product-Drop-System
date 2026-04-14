import React, { useState, useEffect, useCallback } from 'react';
import { Reservation } from '../types';
import { reservationsApi, checkoutApi } from '../api/client';
import { CountdownTimer } from './CountdownTimer';

export const ReservationsList: React.FC = () => {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [filter, setFilter] = useState<'all' | 'ACTIVE' | 'COMPLETED' | 'EXPIRED' | 'CANCELLED'>('all');

  const load = useCallback(async () => {
    try {
      const res = await reservationsApi.list();
      if (res.data) setReservations(res.data);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const showToast = (type: 'success' | 'error', text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 4000);
  };

  const handleCheckout = async (reservationId: string) => {
    setActionLoading(reservationId);
    try {
      await checkoutApi.checkout(reservationId);
      showToast('success', 'Order confirmed! Your purchase is complete.');
      load();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Checkout failed');
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancel = async (reservationId: string) => {
    setActionLoading(reservationId);
    try {
      await reservationsApi.cancel(reservationId);
      showToast('success', 'Reservation cancelled. Stock has been released.');
      load();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Cancel failed');
    } finally {
      setActionLoading(null);
    }
  };

  const displayed = filter === 'all' ? reservations : reservations.filter(r => r.status === filter);
  const activeCount = reservations.filter(r => r.status === 'ACTIVE').length;
  const completedCount = reservations.filter(r => r.status === 'COMPLETED').length;

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '64px', color: '#6b7280' }}>
        <div style={{ fontSize: '32px', marginBottom: '12px' }}>⏳</div>
        <p>Loading your orders…</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '680px', margin: '0 auto' }}>
      {/* Toast notification */}
      {toast && (
        <div
          style={{
            position: 'fixed',
            top: '80px',
            right: '24px',
            zIndex: 9999,
            padding: '14px 20px',
            borderRadius: '10px',
            backgroundColor: toast.type === 'success' ? '#052e16' : '#450a0a',
            border: `1px solid ${toast.type === 'success' ? '#16a34a' : '#dc2626'}`,
            color: toast.type === 'success' ? '#4ade80' : '#f87171',
            fontSize: '14px',
            fontWeight: 600,
            boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            minWidth: '280px',
          }}
        >
          <span>{toast.type === 'success' ? '✓' : '✕'}</span>
          {toast.text}
        </div>
      )}

      {/* Summary cards */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
        {[
          { label: 'Total Orders', value: reservations.length, color: '#6b7280', bg: '#f9fafb' },
          { label: 'Active', value: activeCount, color: '#059669', bg: '#f0fdf4' },
          { label: 'Completed', value: completedCount, color: '#2563eb', bg: '#eff6ff' },
        ].map((s) => (
          <div
            key={s.label}
            style={{
              flex: 1,
              padding: '16px',
              backgroundColor: s.bg,
              borderRadius: '12px',
              border: '1px solid #e5e7eb',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '28px', fontWeight: 900, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: 600, marginTop: '2px' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {(['all', 'ACTIVE', 'COMPLETED', 'EXPIRED', 'CANCELLED'] as const).map((f) => {
          const count = f === 'all' ? reservations.length : reservations.filter(r => r.status === f).length;
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: '6px 14px',
                borderRadius: '20px',
                border: '1px solid',
                borderColor: filter === f ? '#111827' : '#e5e7eb',
                backgroundColor: filter === f ? '#111827' : '#fff',
                color: filter === f ? '#fff' : '#6b7280',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {f === 'all' ? 'All' : f.charAt(0) + f.slice(1).toLowerCase()} ({count})
            </button>
          );
        })}
        <button
          onClick={load}
          style={{
            marginLeft: 'auto',
            padding: '6px 14px',
            borderRadius: '20px',
            border: '1px solid #e5e7eb',
            backgroundColor: '#fff',
            color: '#6b7280',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          ↻ Refresh
        </button>
      </div>

      {/* Reservations list */}
      {displayed.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '64px 24px',
            backgroundColor: '#f9fafb',
            borderRadius: '16px',
            border: '1px dashed #d1d5db',
          }}
        >
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>🛍️</div>
          <p style={{ color: '#9ca3af', fontSize: '15px', margin: 0 }}>
            {filter === 'all' ? 'No orders yet. Go reserve something!' : `No ${filter.toLowerCase()} orders.`}
          </p>
        </div>
      ) : (
        displayed.map((r) => (
          <ReservationCard
            key={r.id}
            reservation={r}
            loading={actionLoading === r.id}
            onCheckout={() => handleCheckout(r.id)}
            onCancel={() => handleCancel(r.id)}
            onExpire={load}
          />
        ))
      )}
    </div>
  );
};

// ─── Reservation Card ──────────────────────────────────────────────────────────

interface ReservationCardProps {
  reservation: Reservation;
  loading?: boolean;
  onCheckout?: () => void;
  onCancel?: () => void;
  onExpire?: () => void;
}

const statusConfig = {
  ACTIVE:    { bg: '#f0fdf4', border: '#bbf7d0', text: '#166534', dot: '#16a34a', label: 'Active' },
  COMPLETED: { bg: '#eff6ff', border: '#bfdbfe', text: '#1d4ed8', dot: '#2563eb', label: 'Completed' },
  EXPIRED:   { bg: '#fef2f2', border: '#fecaca', text: '#dc2626', dot: '#ef4444', label: 'Expired' },
  CANCELLED: { bg: '#f9fafb', border: '#e5e7eb', text: '#6b7280', dot: '#9ca3af', label: 'Cancelled' },
} as const;

const ReservationCard: React.FC<ReservationCardProps> = ({
  reservation, loading = false, onCheckout, onCancel, onExpire,
}) => {
  const sc = statusConfig[reservation.status];
  const totalPrice = (reservation.product?.price ?? 0) * reservation.quantity;

  return (
    <div
      style={{
        backgroundColor: '#fff',
        border: '1px solid #e5e7eb',
        borderRadius: '14px',
        marginBottom: '12px',
        overflow: 'hidden',
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
      }}
    >
      {/* Card header */}
      <div style={{ padding: '16px 20px', borderBottom: reservation.status === 'ACTIVE' ? '1px solid #f3f4f6' : undefined }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 800, color: '#111827', fontSize: '15px', marginBottom: '4px' }}>
              {reservation.product?.name ?? 'Product'}
            </div>
            <div style={{ display: 'flex', gap: '12px', fontSize: '12px', color: '#6b7280' }}>
              <span>Qty: {reservation.quantity}</span>
              <span>·</span>
              <span style={{ fontWeight: 700, color: '#111827' }}>${totalPrice.toFixed(2)}</span>
              <span>·</span>
              <span>Reserved {new Date(reservation.createdAt ?? '').toLocaleDateString()}</span>
            </div>
          </div>
          <span
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              padding: '4px 12px',
              borderRadius: '20px',
              fontSize: '11px',
              fontWeight: 700,
              backgroundColor: sc.bg,
              border: `1px solid ${sc.border}`,
              color: sc.text,
              whiteSpace: 'nowrap',
              marginLeft: '12px',
            }}
          >
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: sc.dot, display: 'inline-block' }} />
            {sc.label}
          </span>
        </div>
      </div>

      {/* Active state actions */}
      {reservation.status === 'ACTIVE' && (
        <div style={{ padding: '16px 20px', backgroundColor: '#fafafa' }}>
          <CountdownTimer expiresAt={reservation.expiresAt} onExpire={onExpire} />
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={onCheckout}
              disabled={loading}
              style={{
                flex: 1,
                padding: '11px',
                backgroundColor: loading ? '#d1d5db' : '#111827',
                color: loading ? '#9ca3af' : '#fff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 700,
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              {loading ? 'Processing…' : '✓ Complete Checkout'}
            </button>
            <button
              onClick={onCancel}
              disabled={loading}
              style={{
                padding: '11px 18px',
                backgroundColor: 'transparent',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '13px',
                color: '#6b7280',
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Completed state */}
      {reservation.status === 'COMPLETED' && (
        <div style={{ padding: '12px 20px', backgroundColor: '#f0fdf4', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ color: '#16a34a', fontWeight: 800, fontSize: '16px' }}>✓</span>
          <span style={{ fontSize: '13px', color: '#166534', fontWeight: 600 }}>Order confirmed — purchase complete</span>
        </div>
      )}

      {/* Expired state */}
      {reservation.status === 'EXPIRED' && (
        <div style={{ padding: '12px 20px', backgroundColor: '#fef2f2', fontSize: '13px', color: '#9ca3af' }}>
          ⏰ Hold expired — stock was released back to inventory
        </div>
      )}

      {/* Cancelled state */}
      {reservation.status === 'CANCELLED' && (
        <div style={{ padding: '12px 20px', backgroundColor: '#f9fafb', fontSize: '13px', color: '#9ca3af' }}>
          ✕ Reservation cancelled by you
        </div>
      )}
    </div>
  );
};
