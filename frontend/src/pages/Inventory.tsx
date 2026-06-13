import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api';
import {
  Plus, Search, Edit2, Trash2, X, AlertTriangle,
  ChevronDown, History, PlusCircle, MinusCircle,
  EyeOff, Power, BarChart2
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

type Item = {
  id: number; item_code: string; name: string; category: string; unit: string;
  cost_price: number; selling_price: number; wholesale_price: number; stock_qty: number;
  reorder_level: number; description: string; manage_stock: number; status: string;
};

type StockEntry = { id: number; type: string; qty: number; note: string; by: string; created_at: string };

const EMPTY: Partial<Item> = {
  item_code: '', name: '', category: '', unit: 'pcs', cost_price: 0, selling_price: 0, wholesale_price: 0,
  stock_qty: 0, reorder_level: 10, description: '', manage_stock: 0,
};

const DEFAULT_CATS = ['Fabric', 'Thread', 'Buttons', 'Zippers', 'Accessories', 'Packaging', 'Finished Goods', 'Other'];
const DEFAULT_UNITS = ['pcs', 'm', 'kg', 'yd', 'roll', 'box', 'set', 'pair'];
const UNIT_LABELS: Record<string, string> = { pcs: 'Pieces', m: 'Meters', kg: 'Kilograms', yd: 'Yards', roll: 'Roll', box: 'Box', set: 'Set', pair: 'Pair' };

const fmt = (n: number) => new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR', maximumFractionDigits: 0 }).format(n || 0);

export default function Inventory() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<'stock' | 'items'>('stock');
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [lowStock, setLowStock] = useState(false);
  const [modal, setModal] = useState<null | 'add' | 'edit' | 'adjust' | 'history'>(null);
  const [form, setForm] = useState<Partial<Item>>(EMPTY);
  const [historyItem, setHistoryItem] = useState<Item | null>(null);
  const [adjustItem, setAdjustItem] = useState<Item | null>(null);
  const [adjustType, setAdjustType] = useState<'add' | 'deduct'>('add');
  const [adjustQty, setAdjustQty] = useState(0);
  const [adjustNote, setAdjustNote] = useState('');
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const [extraCats, setExtraCats] = useState<string[]>([]);
  const [extraUnits, setExtraUnits] = useState<string[]>([]);
  const [newCatInput, setNewCatInput] = useState('');
  const [newUnitInput, setNewUnitInput] = useState('');
  const [addingCat, setAddingCat] = useState(false);
  const [addingUnit, setAddingUnit] = useState(false);


  const allCats = [...DEFAULT_CATS, ...extraCats];
  const allUnits = [...DEFAULT_UNITS, ...extraUnits];

  const { data = [], isLoading } = useQuery({
    queryKey: ['items', search, catFilter, lowStock],
    queryFn: () => api.getItems({ search: search || undefined, category: catFilter || undefined, low_stock: lowStock || undefined }),
  });

  const { data: historyData = [], isFetching: histFetching } = useQuery({
    queryKey: ['stock-history', historyItem?.id],
    queryFn: () => historyItem ? api.getStockHistory(historyItem.id) : [],
    enabled: !!historyItem && modal === 'history',
  });

  const save = useMutation({
    mutationFn: (d: Partial<Item>) => d.id ? api.updateItem(d.id, d) : api.createItem(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['items'] }); setModal(null); },
  });

  const del = useMutation({
    mutationFn: (id: number) => api.deleteItem(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['items'] }),
  });

  const adjustMut = useMutation({
    mutationFn: () => api.adjustStock(adjustItem!.id, { type: adjustType, qty: adjustQty, note: adjustNote }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['items'] }); setModal(null); setAdjustItem(null); setAdjustQty(0); setAdjustNote(''); },
  });

  const statusMut = useMutation({
    mutationFn: ({ id, action }: { id: number; action: 'suspend' | 'activate' | 'not-for-sale' }) =>
      api.setItemStatus(id, action),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['items'] }),
  });

  const items = data as Item[];
  const stockValue = items.reduce((s, i) => s + (i.manage_stock ? i.stock_qty * i.cost_price : 0), 0);
  const lowItems = items.filter(i => i.manage_stock && i.stock_qty <= i.reorder_level);

  const openAdjust = (item: Item, type: 'add' | 'deduct') => {
    setAdjustItem(item); setAdjustType(type); setAdjustQty(0); setAdjustNote('');
    setModal('adjust'); setOpenMenuId(null);
  };

  const openHistory = (item: Item) => {
    setHistoryItem(item); setModal('history'); setOpenMenuId(null);
  };

  const statusLabel = (s: string) => {
    if (s === 'Active') return <span className="badge badge-excellent">Active</span>;
    if (s === 'Suspended') return <span className="badge badge-needs">Suspended</span>;
    if (s === 'Not For Sale') return <span className="badge badge-average">Not For Sale</span>;
    return <span className="badge badge-average">{s}</span>;
  };

  // Close menu on outside click
  const handleRowClick = (id: number) => setOpenMenuId(prev => prev === id ? null : id);

  return (
    <div onClick={() => setOpenMenuId(null)}>
      <div className="topbar">
        <h2>Inventory</h2>
        <div className="topbar-right">
          <button className="btn btn-primary" onClick={() => { setForm(EMPTY); setModal('add'); }}><Plus size={14} /> Add Item</button>
        </div>
      </div>
      <div className="content">
        <div className="tabs">
          <button className={`tab ${tab === 'stock' ? 'active' : ''}`} onClick={() => setTab('stock')}>Stock Dashboard</button>
          <button className={`tab ${tab === 'items' ? 'active' : ''}`} onClick={() => setTab('items')}>Item Master</button>
        </div>

        {/* ─── STOCK DASHBOARD ─── */}
        {tab === 'stock' && (
          <>
            <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: 24 }}>
              <div className="kpi-card">
                <div className="kpi-icon" style={{ background: '#1565C015', color: '#1565C0' }}><BarChart2 size={22} /></div>
                <div className="kpi-info">
                  <label>Total Items</label>
                  <h3>{items.length}</h3>
                  <span>in catalog</span>
                </div>
              </div>
              <div className="kpi-card">
                <div className="kpi-icon" style={{ background: '#C0001A15', color: '#C0001A' }}><AlertTriangle size={22} /></div>
                <div className="kpi-info">
                  <label>Low Stock Items</label>
                  <h3>{lowItems.length}</h3>
                  <span>need reorder</span>
                </div>
              </div>
              <div className="kpi-card">
                <div className="kpi-icon" style={{ background: '#2E7D3215', color: '#2E7D32' }}>💰</div>
                <div className="kpi-info">
                  <label>Stock Value</label>
                  <h3 style={{ fontSize: '1.1rem' }}>{fmt(stockValue)}</h3>
                  <span>at cost price</span>
                </div>
              </div>
            </div>

            {lowItems.length > 0 && (
              <div className="card" style={{ marginBottom: 20 }}>
                <div className="card-title" style={{ color: 'var(--red)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <AlertTriangle size={15} /> Low Stock Alerts
                </div>
                <div className="table-wrap">
                  <table>
                    <thead><tr><th>SKU</th><th>Item</th><th>Category</th><th>Current Stock</th><th>Reorder Level</th><th>Deficit</th></tr></thead>
                    <tbody>
                      {lowItems.map((item) => (
                        <tr key={item.id}>
                          <td style={{ fontFamily: 'monospace', fontSize: '0.78rem' }}>{item.item_code}</td>
                          <td style={{ fontWeight: 600 }}>{item.name}</td>
                          <td>{item.category}</td>
                          <td style={{ color: 'var(--red)', fontWeight: 600 }}>{item.stock_qty}</td>
                          <td>{item.reorder_level}</td>
                          <td style={{ color: 'var(--red)' }}>{item.reorder_level - item.stock_qty}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="card">
              <div className="card-title">Stock by Category</div>
              <div style={{ display: 'grid', gap: 12 }}>
                {allCats.map(cat => {
                  const catItems = items.filter(i => i.category === cat);
                  if (catItems.length === 0) return null;
                  const val = catItems.reduce((s, i) => s + i.stock_qty * i.cost_price, 0);
                  return (
                    <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ flex: '0 0 140px', fontSize: '0.82rem', fontWeight: 500 }}>{cat}</div>
                      <div style={{ flex: 1 }}>
                        <div className="progress-bar">
                          <div className="progress-fill" style={{ width: `${Math.min(100, (val / Math.max(stockValue, 1)) * 100)}%`, background: 'var(--red)' }} />
                        </div>
                      </div>
                      <div style={{ flex: '0 0 80px', fontSize: '0.78rem', textAlign: 'right' }}>{catItems.length} items</div>
                      <div style={{ flex: '0 0 120px', fontSize: '0.78rem', textAlign: 'right', color: 'var(--text3)' }}>{fmt(val)}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {/* ─── ITEM MASTER ─── */}
        {tab === 'items' && (
          <>
            <div className="filter-bar">
              <div style={{ position: 'relative' }}>
                <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)' }} />
                <input className="form-control" style={{ paddingLeft: 32, width: 260 }} placeholder="Search items…" value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <select className="form-control" style={{ width: 160 }} value={catFilter} onChange={e => setCatFilter(e.target.value)}>
                <option value="">All Categories</option>
                {allCats.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: '0.82rem' }}>
                <input type="checkbox" checked={lowStock} onChange={e => setLowStock(e.target.checked)} style={{ accentColor: 'var(--red)' }} />
                Low stock only
              </label>
            </div>
            <div className="card">
              {isLoading ? <div className="loading">Loading…</div> : (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>SKU</th>
                        <th>Name</th>
                        <th>Category</th>
                        <th>Unit</th>
                        <th>Cost Price</th>
                        <th>Retail Price</th>
                        <th>Wholesale</th>
                        <th>Stock</th>
                        <th>Status</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.length === 0 && <tr><td colSpan={10} style={{ textAlign: 'center', color: 'var(--text3)', padding: 32 }}>No items found</td></tr>}
                      {items.map((item) => (
                        <tr key={item.id} style={{ opacity: item.status === 'Suspended' ? 0.55 : 1 }}>
                          <td style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: 'var(--text3)' }}>{item.item_code}</td>
                          <td style={{ fontWeight: 600 }}>{item.name}</td>
                          <td><span className="badge badge-average">{item.category}</span></td>
                          <td>{item.unit}</td>
                          <td>{fmt(item.cost_price)}</td>
                          <td>{fmt(item.selling_price)}</td>
                          <td>{fmt(item.wholesale_price)}</td>
                          <td>
                            {item.manage_stock ? (
                              <span style={{ fontWeight: 600, color: item.stock_qty <= item.reorder_level ? 'var(--red)' : 'var(--success)' }}>
                                {item.stock_qty <= item.reorder_level && <AlertTriangle size={11} style={{ marginRight: 3, verticalAlign: 'middle' }} />}
                                {item.stock_qty}
                              </span>
                            ) : <span style={{ color: 'var(--text3)', fontSize: '0.75rem' }}>N/A</span>}
                          </td>
                          <td>{statusLabel(item.status || 'Active')}</td>
                          <td onClick={e => e.stopPropagation()}>
                            <ActionMenu
                              item={item}
                              open={openMenuId === item.id}
                              onToggle={() => handleRowClick(item.id)}
                              onClose={() => setOpenMenuId(null)}
                              onEdit={() => { setForm(item); setModal('edit'); setOpenMenuId(null); }}
                              onAdjust={openAdjust}
                              onHistory={openHistory}
                              onStatus={(action) => { statusMut.mutate({ id: item.id, action }); setOpenMenuId(null); }}
                              onDelete={() => { if (confirm('Delete this item?')) del.mutate(item.id); setOpenMenuId(null); }}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* ─── Add/Edit Modal ─── */}
      {(modal === 'add' || modal === 'edit') && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{modal === 'add' ? 'Add Item' : 'Edit Item'}</h3>
              <button className="btn-icon" onClick={() => setModal(null)}><X size={16} /></button>
            </div>
            <div className="modal-body">
              <div className="form-row">
                <div className="form-group">
                  <label>SKU</label>
                  <input className="form-control" value={form.item_code || ''} onChange={e => setForm(p => ({ ...p, item_code: e.target.value }))} placeholder="Auto-generated if blank" />
                </div>
                <div className="form-group">
                  <label>Name *</label>
                  <input className="form-control" value={form.name || ''} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
                </div>
              </div>
              <div className="form-row">
                {/* Category with inline add */}
                <div className="form-group">
                  <label>Category</label>
                  <select className="form-control" value={form.category || ''} onChange={e => {
                    if (e.target.value === '__add__') { setAddingCat(true); return; }
                    setForm(p => ({ ...p, category: e.target.value }));
                  }}>
                    <option value="">Select…</option>
                    {allCats.map(c => <option key={c} value={c}>{c}</option>)}
                    <option value="__add__">+ Add category…</option>
                  </select>
                  {addingCat && (
                    <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                      <input className="form-control" placeholder="Category name…" value={newCatInput} onChange={e => setNewCatInput(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter' && newCatInput.trim()) {
                            const n = newCatInput.trim();
                            if (!allCats.includes(n)) setExtraCats(p => [...p, n]);
                            setForm(f => ({ ...f, category: n }));
                            setNewCatInput(''); setAddingCat(false);
                          }
                          if (e.key === 'Escape') setAddingCat(false);
                        }}
                        autoFocus style={{ flex: 1 }} />
                      <button className="btn btn-primary btn-sm" onClick={() => {
                        const n = newCatInput.trim();
                        if (n) {
                          if (!allCats.includes(n)) setExtraCats(p => [...p, n]);
                          setForm(f => ({ ...f, category: n }));
                          setNewCatInput(''); setAddingCat(false);
                        }
                      }}>Add</button>
                      <button className="btn btn-secondary btn-sm" onClick={() => setAddingCat(false)}>✕</button>
                    </div>
                  )}
                </div>
                {/* Unit with inline add */}
                <div className="form-group">
                  <label>Unit</label>
                  <select className="form-control" value={form.unit || 'pcs'} onChange={e => {
                    if (e.target.value === '__add__') { setAddingUnit(true); return; }
                    setForm(p => ({ ...p, unit: e.target.value }));
                  }}>
                    {allUnits.map(u => <option key={u} value={u}>{UNIT_LABELS[u] || u}</option>)}
                    <option value="__add__">+ Add unit…</option>
                  </select>
                  {addingUnit && (
                    <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                      <input className="form-control" placeholder="Unit name…" value={newUnitInput} onChange={e => setNewUnitInput(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter' && newUnitInput.trim()) {
                            const n = newUnitInput.trim();
                            if (!allUnits.includes(n)) setExtraUnits(p => [...p, n]);
                            setForm(f => ({ ...f, unit: n }));
                            setNewUnitInput(''); setAddingUnit(false);
                          }
                          if (e.key === 'Escape') setAddingUnit(false);
                        }}
                        autoFocus style={{ flex: 1 }} />
                      <button className="btn btn-primary btn-sm" onClick={() => {
                        const n = newUnitInput.trim();
                        if (n) {
                          if (!allUnits.includes(n)) setExtraUnits(p => [...p, n]);
                          setForm(f => ({ ...f, unit: n }));
                          setNewUnitInput(''); setAddingUnit(false);
                        }
                      }}>Add</button>
                      <button className="btn btn-secondary btn-sm" onClick={() => setAddingUnit(false)}>✕</button>
                    </div>
                  )}
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Cost Price (LKR)</label>
                  <input className="form-control" type="number" value={form.cost_price ?? 0}
                    onFocus={e => e.target.select()}
                    onChange={e => setForm(p => ({ ...p, cost_price: Number(e.target.value) }))} />
                </div>
                <div className="form-group">
                  <label>Retail Price (LKR)</label>
                  <input className="form-control" type="number" value={form.selling_price ?? 0}
                    onFocus={e => e.target.select()}
                    onChange={e => setForm(p => ({ ...p, selling_price: Number(e.target.value) }))} />
                </div>
                <div className="form-group">
                  <label>Wholesale Price (LKR)</label>
                  <input className="form-control" type="number" value={form.wholesale_price ?? 0}
                    onFocus={e => e.target.select()}
                    onChange={e => setForm(p => ({ ...p, wholesale_price: Number(e.target.value) }))} />
                </div>
              </div>
              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <input type="checkbox" checked={!!form.manage_stock} onChange={e => setForm(p => ({ ...p, manage_stock: e.target.checked ? 1 : 0 }))} style={{ accentColor: 'var(--red)', width: 15, height: 15 }} />
                  <span style={{ fontWeight: 500 }}>Need stock management?</span>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text3)', fontWeight: 400 }}>(track qty, reorder alerts)</span>
                </label>
              </div>
              {!!form.manage_stock && (
                <div className="form-row">
                  <div className="form-group">
                    <label>{modal === 'add' ? 'Opening Stock' : 'Stock Qty'}</label>
                    <input className="form-control" type="number" value={form.stock_qty ?? 0}
                      onFocus={e => e.target.select()}
                      onChange={e => setForm(p => ({ ...p, stock_qty: Number(e.target.value) }))} />
                  </div>
                  <div className="form-group">
                    <label>Reorder Level</label>
                    <input className="form-control" type="number" value={form.reorder_level ?? 0}
                      onFocus={e => e.target.select()}
                      onChange={e => setForm(p => ({ ...p, reorder_level: Number(e.target.value) }))} />
                  </div>
                </div>
              )}
              <div className="form-group">
                <label>Description</label>
                <textarea className="form-control" value={form.description || ''} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setModal(null)}>Cancel</button>
              <button className="btn btn-primary" disabled={save.isPending} onClick={() => save.mutate(form)}>
                {save.isPending ? 'Saving…' : 'Save Item'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Adjust Stock Modal ─── */}
      {modal === 'adjust' && adjustItem && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" style={{ maxWidth: 440 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{adjustType === 'add' ? 'Add Stock' : 'Deduct Stock'}: {adjustItem.name}</h3>
              <button className="btn-icon" onClick={() => setModal(null)}><X size={16} /></button>
            </div>
            <div className="modal-body">
              <div style={{ marginBottom: 16, padding: '10px 14px', background: 'var(--bg)', borderRadius: 8, display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span>Current stock:</span>
                <strong style={{ color: adjustItem.stock_qty <= adjustItem.reorder_level ? 'var(--red)' : 'var(--success)' }}>
                  {adjustItem.stock_qty} {adjustItem.unit}
                </strong>
              </div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                <button className={`btn ${adjustType === 'add' ? 'btn-primary' : 'btn-secondary'}`} style={{ flex: 1 }} onClick={() => setAdjustType('add')}>
                  <PlusCircle size={14} /> Add Stock
                </button>
                <button className={`btn ${adjustType === 'deduct' ? 'btn-primary' : 'btn-secondary'}`} style={{ flex: 1, background: adjustType === 'deduct' ? 'var(--red)' : undefined, borderColor: adjustType === 'deduct' ? 'var(--red)' : undefined }} onClick={() => setAdjustType('deduct')}>
                  <MinusCircle size={14} /> Deduct Stock
                </button>
              </div>
              <div className="form-group">
                <label>Quantity *</label>
                <input className="form-control" type="number" min={0} value={adjustQty}
                  onFocus={e => e.target.select()}
                  onChange={e => setAdjustQty(Math.abs(Number(e.target.value)))} />
                {adjustType === 'deduct' && adjustQty > adjustItem.stock_qty && (
                  <div style={{ fontSize: '0.72rem', color: 'var(--red)', marginTop: 4 }}>⚠ Exceeds current stock ({adjustItem.stock_qty})</div>
                )}
              </div>
              <div className="form-group">
                <label>Note / Reason</label>
                <input className="form-control" placeholder="e.g. Purchase received, Damaged goods…" value={adjustNote} onChange={e => setAdjustNote(e.target.value)} />
              </div>
              <div style={{ padding: '10px 14px', background: adjustType === 'add' ? '#2E7D3210' : '#C0001A10', borderRadius: 8, fontSize: '0.85rem', color: adjustType === 'add' ? '#2E7D32' : 'var(--red)' }}>
                After adjustment: <strong>{adjustType === 'add' ? adjustItem.stock_qty + adjustQty : Math.max(0, adjustItem.stock_qty - adjustQty)} {adjustItem.unit}</strong>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setModal(null)}>Cancel</button>
              <button className="btn btn-primary" disabled={adjustMut.isPending || !adjustQty}
                style={{ background: adjustType === 'deduct' ? 'var(--red)' : undefined }}
                onClick={() => adjustMut.mutate()}>
                {adjustMut.isPending ? 'Saving…' : (adjustType === 'add' ? 'Add Stock' : 'Deduct Stock')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Stock History Modal ─── */}
      {modal === 'history' && historyItem && (() => {
        const entries = historyData as StockEntry[];
        const isAdd = (e: StockEntry) => e.type === 'add' || e.type === 'purchase';

        // Group by day for chart
        const dayMap: Record<string, { date: string; added: number; deducted: number }> = {};
        [...entries].reverse().forEach(e => {
          const day = e.created_at?.slice(0, 10) || 'Unknown';
          if (!dayMap[day]) dayMap[day] = { date: day, added: 0, deducted: 0 };
          if (isAdd(e)) dayMap[day].added += e.qty;
          else dayMap[day].deducted += e.qty;
        });
        const chartData = Object.values(dayMap).slice(-30);

        // Summary stats
        const totalAdded = entries.filter(isAdd).reduce((s, e) => s + e.qty, 0);
        const totalDeducted = entries.filter(e => !isAdd(e)).reduce((s, e) => s + e.qty, 0);

        return (
          <div className="modal-overlay" onClick={() => setModal(null)}>
            <div className="modal modal-lg" style={{ maxWidth: 780 }} onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <div>
                  <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <History size={16} style={{ color: 'var(--red)' }} />
                    Stock History: {historyItem.name}
                  </h3>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text3)', marginTop: 2 }}>
                    Current stock: <strong style={{ color: historyItem.stock_qty <= historyItem.reorder_level ? 'var(--red)' : 'var(--success)' }}>{historyItem.stock_qty} {historyItem.unit}</strong>
                    <span style={{ margin: '0 10px', color: 'var(--border)' }}>|</span>
                    <span style={{ color: '#2E7D32' }}>+{totalAdded} added</span>
                    <span style={{ margin: '0 6px' }}>·</span>
                    <span style={{ color: 'var(--red)' }}>-{totalDeducted} deducted</span>
                  </div>
                </div>
                <button className="btn-icon" onClick={() => setModal(null)}><X size={16} /></button>
              </div>
              <div className="modal-body">
                {histFetching ? <div className="loading">Loading…</div> : entries.length === 0 ? (
                  <div className="empty"><div className="empty-icon">📋</div><p>No stock movements yet</p></div>
                ) : (
                  <>
                    {/* Chart */}
                    <div style={{ marginBottom: 24 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                        <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>Daily Stock Movements</div>
                        <div style={{ display: 'flex', gap: 16, fontSize: '0.75rem' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                            <span style={{ width: 10, height: 10, borderRadius: 2, background: '#2E7D32', display: 'inline-block' }} /> Added
                          </span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                            <span style={{ width: 10, height: 10, borderRadius: 2, background: '#C0001A', display: 'inline-block' }} /> Deducted
                          </span>
                        </div>
                      </div>
                      <ResponsiveContainer width="100%" height={180}>
                        <BarChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }} barCategoryGap="30%">
                          <CartesianGrid stroke="#F3F3F3" vertical={false} />
                          <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#999' }} axisLine={false} tickLine={false} dy={4} />
                          <YAxis tick={{ fontSize: 10, fill: '#999' }} axisLine={false} tickLine={false} width={28} />
                          <Tooltip
                            contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 16px rgba(0,0,0,0.1)', fontSize: 12 }}
                            formatter={(v: any, name: any) => [v, name === 'added' ? '+ Added' : '- Deducted']}
                          />
                          <Bar dataKey="added" fill="#2E7D32" radius={[4, 4, 0, 0]} maxBarSize={32} />
                          <Bar dataKey="deducted" fill="#C0001A" radius={[4, 4, 0, 0]} maxBarSize={32} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Table */}
                    <div style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: 8 }}>Movement Log</div>
                    <div className="table-wrap" style={{ maxHeight: 280, overflowY: 'auto' }}>
                      <table>
                        <thead>
                          <tr>
                            <th>Date & Time</th>
                            <th>Type</th>
                            <th>Qty</th>
                            <th>Note / Reason</th>
                            <th>Done By</th>
                          </tr>
                        </thead>
                        <tbody>
                          {entries.map(e => (
                            <tr key={e.id}>
                              <td style={{ fontSize: '0.78rem', color: 'var(--text3)', whiteSpace: 'nowrap' }}>
                                {e.created_at?.slice(0, 16).replace('T', ' ')}
                              </td>
                              <td>
                                <span className={`badge ${isAdd(e) ? 'badge-excellent' : 'badge-needs'}`}>
                                  {isAdd(e) ? '▲ Add' : '▼ Deduct'}
                                </span>
                              </td>
                              <td>
                                <span style={{ fontWeight: 700, fontSize: '0.88rem', color: isAdd(e) ? '#2E7D32' : 'var(--red)' }}>
                                  {isAdd(e) ? '+' : '-'}{e.qty}
                                </span>
                              </td>
                              <td style={{ color: 'var(--text2)', fontSize: '0.82rem' }}>{e.note || <span style={{ color: 'var(--text3)' }}>—</span>}</td>
                              <td>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                  <div style={{ width: 22, height: 22, borderRadius: 6, background: 'var(--red)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 700, flexShrink: 0 }}>
                                    {(e.by || 'A').charAt(0).toUpperCase()}
                                  </div>
                                  <span style={{ fontSize: '0.82rem', fontWeight: 500 }}>{e.by || 'Admin'}</span>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setModal(null)}>Close</button>
                <button className="btn btn-secondary" style={{ color: 'var(--red)', borderColor: 'var(--red)' }} onClick={() => openAdjust(historyItem, 'deduct')}>
                  <MinusCircle size={14} /> Deduct Stock
                </button>
                <button className="btn btn-primary" onClick={() => openAdjust(historyItem, 'add')}>
                  <PlusCircle size={14} /> Add Stock
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

function ActionMenu({ item, open, onToggle, onClose, onEdit, onAdjust, onHistory, onStatus, onDelete }: {
  item: Item; open: boolean; onToggle: () => void; onClose: () => void;
  onEdit: () => void; onAdjust: (item: Item, type: 'add' | 'deduct') => void;
  onHistory: (item: Item) => void;
  onStatus: (action: 'suspend' | 'activate' | 'not-for-sale') => void;
  onDelete: () => void;
}) {
  const btnRef = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0, flip: false });

  useEffect(() => {
    if (open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      const menuHeight = 260; // approx max height
      const flip = r.bottom + menuHeight > window.innerHeight;
      setPos({
        top: flip ? r.top + window.scrollY - menuHeight - 4 : r.bottom + window.scrollY + 4,
        left: r.right + window.scrollX,
        flip,
      });
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (btnRef.current && !btnRef.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open, onClose]);

  return (
    <div style={{ position: 'relative' }}>
      <button
        ref={btnRef}
        className="btn btn-secondary btn-sm"
        style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px' }}
        onClick={onToggle}
      >
        Actions <ChevronDown size={11} />
      </button>
      {open && createPortal(
        <div
          onMouseDown={e => e.stopPropagation()}
          style={{
            position: 'absolute',
            top: pos.top,
            left: pos.left,
            transform: 'translateX(-100%)',
            zIndex: 9999,
            background: '#fff',
            border: '1px solid var(--border)',
            borderRadius: 10,
            boxShadow: '0 8px 24px rgba(0,0,0,0.14)',
            minWidth: 175,
            padding: '4px 0',
          }}
        >
          {item.manage_stock ? <>
            <MenuItem icon={<PlusCircle size={13} />} label="Add Stock" color="#2E7D32" onClick={() => onAdjust(item, 'add')} />
            <MenuItem icon={<MinusCircle size={13} />} label="Deduct Stock" color="var(--red)" onClick={() => onAdjust(item, 'deduct')} />
            <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />
          </> : null}
          <MenuItem icon={<Edit2 size={13} />} label="Edit Item" onClick={onEdit} />
          <MenuItem icon={<Trash2 size={13} />} label="Delete" color="var(--red)" onClick={onDelete} />
          <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />
          <MenuItem icon={<EyeOff size={13} />} label="Not For Sale" onClick={() => onStatus('not-for-sale')} />
          <MenuItem icon={<Power size={13} />} label={item.status === 'Suspended' ? 'Activate' : 'Suspend'} color="var(--red)"
            onClick={() => onStatus(item.status === 'Suspended' ? 'activate' : 'suspend')} />
          {item.manage_stock ? <>
            <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />
            <MenuItem icon={<History size={13} />} label="Stock History" onClick={() => onHistory(item)} />
          </> : null}
        </div>,
        document.body
      )}
    </div>
  );
}

function MenuItem({ icon, label, color, onClick }: { icon: React.ReactNode; label: string; color?: string; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      width: '100%', background: 'none', border: 'none', cursor: 'pointer',
      display: 'flex', alignItems: 'center', gap: 8, padding: '7px 14px',
      fontSize: '0.8rem', color: color || 'var(--text)', textAlign: 'left',
      transition: 'background 0.1s',
    }}
      onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
      {icon} {label}
    </button>
  );
}
