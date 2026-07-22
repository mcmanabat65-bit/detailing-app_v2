'use client';

import { useMemo, useState } from 'react';
import {
  BarChart2,
  TrendingUp,
  PhilippinePeso,
  Coffee,
  Package,
  Calendar,
  Download,
  ChevronDown,
  AlertTriangle,
} from 'lucide-react';
import { AdminLayout } from '@/components/AdminLayout';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useApp } from '@/context/AppContext';
import { formatCurrency } from '@/data/services';
import { PERMISSIONS } from '@/lib/permissions';

// ── helpers ────────────────────────────────────────────────────────────────

const toIso = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const startOf = {
  day: (d) => { const r = new Date(d); r.setHours(0,0,0,0); return r; },
  week: (d) => {
    const r = new Date(d); r.setHours(0,0,0,0);
    r.setDate(r.getDate() - r.getDay()); // Sunday
    return r;
  },
  month: (d) => new Date(d.getFullYear(), d.getMonth(), 1),
};

const PERIOD_LABELS = { daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly' };

const bucketKey = (dateStr, period) => {
  const d = new Date(dateStr + 'T00:00:00');
  if (period === 'daily') return dateStr;
  if (period === 'weekly') {
    const s = startOf.week(d);
    return toIso(s);
  }
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

const bucketLabel = (key, period) => {
  if (period === 'daily') {
    const d = new Date(key + 'T00:00:00');
    return d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
  }
  if (period === 'weekly') {
    const start = new Date(key + 'T00:00:00');
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    return `${start.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  }
  const [yr, mo] = key.split('-');
  return new Date(Number(yr), Number(mo) - 1, 1).toLocaleDateString('en-PH', { month: 'long', year: 'numeric' });
};

const exportCsv = (rows, filename) => {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(','),
    ...rows.map((r) => headers.map((h) => JSON.stringify(r[h] ?? '')).join(',')),
  ].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

// ── stat card ──────────────────────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, sub, accent = 'text-gold' }) {
  return (
    <div className="bg-surface border border-white/5 rounded-sm p-5 flex items-start gap-4">
      <div className={`mt-0.5 p-2.5 rounded-sm bg-white/5 ${accent}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <div className="text-xs text-muted uppercase tracking-widest mb-1">{label}</div>
        <div className="text-2xl font-serif text-cream leading-none">{value}</div>
        {sub && <div className="text-xs text-muted mt-1">{sub}</div>}
      </div>
    </div>
  );
}

// ── bar chart (pure CSS) ────────────────────────────────────────────────────

function BarChartInline({ data, valueKey, labelKey, formatVal, color = 'bg-gold' }) {
  if (!data.length) return <p className="text-muted text-sm py-6 text-center">No data for this period.</p>;
  const max = Math.max(...data.map((d) => d[valueKey]), 1);
  return (
    <div className="space-y-2">
      {data.map((row, i) => {
        const pct = (row[valueKey] / max) * 100;
        return (
          <div key={i} className="flex items-center gap-3 text-sm">
            <div className="w-32 shrink-0 text-muted truncate text-right text-xs">{row[labelKey]}</div>
            <div className="flex-1 h-6 bg-white/5 rounded-sm overflow-hidden">
              <div
                className={`h-full ${color} opacity-80 transition-all duration-500`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <div className="w-24 shrink-0 text-cream text-xs">{formatVal(row[valueKey])}</div>
          </div>
        );
      })}
    </div>
  );
}

// ── section wrapper ────────────────────────────────────────────────────────

function Section({ title, icon: Icon, children, onExport }) {
  return (
    <div className="bg-surface border border-white/5 rounded-sm overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-gold" />
          <h2 className="text-sm font-medium text-cream tracking-wide">{title}</h2>
        </div>
        {onExport && (
          <button
            onClick={onExport}
            className="flex items-center gap-1.5 text-xs text-muted hover:text-gold transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
        )}
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

// ── main component ─────────────────────────────────────────────────────────

function Reports() {
  const { bookings, posOrders, inventoryItems, coffees } = useApp();

  const [period, setPeriod] = useState('monthly');
  const [periodOpen, setPeriodOpen] = useState(false);

  // ── date range filter (last N buckets) ──────────────────────────────────
  const rangeCount = period === 'daily' ? 30 : period === 'weekly' ? 12 : 12;

  // ── booking sales ───────────────────────────────────────────────────────
  const bookingSales = useMemo(() => {
    const billed = bookings.filter(
      (b) => b.status === 'completed' || b.status === 'confirmed'
    );

    // Group into time buckets
    const map = {};
    billed.forEach((b) => {
      const key = bucketKey(b.date, period);
      if (!map[key]) map[key] = { revenue: 0, count: 0, vip: 0 };
      map[key].revenue += b.servicePrice || 0;
      map[key].count += 1;
      if (b.isVip) map[key].vip += 1;
    });

    const sorted = Object.keys(map)
      .sort()
      .slice(-rangeCount)
      .map((key) => ({
        key,
        label: bucketLabel(key, period),
        revenue: map[key].revenue,
        count: map[key].count,
        vip: map[key].vip,
      }));

    const totalRevenue = sorted.reduce((s, r) => s + r.revenue, 0);
    const totalCount = sorted.reduce((s, r) => s + r.count, 0);
    const totalVip = sorted.reduce((s, r) => s + r.vip, 0);
    const avgRevenue = sorted.length ? totalRevenue / sorted.length : 0;

    return { rows: sorted, totalRevenue, totalCount, totalVip, avgRevenue };
  }, [bookings, period, rangeCount]);

  // ── service breakdown ───────────────────────────────────────────────────
  const serviceBreakdown = useMemo(() => {
    const billed = bookings.filter(
      (b) => b.status === 'completed' || b.status === 'confirmed'
    );
    const map = {};
    billed.forEach((b) => {
      const name = b.serviceName || 'Unknown';
      if (!map[name]) map[name] = { count: 0, revenue: 0 };
      map[name].count += 1;
      map[name].revenue += b.servicePrice || 0;
    });
    return Object.entries(map)
      .map(([name, d]) => ({ name, ...d }))
      .sort((a, b) => b.revenue - a.revenue);
  }, [bookings]);

  // ── coffee / POS sales ──────────────────────────────────────────────────
  const coffeeSales = useMemo(() => {
    const map = {};
    posOrders.forEach((o) => {
      const key = bucketKey(
        o.createdAt ? o.createdAt.slice(0, 10) : toIso(new Date()),
        period
      );
      if (!map[key]) map[key] = { count: 0, items: 0, estCost: 0, selling: 0 };
      map[key].count += 1;
      map[key].items += o.itemCount || 0;
      map[key].estCost += o.totalCost || 0;
      map[key].selling += o.sellingTotal || 0;
    });

    const sorted = Object.keys(map)
      .sort()
      .slice(-rangeCount)
      .map((key) => ({
        key,
        label: bucketLabel(key, period),
        orders: map[key].count,
        items: map[key].items,
        estCost: map[key].estCost,
        selling: map[key].selling,
      }));

    const totalOrders = sorted.reduce((s, r) => s + r.orders, 0);
    const totalItems = sorted.reduce((s, r) => s + r.items, 0);
    const totalEstCost = sorted.reduce((s, r) => s + r.estCost, 0);
    const totalSelling = sorted.reduce((s, r) => s + r.selling, 0);

    return { rows: sorted, totalOrders, totalItems, totalEstCost, totalSelling };
  }, [posOrders, period, rangeCount]);

  // ── coffee item breakdown ───────────────────────────────────────────────
  const coffeeItemBreakdown = useMemo(() => {
    const map = {};
    posOrders.forEach((o) => {
      (o.items || []).forEach((item) => {
        const name = item.coffeeName || 'Unknown';
        if (!map[name]) map[name] = 0;
        map[name] += item.qty || 0;
      });
    });
    return Object.entries(map)
      .map(([name, qty]) => ({ name, qty }))
      .sort((a, b) => b.qty - a.qty);
  }, [posOrders]);

  // ── inventory snapshot ──────────────────────────────────────────────────
  const inventoryStats = useMemo(() => {
    const active = inventoryItems.filter((i) => i.isActive !== false);
    const lowStock = active.filter((i) => (i.stockQty ?? 0) <= (i.lowStockAt ?? 0));
    const totalValue = active.reduce(
      (s, i) => s + (i.stockQty ?? 0) * (i.unitCost ?? 0),
      0
    );
    const outOfStock = active.filter((i) => (i.stockQty ?? 0) <= 0);
    return { active, lowStock, outOfStock, totalValue };
  }, [inventoryItems]);

  // ── CSV exports ─────────────────────────────────────────────────────────
  const exportBookings = () =>
    exportCsv(
      bookingSales.rows.map((r) => ({
        Period: r.label,
        Bookings: r.count,
        'VIP Bookings': r.vip,
        'Revenue (PHP)': r.revenue,
      })),
      `booking-sales-${period}.csv`
    );

  const exportServices = () =>
    exportCsv(
      serviceBreakdown.map((r) => ({
        Service: r.name,
        Bookings: r.count,
        'Revenue (PHP)': r.revenue,
      })),
      'service-breakdown.csv'
    );

  const exportCoffee = () =>
    exportCsv(
      coffeeSales.rows.map((r) => ({
        Period: r.label,
        Orders: r.orders,
        'Items Served': r.items,
        'Est. Cost (PHP)': r.estCost,
      })),
      `coffee-sales-${period}.csv`
    );

  const exportInventory = () =>
    exportCsv(
      inventoryStats.active.map((i) => ({
        Name: i.name,
        Brand: i.brand || '',
        UOM: i.uom || '',
        'Stock Qty': i.stockQty ?? 0,
        'Low Stock At': i.lowStockAt ?? 0,
        'Unit Cost (PHP)': i.unitCost ?? 0,
        'Stock Value (PHP)': (i.stockQty ?? 0) * (i.unitCost ?? 0),
        Status: (i.stockQty ?? 0) <= 0 ? 'Out of Stock' : (i.stockQty ?? 0) <= (i.lowStockAt ?? 0) ? 'Low Stock' : 'OK',
      })),
      'inventory-snapshot.csv'
    );

  return (
    <div className="space-y-8">

      {/* Period selector */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <p className="text-sm text-muted">
          Showing <span className="text-cream">{period === 'daily' ? 'last 30 days' : period === 'weekly' ? 'last 12 weeks' : 'last 12 months'}</span>
        </p>
        <div className="relative">
          <button
            onClick={() => setPeriodOpen((o) => !o)}
            className="flex items-center gap-2 text-sm text-cream bg-surface-2 border border-white/10 rounded-sm px-4 py-2 hover:border-gold/40 transition-colors"
          >
            <Calendar className="w-3.5 h-3.5 text-gold" />
            {PERIOD_LABELS[period]}
            <ChevronDown className={`w-3.5 h-3.5 text-muted transition-transform ${periodOpen ? 'rotate-180' : ''}`} />
          </button>
          {periodOpen && (
            <div className="absolute right-0 mt-1 w-36 bg-surface border border-white/10 rounded-sm shadow-xl z-20">
              {Object.entries(PERIOD_LABELS).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => { setPeriod(key); setPeriodOpen(false); }}
                  className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${period === key ? 'text-gold bg-gold/10' : 'text-cream/70 hover:bg-white/5'}`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Booking Sales Overview ─────────────────────────────────────── */}
      <div>
        <h2 className="font-serif text-lg text-cream mb-4">Booking Sales</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard
            icon={PhilippinePeso}
            label="Total Revenue"
            value={formatCurrency(bookingSales.totalRevenue)}
            sub={`${bookingSales.totalCount} bookings`}
          />
          <StatCard
            icon={TrendingUp}
            label={`Avg / ${PERIOD_LABELS[period].replace('ly','').replace('nthly','nth')}`}
            value={formatCurrency(bookingSales.avgRevenue)}
            sub={`over ${bookingSales.rows.length} ${period === 'daily' ? 'days' : period === 'weekly' ? 'weeks' : 'months'}`}
          />
          <StatCard
            icon={BarChart2}
            label="Completed / Confirmed"
            value={bookingSales.totalCount}
            sub="included in revenue"
          />
          <StatCard
            icon={Calendar}
            label="VIP Bookings"
            value={bookingSales.totalVip}
            sub={`${bookingSales.totalCount ? Math.round((bookingSales.totalVip / bookingSales.totalCount) * 100) : 0}% of total`}
            accent="text-yellow-400"
          />
        </div>

        <Section title={`Revenue by ${PERIOD_LABELS[period].replace('ly', '').replace('nthly', 'nth')}`} icon={PhilippinePeso} onExport={exportBookings}>
          <BarChartInline
            data={[...bookingSales.rows].reverse()}
            valueKey="revenue"
            labelKey="label"
            formatVal={formatCurrency}
            color="bg-gold"
          />
        </Section>
      </div>

      {/* ── Service Breakdown ──────────────────────────────────────────── */}
      <Section title="Revenue by Service" icon={BarChart2} onExport={exportServices}>
        {serviceBreakdown.length === 0 ? (
          <p className="text-muted text-sm py-6 text-center">No completed or confirmed bookings yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted uppercase tracking-wider border-b border-white/5">
                  <th className="pb-3 pr-4">Service</th>
                  <th className="pb-3 pr-4 text-right">Bookings</th>
                  <th className="pb-3 text-right">Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {serviceBreakdown.map((row, i) => (
                  <tr key={i} className="text-cream/80">
                    <td className="py-3 pr-4 font-medium text-cream">{row.name}</td>
                    <td className="py-3 pr-4 text-right tabular-nums">{row.count}</td>
                    <td className="py-3 text-right tabular-nums text-gold">{formatCurrency(row.revenue)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-white/10 text-cream font-medium">
                  <td className="pt-3 pr-4">Total</td>
                  <td className="pt-3 pr-4 text-right tabular-nums">{serviceBreakdown.reduce((s, r) => s + r.count, 0)}</td>
                  <td className="pt-3 text-right tabular-nums text-gold">{formatCurrency(serviceBreakdown.reduce((s, r) => s + r.revenue, 0))}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </Section>

      {/* ── Coffee / POS Sales ────────────────────────────────────────── */}
      <div>
        <h2 className="font-serif text-lg text-cream mb-4">Coffee Sales (POS)</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard
            icon={Coffee}
            label="Total Orders"
            value={coffeeSales.totalOrders}
            sub={`${coffeeSales.totalItems} items served`}
            accent="text-amber-400"
          />
          <StatCard
            icon={TrendingUp}
            label="Items Served"
            value={coffeeSales.totalItems}
            sub={coffeeSales.totalOrders ? `avg ${(coffeeSales.totalItems / coffeeSales.totalOrders).toFixed(1)} per order` : '—'}
            accent="text-amber-400"
          />
          <StatCard
            icon={PhilippinePeso}
            label="Total Coffee Sales"
            value={formatCurrency(coffeeSales.totalSelling)}
            sub="based on selling price"
            accent="text-gold"
          />
          <StatCard
            icon={PhilippinePeso}
            label="Est. Ingredient Cost"
            value={formatCurrency(coffeeSales.totalEstCost)}
            sub="based on recipes"
            accent="text-amber-400"
          />
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <Section title={`Orders by ${PERIOD_LABELS[period].replace('ly','').replace('nthly','nth')}`} icon={Coffee} onExport={exportCoffee}>
            <BarChartInline
              data={[...coffeeSales.rows].reverse()}
              valueKey="orders"
              labelKey="label"
              formatVal={(v) => `${v} orders`}
              color="bg-amber-500"
            />
          </Section>

          <Section title="Top Coffees Served" icon={Coffee}>
            {coffeeItemBreakdown.length === 0 ? (
              <p className="text-muted text-sm py-6 text-center">No orders yet.</p>
            ) : (
              <BarChartInline
                data={coffeeItemBreakdown.slice(0, 10)}
                valueKey="qty"
                labelKey="name"
                formatVal={(v) => `${v} served`}
                color="bg-amber-500"
              />
            )}
          </Section>
        </div>
      </div>

      {/* ── Inventory Snapshot ────────────────────────────────────────── */}
      <div>
        <h2 className="font-serif text-lg text-cream mb-4">Inventory Snapshot</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard
            icon={Package}
            label="Active Ingredients"
            value={inventoryStats.active.length}
            accent="text-blue-400"
          />
          <StatCard
            icon={PhilippinePeso}
            label="Total Stock Value"
            value={formatCurrency(inventoryStats.totalValue)}
            sub="at current unit cost"
            accent="text-blue-400"
          />
          <StatCard
            icon={AlertTriangle}
            label="Low Stock"
            value={inventoryStats.lowStock.length}
            sub="at or below alert threshold"
            accent="text-yellow-400"
          />
          <StatCard
            icon={AlertTriangle}
            label="Out of Stock"
            value={inventoryStats.outOfStock.length}
            sub="zero or negative qty"
            accent="text-danger"
          />
        </div>

        <Section title="Current Inventory" icon={Package} onExport={exportInventory}>
          {inventoryStats.active.length === 0 ? (
            <p className="text-muted text-sm py-6 text-center">No inventory items found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-muted uppercase tracking-wider border-b border-white/5">
                    <th className="pb-3 pr-4">Item</th>
                    <th className="pb-3 pr-4">UOM</th>
                    <th className="pb-3 pr-4 text-right">On Hand</th>
                    <th className="pb-3 pr-4 text-right">Unit Cost</th>
                    <th className="pb-3 text-right">Stock Value</th>
                    <th className="pb-3 pl-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {inventoryStats.active
                    .slice()
                    .sort((a, b) => {
                      const aLow = (a.stockQty ?? 0) <= (a.lowStockAt ?? 0);
                      const bLow = (b.stockQty ?? 0) <= (b.lowStockAt ?? 0);
                      if (aLow !== bLow) return aLow ? -1 : 1;
                      return (a.name || '').localeCompare(b.name || '');
                    })
                    .map((item) => {
                      const qty = item.stockQty ?? 0;
                      const threshold = item.lowStockAt ?? 0;
                      const value = qty * (item.unitCost ?? 0);
                      const isOut = qty <= 0;
                      const isLow = !isOut && qty <= threshold;
                      return (
                        <tr key={item.id} className={isOut ? 'opacity-60' : ''}>
                          <td className="py-3 pr-4">
                            <div className="font-medium text-cream">{item.name}</div>
                            {item.brand && <div className="text-xs text-muted">{item.brand}</div>}
                          </td>
                          <td className="py-3 pr-4 text-muted">{item.uom || '—'}</td>
                          <td className={`py-3 pr-4 text-right tabular-nums font-medium ${isOut ? 'text-danger' : isLow ? 'text-yellow-400' : 'text-cream'}`}>
                            {qty.toLocaleString()}
                          </td>
                          <td className="py-3 pr-4 text-right tabular-nums text-muted">
                            {formatCurrency(item.unitCost ?? 0)}
                          </td>
                          <td className="py-3 text-right tabular-nums text-cream">
                            {formatCurrency(value)}
                          </td>
                          <td className="py-3 pl-4">
                            {isOut ? (
                              <span className="text-[10px] uppercase tracking-widest text-danger bg-danger/10 border border-danger/30 rounded-full px-2 py-0.5">Out</span>
                            ) : isLow ? (
                              <span className="text-[10px] uppercase tracking-widest text-yellow-400 bg-yellow-400/10 border border-yellow-400/30 rounded-full px-2 py-0.5">Low</span>
                            ) : (
                              <span className="text-[10px] uppercase tracking-widest text-success bg-success/10 border border-success/30 rounded-full px-2 py-0.5">OK</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          )}
        </Section>
      </div>
    </div>
  );
}

export default function ReportsPage() {
  return (
    <ProtectedRoute permission={PERMISSIONS.REPORTS_VIEW}>
      <AdminLayout title="Reports">
        <Reports />
      </AdminLayout>
    </ProtectedRoute>
  );
}
