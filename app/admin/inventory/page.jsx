'use client';

import { useMemo, useState } from 'react';
import {
  Package,
  Plus,
  Pencil,
  Trash2,
  X,
  Check,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  History,
  Coffee,
  ClipboardList,
} from 'lucide-react';
import { AdminLayout } from '@/components/AdminLayout';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useApp } from '@/context/AppContext';

// Local peso formatter that keeps centavos — the shared formatCurrency rounds
// to whole pesos, which would hide unit costs like ₱0.95.
const peso = (n) =>
  new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(n) || 0);

const num = (n) =>
  new Intl.NumberFormat('en-PH', { maximumFractionDigits: 3 }).format(Number(n) || 0);

const UOM_OPTIONS = ['Grams', 'Kilo', 'Liter', 'ml', 'Pc', 'Box', 'Pack'];

const EMPTY_ITEM = {
  brand: '',
  name: '',
  description: '',
  type: '',
  uom: 'Pc',
  packVolume: '',
  unitCost: '',
  stockQty: '',
  lowStockAt: '',
  isActive: true,
  sortOrder: 0,
};

const inputCls =
  'w-full bg-surface/70 border border-white/10 rounded-sm py-2.5 px-3 text-sm text-cream focus:outline-none focus:border-gold/50 transition-colors';
const labelCls = 'block text-[11px] uppercase tracking-widest text-cream/70 mb-1.5';

/* ------------------------------------------------------------------ */
/*  Add / Edit item form                                               */
/* ------------------------------------------------------------------ */
function ItemForm({ initial, onSave, onCancel, isSaving }) {
  const [form, setForm] = useState(
    initial
      ? {
          ...EMPTY_ITEM,
          ...initial,
          packVolume: initial.packVolume ?? '',
          unitCost: initial.unitCost ?? '',
          lowStockAt: initial.lowStockAt ?? '',
        }
      : { ...EMPTY_ITEM }
  );
  const [error, setError] = useState('');
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  const submit = (e) => {
    e.preventDefault();
    if (!form.name.trim()) { setError('Item name is required.'); return; }
    setError('');
    onSave(form);
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Brand</label>
          <input className={inputCls} value={form.brand}
            onChange={(e) => set({ brand: e.target.value })} placeholder="e.g. Artisanal" />
        </div>
        <div>
          <label className={labelCls}>Item Name *</label>
          <input className={inputCls} autoFocus value={form.name}
            onChange={(e) => set({ name: e.target.value })} placeholder="e.g. Coffee Beans" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Type</label>
          <input className={inputCls} value={form.type}
            onChange={(e) => set({ type: e.target.value })} placeholder="e.g. Beans, Milk, Syrup" />
        </div>
        <div>
          <label className={labelCls}>Description</label>
          <input className={inputCls} value={form.description}
            onChange={(e) => set({ description: e.target.value })} placeholder="Optional" />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className={labelCls}>UOM</label>
          <input list="uom-list" className={inputCls} value={form.uom}
            onChange={(e) => set({ uom: e.target.value })} placeholder="Pc" />
          <datalist id="uom-list">
            {UOM_OPTIONS.map((u) => <option key={u} value={u} />)}
          </datalist>
        </div>
        <div>
          <label className={labelCls}>Pack Volume</label>
          <input type="number" step="any" min="0" className={inputCls} value={form.packVolume}
            onChange={(e) => set({ packVolume: e.target.value })} placeholder="1000" />
        </div>
        <div>
          <label className={labelCls}>Unit Cost (A/V) ₱</label>
          <input type="number" step="any" min="0" className={inputCls} value={form.unitCost}
            onChange={(e) => set({ unitCost: e.target.value })} placeholder="0.95" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>
            {initial ? 'On-hand Stock (read-only)' : 'Opening Stock'}
          </label>
          <input type="number" step="any" className={inputCls}
            value={initial ? (initial.stockQty ?? 0) : form.stockQty}
            disabled={!!initial}
            onChange={(e) => set({ stockQty: e.target.value })} placeholder="0" />
          {initial && (
            <div className="text-[11px] text-muted mt-1">Use Restock / Adjust to change stock.</div>
          )}
        </div>
        <div>
          <label className={labelCls}>Low-stock Alert At</label>
          <input type="number" step="any" min="0" className={inputCls} value={form.lowStockAt}
            onChange={(e) => set({ lowStockAt: e.target.value })} placeholder="0 = no alert" />
        </div>
      </div>

      <div className="flex items-center gap-3 py-1">
        <button type="button"
          onClick={() => set({ isActive: !form.isActive })}
          className={`w-10 h-6 rounded-full transition-colors relative shrink-0 overflow-hidden ${
            form.isActive ? 'bg-gold' : 'bg-white/10'
          }`}
        >
          <span className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
            form.isActive ? 'translate-x-4' : 'translate-x-0'
          }`} />
        </button>
        <div>
          <div className="text-sm text-cream">Active</div>
          <div className="text-xs text-muted">Inactive items are hidden from recipe pickers</div>
        </div>
      </div>

      {error && <div className="text-[11px] text-danger">{error}</div>}

      <div className="flex gap-3 pt-2 border-t border-white/5">
        <button type="button" onClick={onCancel}
          className="flex-1 px-4 py-2.5 border border-white/10 text-cream/85 rounded-sm hover:border-gold/50 transition-colors">
          Cancel
        </button>
        <button type="submit" disabled={isSaving}
          className="flex-1 px-4 py-2.5 bg-gold text-obsidian font-semibold rounded-sm hover:bg-gold-light transition-colors disabled:opacity-60 inline-flex items-center justify-center gap-2">
          {isSaving ? 'Saving…' : (<><Check className="w-4 h-4" />{initial ? 'Save Changes' : 'Add Item'}</>)}
        </button>
      </div>
    </form>
  );
}

/* ------------------------------------------------------------------ */
/*  Restock / adjust modal                                             */
/* ------------------------------------------------------------------ */
function AdjustForm({ item, onSave, onCancel, isSaving }) {
  const [mode, setMode] = useState('restock'); // restock | adjustment
  const [qty, setQty] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  const submit = (e) => {
    e.preventDefault();
    const n = Number(qty);
    if (!Number.isFinite(n) || n === 0) { setError('Enter a non-zero quantity.'); return; }
    // Restock is always additive; adjustment accepts a signed value.
    const delta = mode === 'restock' ? Math.abs(n) : n;
    setError('');
    onSave({ delta, reason: mode, note: note.trim() || null });
  };

  const projected = (Number(item.stockQty) || 0) + (mode === 'restock' ? Math.abs(Number(qty) || 0) : (Number(qty) || 0));

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="bg-surface/60 rounded-sm p-3 border border-white/5 text-sm">
        <div className="text-cream font-medium">{item.name}</div>
        <div className="text-muted text-xs mt-0.5">
          On hand: <span className="text-cream">{num(item.stockQty)} {item.uom}</span>
        </div>
      </div>

      <div className="flex gap-2">
        {[
          { key: 'restock', label: 'Restock (+)', icon: TrendingUp },
          { key: 'adjustment', label: 'Adjust (±)', icon: TrendingDown },
        ].map((m) => {
          const I = m.icon;
          const active = mode === m.key;
          return (
            <button key={m.key} type="button" onClick={() => setMode(m.key)}
              className={`flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-sm text-sm border transition-colors ${
                active ? 'bg-gold/10 text-gold border-gold/40' : 'border-white/10 text-cream/70 hover:border-gold/30'
              }`}>
              <I className="w-4 h-4" />{m.label}
            </button>
          );
        })}
      </div>

      <div>
        <label className={labelCls}>
          {mode === 'restock' ? `Quantity to add (${item.uom})` : `Signed change (${item.uom}) — use − to remove`}
        </label>
        <input type="number" step="any" autoFocus className={inputCls} value={qty}
          onChange={(e) => setQty(e.target.value)} placeholder={mode === 'restock' ? '100' : '-5'} />
        {qty !== '' && (
          <div className="text-[11px] text-muted mt-1">
            New on-hand: <span className={projected < 0 ? 'text-danger' : 'text-cream'}>{num(projected)} {item.uom}</span>
          </div>
        )}
      </div>

      <div>
        <label className={labelCls}>Note</label>
        <input className={inputCls} value={note}
          onChange={(e) => setNote(e.target.value)} placeholder="e.g. Delivery from supplier" />
      </div>

      {error && <div className="text-[11px] text-danger">{error}</div>}

      <div className="flex gap-3 pt-2 border-t border-white/5">
        <button type="button" onClick={onCancel}
          className="flex-1 px-4 py-2.5 border border-white/10 text-cream/85 rounded-sm hover:border-gold/50 transition-colors">
          Cancel
        </button>
        <button type="submit" disabled={isSaving}
          className="flex-1 px-4 py-2.5 bg-gold text-obsidian font-semibold rounded-sm hover:bg-gold-light transition-colors disabled:opacity-60 inline-flex items-center justify-center gap-2">
          {isSaving ? 'Saving…' : (<><Check className="w-4 h-4" />Apply</>)}
        </button>
      </div>
    </form>
  );
}

/* ------------------------------------------------------------------ */
/*  Recipe editor — coffee → ingredients bill of materials             */
/* ------------------------------------------------------------------ */
function RecipeForm({ coffee, items, initialLines, onSave, onCancel, isSaving }) {
  const [lines, setLines] = useState(
    initialLines.length > 0
      ? initialLines.map((l) => ({ itemId: l.itemId, qtyPerServe: String(l.qtyPerServe) }))
      : [{ itemId: '', qtyPerServe: '' }]
  );
  const [sellingPrice, setSellingPrice] = useState(String(coffee.sellingPrice ?? coffee.selling_price ?? ''));

  const setLine = (i, patch) =>
    setLines((ls) => ls.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  const addLine = () => setLines((ls) => [...ls, { itemId: '', qtyPerServe: '' }]);
  const removeLine = (i) => setLines((ls) => ls.filter((_, idx) => idx !== i));

  const activeItems = items.filter((it) => it.isActive !== false);
  const itemById = (id) => items.find((it) => it.id === id);

  const costPerServe = lines.reduce((sum, l) => {
    const it = itemById(l.itemId);
    return sum + (it ? (Number(it.unitCost) || 0) * (Number(l.qtyPerServe) || 0) : 0);
  }, 0);

  return (
    <div className="space-y-4">
      <div className="space-y-2 max-h-[46vh] overflow-y-auto pr-1">
        {lines.map((l, i) => {
          const it = itemById(l.itemId);
          return (
            <div key={i} className="flex items-start gap-2">
              <div className="flex-1">
                <select className={inputCls} value={l.itemId}
                  onChange={(e) => setLine(i, { itemId: e.target.value })}>
                  <option value="">Select ingredient…</option>
                  {activeItems.map((it2) => (
                    <option key={it2.id} value={it2.id}>
                      {it2.brand ? `${it2.brand} — ` : ''}{it2.name} ({it2.uom})
                    </option>
                  ))}
                </select>
              </div>
              <div className="w-28">
                <input type="number" step="any" min="0" className={inputCls}
                  value={l.qtyPerServe}
                  onChange={(e) => setLine(i, { qtyPerServe: e.target.value })}
                  placeholder={it ? `qty ${it.uom}` : 'qty'} />
              </div>
              <button type="button" onClick={() => removeLine(i)} aria-label="Remove line"
                className="p-2.5 text-cream/60 hover:text-danger hover:bg-danger/10 rounded-sm transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>

      <button type="button" onClick={addLine}
        className="inline-flex items-center gap-1.5 text-xs text-gold hover:text-gold-light transition-colors">
        <Plus className="w-3.5 h-3.5" /> Add ingredient
      </button>

      <div className="flex items-center justify-between text-sm border-t border-white/5 pt-3">
        <span className="text-muted">Estimated cost / serve</span>
        <span className="text-gold font-semibold">{peso(costPerServe)}</span>
      </div>

      <div className="flex items-center justify-between border-t border-white/5 pt-3">
        <span className="text-muted text-sm">Selling price / serve</span>
        <div className="relative w-36">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-sm pointer-events-none">₱</span>
          <input
            type="number" step="0.01" min="0"
            className={`${inputCls} pl-7`}
            value={sellingPrice}
            onChange={(e) => setSellingPrice(e.target.value)}
            placeholder="0.00"
          />
        </div>
      </div>

      <div className="flex gap-3">
        <button type="button" onClick={onCancel}
          className="flex-1 px-4 py-2.5 border border-white/10 text-cream/85 rounded-sm hover:border-gold/50 transition-colors">
          Cancel
        </button>
        <button type="button" disabled={isSaving}
          onClick={() => onSave(lines, Math.max(0, Number(sellingPrice) || 0))}
          className="flex-1 px-4 py-2.5 bg-gold text-obsidian font-semibold rounded-sm hover:bg-gold-light transition-colors disabled:opacity-60 inline-flex items-center justify-center gap-2">
          {isSaving ? 'Saving…' : (<><Check className="w-4 h-4" />Save Recipe</>)}
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */
function InventoryAdmin() {
  const {
    inventoryItems,
    inventoryTransactions,
    coffees,
    coffeeRecipes,
    upsertInventoryItem,
    deleteInventoryItem,
    adjustInventoryItem,
    setCoffeeRecipe,
    getRecipeForCoffee,
    upsertCoffee,
    showToast,
  } = useApp();

  const [tab, setTab] = useState('items'); // items | recipes | history
  const [itemModal, setItemModal] = useState(null);     // { mode, item? }
  const [adjustModal, setAdjustModal] = useState(null);  // item
  const [recipeModal, setRecipeModal] = useState(null);  // coffee
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [saving, setSaving] = useState(false);

  const items = useMemo(
    () => [...inventoryItems].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.name.localeCompare(b.name)),
    [inventoryItems]
  );

  const lowStock = items.filter(
    (i) => (i.lowStockAt ?? 0) > 0 && (Number(i.stockQty) || 0) <= Number(i.lowStockAt)
  );
  const totalValue = items.reduce((s, i) => s + (Number(i.stockQty) || 0) * (Number(i.unitCost) || 0), 0);

  const itemById = (id) => items.find((i) => i.id === id);

  const saveItem = async (data) => {
    setSaving(true);
    const res = await upsertInventoryItem(itemModal.mode === 'edit' ? { ...data, id: itemModal.item.id } : data);
    setSaving(false);
    if (res?.error) { showToast(res.error, 'error'); return; }
    showToast(itemModal.mode === 'edit' ? 'Item updated.' : 'Item added.', 'success');
    setItemModal(null);
  };

  const applyAdjust = async ({ delta, reason, note }) => {
    setSaving(true);
    const res = await adjustInventoryItem(adjustModal.id, delta, reason, note);
    setSaving(false);
    if (res?.error) { showToast(res.error, 'error'); return; }
    showToast('Stock updated.', 'success');
    setAdjustModal(null);
  };

  const saveRecipe = async (lines, sellingPrice) => {
    setSaving(true);
    const [recipeRes, priceRes] = await Promise.all([
      setCoffeeRecipe(recipeModal.id, lines),
      upsertCoffee({ ...recipeModal, sellingPrice }),
    ]);
    setSaving(false);
    if (recipeRes?.error) { showToast(recipeRes.error, 'error'); return; }
    if (priceRes?.error) { showToast(priceRes.error, 'error'); return; }
    showToast(`Recipe for "${recipeModal.name}" saved.`, 'success');
    setRecipeModal(null);
  };

  const doDelete = async () => {
    if (!confirmDelete) return;
    const res = await deleteInventoryItem(confirmDelete.id);
    if (res?.error) showToast(res.error, 'error');
    else showToast(`"${confirmDelete.name}" removed.`, 'success');
    setConfirmDelete(null);
  };

  const tabs = [
    { key: 'items', label: 'Ingredients', icon: Package },
    { key: 'recipes', label: 'Coffee Recipes', icon: Coffee },
    { key: 'history', label: 'Movements', icon: History },
  ];

  return (
    <AdminLayout title="Inventory">
      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatCard label="Ingredients" value={items.length} />
        <StatCard label="Low Stock" value={lowStock.length} danger={lowStock.length > 0} />
        <StatCard label="Coffees Mapped" value={new Set(coffeeRecipes.map((r) => r.coffeeId)).size} />
        <StatCard label="Stock Value" value={peso(totalValue)} />
      </div>

      {lowStock.length > 0 && (
        <div className="mb-6 flex items-start gap-2 rounded-md border border-danger/30 bg-danger/10 px-4 py-3 text-sm">
          <AlertTriangle className="w-4 h-4 text-danger shrink-0 mt-0.5" />
          <div className="text-cream/90">
            <span className="text-danger font-medium">{lowStock.length} item(s) at or below reorder level:</span>{' '}
            {lowStock.map((i) => i.name).join(', ')}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 mb-5 border-b border-white/5">
        {tabs.map((t) => {
          const I = t.icon;
          const active = tab === t.key;
          return (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm border-b-2 -mb-px transition-colors ${
                active ? 'border-gold text-gold' : 'border-transparent text-cream/60 hover:text-cream'
              }`}>
              <I className="w-4 h-4" />{t.label}
            </button>
          );
        })}
        {tab === 'items' && (
          <button onClick={() => setItemModal({ mode: 'add' })}
            className="ml-auto inline-flex items-center gap-2 px-4 py-2 bg-gold text-obsidian font-semibold text-sm rounded-sm hover:bg-gold-light transition-colors">
            <Plus className="w-4 h-4" /> Add Item
          </button>
        )}
      </div>

      {tab === 'items' && (
        items.length === 0 ? (
          <EmptyState icon={Package} text="No ingredients yet. Add your first coffee consumable." />
        ) : (
          <div className="glass-card rounded-md overflow-x-auto">
            <table className="w-full text-sm min-w-[880px]">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-widest text-muted border-b border-white/5">
                  <th className="px-4 py-3 font-medium">Brand</th>
                  <th className="px-4 py-3 font-medium">Item</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">UOM</th>
                  <th className="px-4 py-3 font-medium text-right">Volume</th>
                  <th className="px-4 py-3 font-medium text-right">Unit Cost</th>
                  <th className="px-4 py-3 font-medium text-right">On Hand</th>
                  <th className="px-4 py-3 font-medium text-right">Value</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it) => {
                  const qty = Number(it.stockQty) || 0;
                  const low = (it.lowStockAt ?? 0) > 0 && qty <= Number(it.lowStockAt);
                  return (
                    <tr key={it.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                      <td className="px-4 py-3 text-muted">{it.brand || '—'}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className={`text-cream font-medium ${it.isActive === false ? 'opacity-50 line-through' : ''}`}>{it.name}</span>
                          {low && <span className="text-[9px] uppercase tracking-widest bg-danger/15 text-danger px-1.5 py-0.5 rounded-sm">Low</span>}
                        </div>
                        {it.description && <div className="text-[11px] text-muted">{it.description}</div>}
                      </td>
                      <td className="px-4 py-3 text-muted">{it.type || '—'}</td>
                      <td className="px-4 py-3 text-muted">{it.uom}</td>
                      <td className="px-4 py-3 text-right text-muted">{it.packVolume != null ? num(it.packVolume) : '—'}</td>
                      <td className="px-4 py-3 text-right text-cream">{peso(it.unitCost)}</td>
                      <td className={`px-4 py-3 text-right font-medium ${qty < 0 ? 'text-danger' : low ? 'text-gold' : 'text-cream'}`}>
                        {num(qty)}
                      </td>
                      <td className="px-4 py-3 text-right text-muted">{peso(qty * (Number(it.unitCost) || 0))}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => setAdjustModal(it)} title="Restock / Adjust" aria-label="Restock or adjust"
                            className="p-2 text-cream/70 hover:text-success hover:bg-success/10 rounded-sm transition-colors">
                            <TrendingUp className="w-4 h-4" />
                          </button>
                          <button onClick={() => setItemModal({ mode: 'edit', item: it })} title="Edit" aria-label="Edit"
                            className="p-2 text-cream/70 hover:text-gold hover:bg-gold/10 rounded-sm transition-colors">
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button onClick={() => setConfirmDelete(it)} title="Delete" aria-label="Delete"
                            className="p-2 text-cream/70 hover:text-danger hover:bg-danger/10 rounded-sm transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      )}

      {tab === 'recipes' && (
        coffees.length === 0 ? (
          <EmptyState icon={Coffee} text="No coffees on the menu yet. Add drinks in Coffee Menu first." />
        ) : (
          <div className="glass-card rounded-md overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-widest text-muted border-b border-white/5">
                  <th className="px-4 py-3 font-medium">Coffee</th>
                  <th className="px-4 py-3 font-medium">Recipe (per serve)</th>
                  <th className="px-4 py-3 font-medium text-right">Cost / Serve</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {coffees.map((c) => {
                  const recipe = getRecipeForCoffee(c.id);
                  const cost = recipe.reduce((s, r) => {
                    const it = itemById(r.itemId);
                    return s + (it ? (Number(it.unitCost) || 0) * (Number(r.qtyPerServe) || 0) : 0);
                  }, 0);
                  return (
                    <tr key={c.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Coffee className="w-3.5 h-3.5 text-gold shrink-0" />
                          <span className="text-cream font-medium">{c.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted">
                        {recipe.length === 0 ? (
                          <span className="text-[11px] italic text-muted/70">No recipe — no stock deducted on serve</span>
                        ) : (
                          <div className="flex flex-wrap gap-1.5">
                            {recipe.map((r) => {
                              const it = itemById(r.itemId);
                              return (
                                <span key={r.id} className="text-[11px] bg-surface/60 border border-white/5 rounded-sm px-2 py-0.5 text-cream/80">
                                  {it ? it.name : 'Unknown'} · {num(r.qtyPerServe)}{it ? ` ${it.uom}` : ''}
                                </span>
                              );
                            })}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-gold">{recipe.length ? peso(cost) : '—'}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end">
                          <button onClick={() => setRecipeModal(c)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs border border-white/10 text-cream/85 rounded-sm hover:border-gold/50 transition-colors">
                            <ClipboardList className="w-3.5 h-3.5" />
                            {recipe.length ? 'Edit' : 'Set'} Recipe
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      )}

      {tab === 'history' && (
        inventoryTransactions.length === 0 ? (
          <EmptyState icon={History} text="No stock movements yet." />
        ) : (
          <div className="glass-card rounded-md overflow-x-auto">
            <table className="w-full text-sm min-w-[720px]">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-widest text-muted border-b border-white/5">
                  <th className="px-4 py-3 font-medium">When</th>
                  <th className="px-4 py-3 font-medium">Item</th>
                  <th className="px-4 py-3 font-medium">Reason</th>
                  <th className="px-4 py-3 font-medium text-right">Change</th>
                  <th className="px-4 py-3 font-medium">Detail</th>
                </tr>
              </thead>
              <tbody>
                {inventoryTransactions.map((tx) => {
                  const it = itemById(tx.itemId);
                  const inbound = Number(tx.qtyChange) >= 0;
                  return (
                    <tr key={tx.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                      <td className="px-4 py-3 text-muted text-xs whitespace-nowrap">
                        {new Date(tx.createdAt).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' })}
                      </td>
                      <td className="px-4 py-3 text-cream">{it ? it.name : '(deleted item)'}</td>
                      <td className="px-4 py-3">
                        <span className="text-[10px] uppercase tracking-widest text-cream/70">{tx.reason}</span>
                      </td>
                      <td className={`px-4 py-3 text-right font-medium ${inbound ? 'text-success' : 'text-danger'}`}>
                        {inbound ? '+' : ''}{num(tx.qtyChange)}{it ? ` ${it.uom}` : ''}
                      </td>
                      <td className="px-4 py-3 text-muted text-xs">
                        {tx.coffeeName ? `Served: ${tx.coffeeName}` : tx.note || '—'}
                        {tx.bookingId && <span className="text-muted/60"> · {tx.bookingId}</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      )}

      <p className="text-xs text-muted mt-4">
        Stock is deducted automatically when a booking with a coffee order is marked <span className="text-cream">completed</span> — using that coffee&apos;s recipe. Each serve is deducted once.
      </p>

      {/* Modals */}
      {itemModal && (
        <Modal title={itemModal.mode === 'edit' ? `Edit "${itemModal.item.name}"` : 'Add Ingredient'} onClose={() => setItemModal(null)} wide>
          <ItemForm
            initial={itemModal.mode === 'edit' ? itemModal.item : undefined}
            onSave={saveItem} onCancel={() => setItemModal(null)} isSaving={saving} />
        </Modal>
      )}

      {adjustModal && (
        <Modal title="Restock / Adjust" onClose={() => setAdjustModal(null)}>
          <AdjustForm item={adjustModal} onSave={applyAdjust} onCancel={() => setAdjustModal(null)} isSaving={saving} />
        </Modal>
      )}

      {recipeModal && (
        <Modal title={`Recipe — ${recipeModal.name}`} onClose={() => setRecipeModal(null)} wide>
          <RecipeForm
            coffee={recipeModal}
            items={items}
            initialLines={getRecipeForCoffee(recipeModal.id)}
            onSave={saveRecipe}
            onCancel={() => setRecipeModal(null)}
            isSaving={saving}
          />
        </Modal>
      )}

      {confirmDelete && (
        <Modal title="Remove ingredient?" onClose={() => setConfirmDelete(null)}>
          <p className="text-muted text-sm mb-4">
            This removes it from inventory and from any coffee recipe. Movement history is kept.
          </p>
          <div className="bg-surface/60 rounded-sm p-4 mb-5 border border-white/5 flex items-center gap-2">
            <Package className="w-4 h-4 text-gold shrink-0" />
            <span className="text-cream font-medium">{confirmDelete.name}</span>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setConfirmDelete(null)}
              className="flex-1 px-4 py-2.5 border border-white/10 text-cream/85 rounded-sm hover:border-gold/50 transition-colors">
              Cancel
            </button>
            <button onClick={doDelete}
              className="flex-1 px-4 py-2.5 bg-danger text-white rounded-sm hover:bg-danger/90 transition-colors inline-flex items-center justify-center gap-2">
              <AlertTriangle className="w-4 h-4" /> Remove
            </button>
          </div>
        </Modal>
      )}
    </AdminLayout>
  );
}

function StatCard({ label, value, danger }) {
  return (
    <div className="glass-card rounded-md p-4">
      <div className="text-[10px] uppercase tracking-widest text-muted">{label}</div>
      <div className={`text-2xl font-serif mt-1 ${danger ? 'text-danger' : 'text-cream'}`}>{value}</div>
    </div>
  );
}

function EmptyState({ icon: Icon, text }) {
  return (
    <div className="glass-card rounded-md py-20 text-center text-muted">
      <Icon className="w-8 h-8 mx-auto mb-3 opacity-40" />
      {text}
    </div>
  );
}

function Modal({ title, onClose, children, wide }) {
  return (
    <div onClick={onClose} className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-5 animate-fade-in">
      <div onClick={(e) => e.stopPropagation()} className={`glass-card rounded-md w-full ${wide ? 'max-w-lg' : 'max-w-sm'} p-6`}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-serif text-2xl text-cream">{title}</h3>
          <button onClick={onClose} aria-label="Close" className="text-cream/70 hover:text-cream">
            <X className="w-5 h-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default function AdminInventoryPage() {
  return (
    <ProtectedRoute permission="inventory.manage">
      <InventoryAdmin />
    </ProtectedRoute>
  );
}
