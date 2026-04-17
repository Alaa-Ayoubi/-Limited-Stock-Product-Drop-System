import React, { useState } from 'react';
import { useProducts } from '../hooks/useProducts';
import { ProductCard } from '../components/ProductCard';
import { ReservationsList } from '../components/ReservationsList';
import { AuthUser } from '../types';

type Tab = 'drop' | 'orders';

interface DropPageProps {
  user: AuthUser | null;
  onLogout: () => void;
}

export const DropPage: React.FC<DropPageProps> = ({ user, onLogout }) => {
  const { products, loading, error, lastRefresh } = useProducts();
  const [activeTab, setActiveTab] = useState<Tab>('drop');
  const [search, setSearch] = useState('');
  const [stockFilter, setStockFilter] = useState<'all' | 'inStock' | 'soldOut'>('all');

  const totalStock = products.reduce((sum, p) => sum + p.stock, 0);
  const inStockCount = products.filter(p => p.stock > 0).length;

  const filtered = products.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchesStock =
      stockFilter === 'all' ? true :
      stockFilter === 'inStock' ? p.stock > 0 :
      p.stock === 0;
    return matchesSearch && matchesStock;
  });

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f4f4f5', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
      `}</style>

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header style={{ backgroundColor: '#111827', borderBottom: '1px solid #1f2937', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '60px' }}>
          {/* Brand + tabs */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '28px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '20px', fontWeight: 900, color: '#fff', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
                Drop
              </span>
              <span style={{ backgroundColor: '#ef4444', color: '#fff', fontSize: '9px', fontWeight: 900, padding: '2px 6px', borderRadius: '4px', letterSpacing: '0.1em' }}>
                LIVE
              </span>
            </div>
            <nav style={{ display: 'flex', gap: '2px' }}>
              {([
                { key: 'drop', label: 'The Drop' },
                { key: 'orders', label: 'My Orders' },
              ] as { key: Tab; label: string }[]).map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  style={{
                    padding: '6px 16px',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: activeTab === tab.key ? '#fff' : 'transparent',
                    color: activeTab === tab.key ? '#111827' : '#9ca3af',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Right side */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: '#10b981', animation: 'pulse 2s infinite' }} />
              <span style={{ fontSize: '11px', color: '#6b7280' }}>
                Updated {lastRefresh.toLocaleTimeString()}
              </span>
            </div>
            {user && (
              <>
                <span style={{ fontSize: '12px', color: '#9ca3af', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {user.email}
                </span>
                <button
                  onClick={onLogout}
                  style={{
                    padding: '6px 14px',
                    fontSize: '12px',
                    fontWeight: 700,
                    backgroundColor: 'transparent',
                    border: '1px solid #374151',
                    borderRadius: '6px',
                    color: '#d1d5db',
                    cursor: 'pointer',
                  }}
                >
                  Sign out
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ── Stats bar ──────────────────────────────────────────────────── */}
      {activeTab === 'drop' && !loading && !error && (
        <div style={{ backgroundColor: '#1f2937', borderBottom: '1px solid #374151' }}>
          <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 24px', display: 'flex', gap: '32px', height: '44px', alignItems: 'center' }}>
            <StatPill emoji="🔥" label="Active drops" value={inStockCount} color="#f59e0b" />
            <StatPill emoji="📦" label="Items remaining" value={totalStock} color="#34d399" />
            <StatPill emoji="🏷️" label="Products" value={products.length} color="#a78bfa" />
          </div>
        </div>
      )}

      {/* ── Main ───────────────────────────────────────────────────────── */}
      <main style={{ maxWidth: '1100px', margin: '0 auto', padding: '32px 24px' }}>

        {/* ── The Drop tab ─────────────────────────────────────────────── */}
        {activeTab === 'drop' && (
          <>
            {/* Section heading + controls */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h1 style={{ margin: 0, fontSize: '28px', fontWeight: 900, color: '#111827', letterSpacing: '-0.02em' }}>
                  Limited Drops
                </h1>
                <p style={{ margin: '4px 0 0', fontSize: '14px', color: '#6b7280' }}>
                  Stock refreshes every 5 seconds. Reserve before it's gone.
                </p>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                {/* Search */}
                <input
                  type="text"
                  placeholder="Search products…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{
                    padding: '8px 14px',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '13px',
                    outline: 'none',
                    backgroundColor: '#fff',
                    width: '180px',
                  }}
                />
                {/* Stock filter */}
                {(['all', 'inStock', 'soldOut'] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setStockFilter(f)}
                    style={{
                      padding: '7px 14px',
                      borderRadius: '8px',
                      border: '1px solid',
                      borderColor: stockFilter === f ? '#111827' : '#e5e7eb',
                      backgroundColor: stockFilter === f ? '#111827' : '#fff',
                      color: stockFilter === f ? '#fff' : '#6b7280',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    {f === 'all' ? 'All' : f === 'inStock' ? 'In Stock' : 'Sold Out'}
                  </button>
                ))}
              </div>
            </div>

            {/* Loading state */}
            {loading && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '40vh', gap: '16px' }}>
                <div style={{ width: '44px', height: '44px', border: '3px solid #e5e7eb', borderTopColor: '#111827', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                <p style={{ color: '#6b7280', margin: 0 }}>Loading drops…</p>
              </div>
            )}

            {/* Error state */}
            {error && (
              <div style={{ padding: '24px', backgroundColor: '#fef2f2', borderRadius: '12px', textAlign: 'center', maxWidth: '480px', margin: '0 auto' }}>
                <p style={{ color: '#dc2626', fontWeight: 700, margin: '0 0 4px' }}>Failed to load products</p>
                <p style={{ color: '#6b7280', fontSize: '14px', margin: 0 }}>{error}</p>
              </div>
            )}

            {/* Product grid */}
            {!loading && !error && (
              filtered.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '64px 24px', backgroundColor: '#fff', borderRadius: '16px', border: '1px dashed #d1d5db' }}>
                  <div style={{ fontSize: '48px', marginBottom: '12px' }}>🔍</div>
                  <p style={{ color: '#9ca3af', fontSize: '15px', margin: 0 }}>No products match your filter.</p>
                </div>
              ) : (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(420px, 1fr))',
                    gap: '24px',
                  }}
                >
                  {filtered.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>
              )
            )}
          </>
        )}

        {/* ── My Orders tab ────────────────────────────────────────────── */}
        {activeTab === 'orders' && (
          <>
            <div style={{ marginBottom: '24px' }}>
              <h1 style={{ margin: 0, fontSize: '28px', fontWeight: 900, color: '#111827', letterSpacing: '-0.02em' }}>
                My Orders
              </h1>
              <p style={{ margin: '4px 0 0', fontSize: '14px', color: '#6b7280' }}>
                Manage your active reservations and view order history.
              </p>
            </div>
            <ReservationsList />
          </>
        )}
      </main>
    </div>
  );
};

// ─── Helper components ─────────────────────────────────────────────────────────

const StatPill: React.FC<{ emoji: string; label: string; value: number; color: string }> = ({ emoji, label, value, color }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
    <span style={{ fontSize: '14px' }}>{emoji}</span>
    <span style={{ fontSize: '20px', fontWeight: 900, color }}>{value}</span>
    <span style={{ fontSize: '11px', color: '#6b7280', fontWeight: 500 }}>{label}</span>
  </div>
);
