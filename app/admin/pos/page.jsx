'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Coffee,
  Plus,
  Minus,
  X,
  Check,
  Crown,
  User,
  Receipt,
  AlertTriangle,
  ClipboardList,
  Maximize2,
  Minimize2,
  Trash2,
} from 'lucide-react';
import { AdminLayout } from '@/components/AdminLayout';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useApp } from '@/context/AppContext';

// Keep centavos — ingredient costs run below ₱1.
const peso = (n) =>
  new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(n) || 0);

const num = (n) =>
  new Intl.NumberFormat('en-PH', { maximumFractionDigits: 3 }).format(Number(n) || 0);

const inputCls =
  'w-full bg-surface/70 border border-white/10 rounded-sm py-2.5 px-3 text-sm text-cream focus:outline-none focus:border-gold/50 transition-colors';
const labelCls = 'block text-[11px] uppercase tracking-widest text-cream/70 mb-1.5';

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */
function PosContent({ fullscreen = false, onToggle }) {
  const {
    coffees,
    members,
    coffeeRecipes,
    inventoryItems,
    posOrders,
    createPosOrder,
    deletePosOrder,
    isSuperAdmin,
    showToast,
  } = useApp();
  const router = useRouter();

  const [memberId, setMemberId] = useState('');   // '' = walk-in / no member
  const [note, setNote] = useState('');
  const [cart, setCart] = useState([]);           // [{ coffeeId, name, qty }]
  const [saving, setSaving] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const deleteOrder = async (id) => {
    const res = await deletePosOrder(id);
    if (res?.error) {
      showToast(res.error, 'error');
    } else {
      showToast('Order deleted.', 'success');
    }
    setConfirmDeleteId(null);
  };

  const approvedMembers = useMemo(
    () =>
      members
        .filter((m) => m.status === 'approved')
        .sort((a, b) => a.name.localeCompare(b.name)),
    [members]
  );

  const availableCoffees = useMemo(
    () =>
      [...coffees]
        .filter((c) => c.available !== false)
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.name.localeCompare(b.name)),
    [coffees]
  );

  const itemById = (id) => inventoryItems.find((i) => i.id === id);

  // Which coffees have a recipe mapped (so the barista knows stock will move).
  const recipeCountByCoffee = useMemo(() => {
    const map = new Map();
    coffeeRecipes.forEach((r) => map.set(r.coffeeId, (map.get(r.coffeeId) || 0) + 1));
    return map;
  }, [coffeeRecipes]);

  const coffeeById = (id) => coffees.find((c) => c.id === id);

  // Selling price set by the admin in the recipe editor (customer-facing).
  const sellingPriceOf = (coffeeId) => Number(coffeeById(coffeeId)?.sellingPrice) || 0;

  // Estimated ingredient cost per single serve — shown on coffee cards for reference.
  const costPerServe = (coffeeId) =>
    coffeeRecipes
      .filter((r) => r.coffeeId === coffeeId)
      .reduce((s, r) => {
        const it = itemById(r.itemId);
        return s + (it ? (Number(it.unitCost) || 0) * (Number(r.qtyPerServe) || 0) : 0);
      }, 0);

  const addToCart = (coffee) => {
    setCart((c) => {
      const existing = c.find((l) => l.coffeeId === coffee.id);
      if (existing) {
        return c.map((l) => (l.coffeeId === coffee.id ? { ...l, qty: l.qty + 1 } : l));
      }
      return [...c, { coffeeId: coffee.id, name: coffee.name, qty: 1 }];
    });
  };

  const setQty = (coffeeId, delta) =>
    setCart((c) =>
      c
        .map((l) => (l.coffeeId === coffeeId ? { ...l, qty: l.qty + delta } : l))
        .filter((l) => l.qty > 0)
    );

  const removeLine = (coffeeId) =>
    setCart((c) => c.filter((l) => l.coffeeId !== coffeeId));

  const itemCount = cart.reduce((s, l) => s + l.qty, 0);
  const cartTotal = cart.reduce((s, l) => s + sellingPriceOf(l.coffeeId) * l.qty, 0);

  const clearCart = () => {
    setCart([]);
    setNote('');
    setMemberId('');
  };

  const tender = async () => {
    if (cart.length === 0) {
      showToast('Add at least one coffee to the order.', 'error');
      return;
    }
    const member = approvedMembers.find((m) => m.id === memberId) || null;
    setSaving(true);
    const res = await createPosOrder({
      memberId: member ? member.id : null,
      memberName: member ? member.name : null,
      note: note.trim() || null,
      lines: cart.map((l) => ({ coffeeId: l.coffeeId, coffeeName: l.name, qty: l.qty })),
      sellingTotal: cartTotal,
    });
    setSaving(false);

    if (res?.error) {
      showToast(res.error, 'error');
      return;
    }
    const warnings = res.warnings || [];
    if (warnings.length > 0) {
      showToast(`Order tendered — ${warnings.length} stock warning(s). Check inventory.`, 'info');
    } else {
      showToast('Order tendered — inventory updated.', 'success');
    }
    clearCart();
  };

  const recentOrders = useMemo(() => posOrders.slice(0, 15), [posOrders]);

  return (
    <div className={fullscreen ? 'px-6 md:px-10 py-8 max-w-[1600px] mx-auto' : ''}>
      {/* Fullscreen-only header (in normal mode AdminLayout supplies the title) */}
      {fullscreen && (
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-gold" />
            <h1 className="font-serif text-2xl text-cream">Coffee POS</h1>
          </div>
          <button
            onClick={onToggle}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm border border-white/10 text-cream/85 rounded-sm hover:border-gold/50 transition-colors"
          >
            <Minimize2 className="w-4 h-4" /> Exit fullscreen
          </button>
        </div>
      )}

      <div className="flex items-start justify-between gap-4 mb-6">
        <p className="text-sm text-muted max-w-3xl">
          Serve a VIP member&apos;s coffee. Tendering an order deducts each drink&apos;s recipe from
          ingredient inventory — this is where coffee stock is consumed (booking completion no longer
          deducts stock).
        </p>
        {!fullscreen && (
          <button
            onClick={onToggle}
            aria-label="Enter fullscreen"
            title="Fullscreen (register mode)"
            className="shrink-0 inline-flex items-center gap-2 px-3 py-2 text-sm border border-white/10 text-cream/85 rounded-sm hover:border-gold/50 transition-colors"
          >
            <Maximize2 className="w-4 h-4" /> Fullscreen
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6 items-start">
        {/* Menu */}
        <div>
          <div className="text-[10px] uppercase tracking-widest text-muted mb-3">Coffee Menu</div>
          {availableCoffees.length === 0 ? (
            <div className="glass-card rounded-md py-16 text-center text-muted">
              <Coffee className="w-8 h-8 mx-auto mb-3 opacity-40" />
              No available coffees. Add drinks in Coffee Menu first.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {availableCoffees.map((c) => {
                const price = sellingPriceOf(c.id);
                return (
                  <button
                    key={c.id}
                    onClick={() => addToCart(c)}
                    className="glass-card card-hover rounded-md p-4 text-left flex flex-col gap-2 group"
                  >
                    <div className="flex items-start justify-between">
                      <Coffee className="w-5 h-5 text-gold shrink-0" />
                      <Plus className="w-4 h-4 text-cream/40 group-hover:text-gold transition-colors" />
                    </div>
                    <div className="text-cream font-medium leading-tight">{c.name}</div>
                    <div className="text-[11px] mt-auto">
                      {price > 0 ? (
                        <span className="text-gold font-medium">{peso(price)}</span>
                      ) : (
                        <span className="text-cream/40 italic">No price set</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Cart / order */}
        <div className="glass-card rounded-md p-5 lg:sticky lg:top-24">
          <div className="flex items-center gap-2 mb-4">
            <Receipt className="w-4 h-4 text-gold" />
            <h3 className="font-serif text-xl text-cream">Current Order</h3>
          </div>

          <div className="mb-4">
            <label className={labelCls}>Member (VIP)</label>
            <div className="relative">
              <Crown className="w-3.5 h-3.5 text-gold absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <select
                className={`${inputCls} pl-8`}
                value={memberId}
                onChange={(e) => setMemberId(e.target.value)}
              >
                <option value="">Walk-in / no member</option>
                {approvedMembers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                    {m.nickname ? ` (${m.nickname})` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {cart.length === 0 ? (
            <div className="py-8 text-center text-muted text-sm border border-dashed border-white/10 rounded-sm">
              Tap a coffee to add it here.
            </div>
          ) : (
            <div className="space-y-2 mb-4">
              {cart.map((l) => (
                <div
                  key={l.coffeeId}
                  className="flex items-center gap-2 bg-surface/60 border border-white/5 rounded-sm px-3 py-2"
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-cream truncate">{l.name}</div>
                    <div className="text-[11px] text-muted">
                      {peso(sellingPriceOf(l.coffeeId) * l.qty)}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => setQty(l.coffeeId, -1)}
                      aria-label="Decrease quantity"
                      className="p-1.5 rounded-sm text-cream/70 hover:text-gold hover:bg-gold/10 transition-colors"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="w-6 text-center text-sm text-cream font-medium">{l.qty}</span>
                    <button
                      onClick={() => setQty(l.coffeeId, 1)}
                      aria-label="Increase quantity"
                      className="p-1.5 rounded-sm text-cream/70 hover:text-gold hover:bg-gold/10 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => removeLine(l.coffeeId)}
                      aria-label="Remove item"
                      className="p-1.5 rounded-sm text-cream/60 hover:text-danger hover:bg-danger/10 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mb-4">
            <label className={labelCls}>Note (optional)</label>
            <input
              className={inputCls}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. extra hot, no sugar"
            />
          </div>

          <div className="flex items-center justify-between text-sm border-t border-white/5 pt-3 mb-4">
            <span className="text-muted">
              {itemCount} item{itemCount === 1 ? '' : 's'} · total
            </span>
            <span className="text-gold font-semibold">{peso(cartTotal)}</span>
          </div>

          <div className="flex gap-2">
            <button
              onClick={clearCart}
              disabled={cart.length === 0 || saving}
              className="px-4 py-2.5 border border-white/10 text-cream/85 rounded-sm hover:border-gold/50 transition-colors disabled:opacity-40"
            >
              Clear
            </button>
            <button
              onClick={tender}
              disabled={cart.length === 0 || saving}
              className="flex-1 px-4 py-2.5 bg-gold text-obsidian font-semibold rounded-sm hover:bg-gold-light transition-colors disabled:opacity-50 inline-flex items-center justify-center gap-2"
            >
              {saving ? 'Tendering…' : (<><Check className="w-4 h-4" /> Tender &amp; Serve</>)}
            </button>
          </div>
        </div>
      </div>

      {/* Recent orders */}
      <div className="mt-10">
        <div className="flex items-center gap-2 mb-3">
          <ClipboardList className="w-4 h-4 text-gold" />
          <h3 className="font-serif text-xl text-cream">Recent Orders</h3>
        </div>
        {recentOrders.length === 0 ? (
          <div className="glass-card rounded-md py-12 text-center text-muted text-sm">
            No coffee orders tendered yet.
          </div>
        ) : (
          <div className="glass-card rounded-md overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-widest text-muted border-b border-white/5">
                  <th className="px-4 py-3 font-medium">When</th>
                  <th className="px-4 py-3 font-medium">Member</th>
                  <th className="px-4 py-3 font-medium">Coffees</th>
                  <th className="px-4 py-3 font-medium text-right">Items</th>
                  <th className="px-4 py-3 font-medium text-right">Total</th>
                  {isSuperAdmin && <th className="px-4 py-3 font-medium w-10" />}
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((o) => (
                  <tr key={o.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                    <td className="px-4 py-3 text-muted text-xs whitespace-nowrap">
                      {new Date(o.createdAt).toLocaleString('en-PH', {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </td>
                    <td className="px-4 py-3">
                      {o.memberName ? (
                        o.memberId ? (
                          <button
                            onClick={() => router.push(`/admin/members/${o.memberId}`)}
                            className="inline-flex items-center gap-1.5 text-cream hover:text-gold transition-colors"
                            title="View member profile"
                          >
                            <Crown className="w-3.5 h-3.5 text-gold" />
                            {o.memberName}
                          </button>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-cream">
                            <Crown className="w-3.5 h-3.5 text-gold" />
                            {o.memberName}
                          </span>
                        )
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-muted">
                          <User className="w-3.5 h-3.5" />
                          Walk-in
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-cream/85">
                      {(o.items || [])
                        .map((li) => (li.qty > 1 ? `${li.coffeeName} ×${li.qty}` : li.coffeeName))
                        .join(', ') || '—'}
                    </td>
                    <td className="px-4 py-3 text-right text-cream">{num(o.itemCount)}</td>
                    <td className="px-4 py-3 text-right text-muted">{peso(o.sellingTotal ?? o.totalCost)}</td>
                    {isSuperAdmin && (
                      <td className="px-4 py-3 text-right">
                        {confirmDeleteId === o.id ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => deleteOrder(o.id)}
                              className="px-2 py-1 text-[11px] bg-danger/20 text-danger border border-danger/30 rounded-sm hover:bg-danger/30 transition-colors"
                            >
                              Confirm
                            </button>
                            <button
                              onClick={() => setConfirmDeleteId(null)}
                              className="px-2 py-1 text-[11px] border border-white/10 text-cream/60 rounded-sm hover:border-white/20 transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmDeleteId(o.id)}
                            aria-label="Delete order"
                            className="p-1.5 text-cream/30 hover:text-danger hover:bg-danger/10 rounded-sm transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="text-xs text-muted mt-4 flex items-start gap-1.5 max-w-3xl">
        <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 opacity-60" />
        Coffees without a mapped recipe record the order but deduct no stock. Set recipes under
        Inventory → Coffee Recipes.
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  View — handles the fullscreen (register mode) toggle              */
/* ------------------------------------------------------------------ */
function PosView() {
  const [fullscreen, setFullscreen] = useState(false);

  const enterFullscreen = () => {
    setFullscreen(true);
    document.documentElement.requestFullscreen?.().catch(() => {});
  };

  const exitFullscreen = () => {
    setFullscreen(false);
    if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
  };

  const toggle = fullscreen ? exitFullscreen : enterFullscreen;

  // Sync state when the user leaves fullscreen natively (Esc / browser UI).
  useEffect(() => {
    const handler = () => {
      if (!document.fullscreenElement) setFullscreen(false);
    };
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  if (fullscreen) {
    return (
      <div className="fixed inset-0 z-[9999] bg-obsidian overflow-auto">
        <PosContent fullscreen onToggle={toggle} />
      </div>
    );
  }

  return (
    <AdminLayout title="Coffee POS">
      <PosContent fullscreen={false} onToggle={toggle} />
    </AdminLayout>
  );
}

export default function AdminPosPage() {
  return (
    <ProtectedRoute permission="pos.serve">
      <PosView />
    </ProtectedRoute>
  );
}
