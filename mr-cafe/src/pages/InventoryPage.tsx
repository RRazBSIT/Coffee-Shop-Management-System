import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ArrowDownToLine, ArrowUpFromLine, ClipboardList, Package, Plus, RefreshCw, Search, X, Pencil } from 'lucide-react';
import './InventoryPage.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

type Ingredient = {
  ingredientId: number; ingredientName: string; unit: string;
  currentStock: number; reorderLevel: number; isActive: boolean; isLowStock: boolean;
};
type Movement = {
  movementId: number; ingredientName: string; unit: string; movementType: string;
  quantity: number; notes: string | null; createdAt: string; createdBy: string | null;
};

const number = (value: number) => Number(value || 0).toLocaleString('en-PH', { maximumFractionDigits: 3 });

export default function InventoryPage({ token }: { token: string }) {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [modal, setModal] = useState<'ingredient' | 'movement' | null>(null);
  const [editing, setEditing] = useState<Ingredient | null>(null);
  const [saving, setSaving] = useState(false);
  const [ingredientForm, setIngredientForm] = useState({ ingredientName: '', unit: 'pcs', currentStock: '0', reorderLevel: '0', isActive: true });
  const [movementForm, setMovementForm] = useState({ ingredientId: '', movementType: 'stock_in', quantity: '', adjustmentDirection: 'increase', notes: '' });

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const headers = { Authorization: `Bearer ${token}`, Accept: 'application/json' };
      const [ingredientResponse, movementResponse] = await Promise.all([
        fetch(`${API_URL}/inventory/ingredients?stockStatus=${filter}&search=${encodeURIComponent(search)}`, { headers }),
        fetch(`${API_URL}/inventory/movements?limit=100`, { headers })
      ]);
      const [ingredientResult, movementResult] = await Promise.all([ingredientResponse.json(), movementResponse.json()]);
      if (!ingredientResponse.ok) throw new Error(ingredientResult.message || 'Unable to load ingredients.');
      if (!movementResponse.ok) throw new Error(movementResult.message || 'Unable to load inventory history.');
      setIngredients(ingredientResult.data || []);
      setMovements(movementResult.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to connect to inventory API.');
    } finally { setLoading(false); }
  }, [token, filter, search]);

  useEffect(() => { void load(); }, [load]);

  const lowStockCount = ingredients.filter((item) => Number(item.currentStock) <= Number(item.reorderLevel)).length;
  const totalIngredients = ingredients.length;

  const openNewIngredient = () => {
    setEditing(null);
    setIngredientForm({ ingredientName: '', unit: 'pcs', currentStock: '0', reorderLevel: '0', isActive: true });
    setError(''); setModal('ingredient');
  };
  const openEditIngredient = (item: Ingredient) => {
    setEditing(item);
    setIngredientForm({ ingredientName: item.ingredientName, unit: item.unit, currentStock: String(item.currentStock), reorderLevel: String(item.reorderLevel), isActive: item.isActive });
    setError(''); setModal('ingredient');
  };
  const openMovement = (item?: Ingredient) => {
    setMovementForm({ ingredientId: item ? String(item.ingredientId) : (ingredients[0] ? String(ingredients[0].ingredientId) : ''), movementType: 'stock_in', quantity: '', adjustmentDirection: 'increase', notes: '' });
    setError(''); setModal('movement');
  };

  const saveIngredient = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setSaving(true); setError('');
    const payload = {
      ingredientName: ingredientForm.ingredientName.trim(), unit: ingredientForm.unit.trim(),
      currentStock: Number(ingredientForm.currentStock), reorderLevel: Number(ingredientForm.reorderLevel), isActive: ingredientForm.isActive
    };
    try {
      const response = await fetch(`${API_URL}/inventory/ingredients${editing ? `/${editing.ingredientId}` : ''}`, {
        method: editing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload)
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Unable to save ingredient.');
      setModal(null); setNotice(editing ? 'Ingredient updated.' : 'Ingredient added.'); await load();
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to save ingredient.'); }
    finally { setSaving(false); }
  };

  const saveMovement = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setSaving(true); setError('');
    try {
      const response = await fetch(`${API_URL}/inventory/movements`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          ingredientId: Number(movementForm.ingredientId), movementType: movementForm.movementType,
          quantity: Number(movementForm.quantity),
          ...(movementForm.movementType === 'adjustment' ? { adjustmentDirection: movementForm.adjustmentDirection } : {}),
          notes: movementForm.notes.trim() || null
        })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Unable to record stock movement.');
      setModal(null); setNotice('Inventory movement recorded successfully.'); await load();
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to record stock movement.'); }
    finally { setSaving(false); }
  };

  const visibleIngredients = useMemo(() => ingredients, [ingredients]);

  return <section className="inventory-page">
    <div className="inventory-heading">
      <div><span className="inventory-eyebrow">STOCK CONTROL</span><h2>Inventory Management</h2><p>Monitor ingredients, stock levels, and inventory movements.</p></div>
      <div className="inventory-heading-actions">
        <button className="inventory-secondary" onClick={() => openMovement()} disabled={!ingredients.length}><ArrowDownToLine size={16} /> Record Movement</button>
        <button className="inventory-primary" onClick={openNewIngredient}><Plus size={17} /> Add Ingredient</button>
      </div>
    </div>

    <div className="inventory-stats">
      <article><span><Package size={19} /></span><div><small>Ingredients</small><strong>{totalIngredients}</strong></div></article>
      <article><span><AlertTriangle size={19} /></span><div><small>Low Stock Items</small><strong>{lowStockCount}</strong></div></article>
      <article><span><ClipboardList size={19} /></span><div><small>Recorded Movements</small><strong>{movements.length}</strong></div></article>
    </div>

    {error && !modal && <div className="inventory-alert">{error}</div>}
    {notice && <div className="inventory-notice">{notice}</div>}

    <div className="inventory-section-heading"><div><h3>Ingredients & Stock Levels</h3><p>Current quantities compared with reorder levels.</p></div><button className="inventory-refresh" onClick={() => void load()} disabled={loading}><RefreshCw size={15} /> Refresh</button></div>
    <div className="inventory-toolbar">
      <label><Search size={16}/><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search ingredients..." /></label>
      <select value={filter} onChange={(event) => setFilter(event.target.value)}><option value="all">All stock levels</option><option value="low">Low stock only</option><option value="healthy">Healthy stock</option></select>
    </div>
    <div className="inventory-table-card"><div className="inventory-table-scroll"><table>
      <thead><tr><th>INGREDIENT</th><th>UNIT</th><th>CURRENT STOCK</th><th>REORDER LEVEL</th><th>STATUS</th><th>ACTIONS</th></tr></thead>
      <tbody>
        {loading ? <tr><td colSpan={6} className="inventory-empty">Loading inventory...</td></tr> :
        visibleIngredients.length === 0 ? <tr><td colSpan={6} className="inventory-empty">No ingredients found. Add your first ingredient.</td></tr> :
        visibleIngredients.map((item) => {
          const low = Number(item.currentStock) <= Number(item.reorderLevel);
          return <tr key={item.ingredientId}>
            <td className="inventory-ingredient-name">{item.ingredientName}</td><td>{item.unit}</td>
            <td><strong>{number(item.currentStock)}</strong></td><td>{number(item.reorderLevel)} {item.unit}</td>
            <td><span className={`inventory-status ${low ? 'low' : 'healthy'}`}>{low ? 'Low stock' : 'In stock'}</span></td>
            <td><div className="inventory-actions"><button onClick={() => openMovement(item)} title="Record stock movement"><ArrowDownToLine size={15}/> Stock</button><button onClick={() => openEditIngredient(item)} title="Edit ingredient"><Pencil size={15}/> Edit</button></div></td>
          </tr>;
        })}
      </tbody>
    </table></div></div>

    <div className="inventory-section-heading movement-heading"><div><h3>Recent Inventory Movements</h3><p>Latest stock-ins, adjustments, and wastage records.</p></div></div>
    <div className="inventory-table-card"><div className="inventory-table-scroll"><table>
      <thead><tr><th>DATE</th><th>INGREDIENT</th><th>MOVEMENT</th><th>QUANTITY</th><th>NOTES</th><th>RECORDED BY</th></tr></thead>
      <tbody>
        {loading ? <tr><td colSpan={6} className="inventory-empty">Loading movement history...</td></tr> :
        movements.length === 0 ? <tr><td colSpan={6} className="inventory-empty">No inventory movements recorded yet.</td></tr> :
        movements.map((movement) => <tr key={movement.movementId}>
          <td>{new Date(movement.createdAt).toLocaleString()}</td><td className="inventory-ingredient-name">{movement.ingredientName}</td>
          <td><span className={`movement-type ${movement.movementType}`}>{movement.movementType.replace('_', ' ')}</span></td>
          <td>{number(movement.quantity)} {movement.unit}</td><td>{movement.notes || '—'}</td><td>{movement.createdBy || 'System'}</td>
        </tr>)}
      </tbody>
    </table></div></div>

    {modal && <div className="inventory-modal-backdrop" onClick={() => setModal(null)}><section className="inventory-modal" onClick={(event) => event.stopPropagation()}>
      <div className="inventory-modal-head"><div><span className="inventory-eyebrow">{modal === 'ingredient' ? 'INGREDIENT DETAILS' : 'STOCK TRANSACTION'}</span><h2>{modal === 'ingredient' ? (editing ? 'Edit Ingredient' : 'Add Ingredient') : 'Record Inventory Movement'}</h2></div><button onClick={() => setModal(null)}><X size={19}/></button></div>
      {modal === 'ingredient' ? <form onSubmit={saveIngredient} className="inventory-form">
        <label>Ingredient name<input required maxLength={120} value={ingredientForm.ingredientName} onChange={(event) => setIngredientForm({...ingredientForm, ingredientName:event.target.value})} placeholder="e.g. Fresh Milk"/></label>
        <div className="inventory-form-row"><label>Unit<input required maxLength={30} value={ingredientForm.unit} onChange={(event) => setIngredientForm({...ingredientForm, unit:event.target.value})} placeholder="ml, g, pcs"/></label><label>Reorder level<input type="number" min="0" step="0.001" required value={ingredientForm.reorderLevel} onChange={(event) => setIngredientForm({...ingredientForm, reorderLevel:event.target.value})}/></label></div>
        {!editing && <label>Opening stock<input type="number" min="0" step="0.001" value={ingredientForm.currentStock} onChange={(event) => setIngredientForm({...ingredientForm, currentStock:event.target.value})}/><small>Opening stock is recorded as an initial stock-in.</small></label>}
        <label className="inventory-check"><input type="checkbox" checked={ingredientForm.isActive} onChange={(event) => setIngredientForm({...ingredientForm, isActive:event.target.checked})}/> Ingredient is active</label>
        {error && <div className="inventory-alert">{error}</div>}
        <div className="inventory-modal-actions"><button type="button" onClick={() => setModal(null)}>Cancel</button><button type="submit" disabled={saving}>{saving ? 'Saving...' : editing ? 'Save Changes' : 'Add Ingredient'}</button></div>
      </form> : <form onSubmit={saveMovement} className="inventory-form">
        <label>Ingredient<select required value={movementForm.ingredientId} onChange={(event) => setMovementForm({...movementForm, ingredientId:event.target.value})}><option value="">Select ingredient</option>{ingredients.map((item) => <option key={item.ingredientId} value={item.ingredientId}>{item.ingredientName} ({number(item.currentStock)} {item.unit})</option>)}</select></label>
        <label>Movement type<select value={movementForm.movementType} onChange={(event) => setMovementForm({...movementForm, movementType:event.target.value})}><option value="stock_in">Stock In</option><option value="adjustment">Stock Adjustment</option><option value="wastage">Wastage</option></select></label>
        {movementForm.movementType === 'adjustment' && <label>Adjustment direction<select value={movementForm.adjustmentDirection} onChange={(event) => setMovementForm({...movementForm, adjustmentDirection:event.target.value})}><option value="increase">Increase stock</option><option value="decrease">Decrease stock</option></select></label>}
        <label>Quantity<input type="number" min="0.001" step="0.001" required value={movementForm.quantity} onChange={(event) => setMovementForm({...movementForm, quantity:event.target.value})} placeholder="Enter quantity"/></label>
        <label>Notes (optional)<textarea rows={3} maxLength={255} value={movementForm.notes} onChange={(event) => setMovementForm({...movementForm, notes:event.target.value})} placeholder="Supplier, reason, reference..."/></label>
        {error && <div className="inventory-alert">{error}</div>}
        <div className="inventory-modal-actions"><button type="button" onClick={() => setModal(null)}>Cancel</button><button type="submit" disabled={saving || !ingredients.length}>{saving ? 'Saving...' : 'Save Movement'}</button></div>
      </form>}
    </section></div>}
  </section>;
}
