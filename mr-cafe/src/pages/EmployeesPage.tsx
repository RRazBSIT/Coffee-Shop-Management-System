import { useCallback, useEffect, useState } from 'react';
import { Search, Plus, Pencil, Trash2, Users, X, RefreshCw } from 'lucide-react';
import './EmployeesPage.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

type Employee = {
  employee_id: number;
  first_name: string;
  last_name: string;
  phone: string | null;
  created_at: string;
};

type EmployeeForm = {
  firstName: string;
  lastName: string;
  phone: string;
};

const emptyForm: EmployeeForm = { firstName: '', lastName: '', phone: '' };

export default function EmployeesPage({ token }: { token: string }) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [form, setForm] = useState<EmployeeForm>(emptyForm);

  const loadEmployees = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${API_URL}/employees?search=${encodeURIComponent(search)}`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' }
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Unable to load employees.');
      setEmployees(result.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to connect to the server.');
    } finally {
      setLoading(false);
    }
  }, [search, token]);

  useEffect(() => { void loadEmployees(); }, [loadEmployees]);

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm);
    setNotice('');
    setModalOpen(true);
  };

  const openEdit = (employee: Employee) => {
    setEditing(employee);
    setForm({
      firstName: employee.first_name,
      lastName: employee.last_name,
      phone: employee.phone || ''
    });
    setNotice('');
    setModalOpen(true);
  };

  const saveEmployee = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const response = await fetch(
        editing ? `${API_URL}/employees/${editing.employee_id}` : `${API_URL}/employees`,
        {
          method: editing ? 'PUT' : 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            firstName: form.firstName.trim(),
            lastName: form.lastName.trim(),
            phone: form.phone.trim() || null
          })
        }
      );
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Unable to save employee.');
      setModalOpen(false);
      setNotice(editing ? 'Employee updated successfully.' : 'Employee added successfully.');
      await loadEmployees();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save employee.');
    } finally {
      setSaving(false);
    }
  };

  const deleteEmployee = async (employee: Employee) => {
    const confirmed = window.confirm(`Delete ${employee.first_name} ${employee.last_name}?`);
    if (!confirmed) return;
    setError('');
    setNotice('');
    try {
      const response = await fetch(`${API_URL}/employees/${employee.employee_id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Unable to delete employee.');
      setNotice('Employee deleted successfully.');
      await loadEmployees();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to delete employee.');
    }
  };

  return (
    <section className="employees-page">
      <div className="employees-heading">
        <div>
          <span className="employees-eyebrow">STAFF DIRECTORY</span>
          <h2>Employees</h2>
          <p>Manage your MR Café employee records.</p>
        </div>
        <button className="employee-primary-btn" onClick={openAdd}><Plus size={18} /> Add Employee</button>
      </div>

      <div className="employees-toolbar">
        <div className="employee-search">
          <Search size={18} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search employee name or phone..." />
        </div>
        <button className="employee-refresh-btn" onClick={() => void loadEmployees()} disabled={loading}>
          <RefreshCw size={16} /> Refresh
        </button>
      </div>

      {error && <div className="employee-alert error">{error}</div>}
      {notice && <div className="employee-alert success">{notice}</div>}

      <div className="employees-summary">
        <div className="employees-summary-icon"><Users size={21} /></div>
        <div><strong>{employees.length}</strong><span>Employees displayed</span></div>
      </div>

      <div className="employees-table-card">
        <div className="employees-table-wrap">
          <table className="employees-table">
            <thead><tr><th>EMPLOYEE ID</th><th>EMPLOYEE NAME</th><th>PHONE</th><th>DATE ADDED</th><th>ACTIONS</th></tr></thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="employee-empty">Loading employees...</td></tr>
              ) : employees.length === 0 ? (
                <tr><td colSpan={5} className="employee-empty">No employees found. Add your first employee.</td></tr>
              ) : employees.map((employee) => (
                <tr key={employee.employee_id}>
                  <td className="employee-id">EMP-{String(employee.employee_id).padStart(4, '0')}</td>
                  <td><strong>{employee.first_name} {employee.last_name}</strong></td>
                  <td>{employee.phone || '—'}</td>
                  <td>{employee.created_at ? new Date(employee.created_at).toLocaleDateString() : '—'}</td>
                  <td>
                    <div className="employee-actions">
                      <button aria-label="Edit employee" onClick={() => openEdit(employee)}><Pencil size={16} /></button>
                      <button aria-label="Delete employee" className="delete" onClick={() => void deleteEmployee(employee)}><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modalOpen && (
        <div className="employee-modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) setModalOpen(false); }}>
          <form className="employee-modal" onSubmit={saveEmployee}>
            <div className="employee-modal-heading">
              <div><span className="employees-eyebrow">EMPLOYEE DETAILS</span><h3>{editing ? 'Edit Employee' : 'Add Employee'}</h3></div>
              <button type="button" className="employee-modal-close" onClick={() => setModalOpen(false)}><X size={19} /></button>
            </div>
            <label>First Name<input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} required maxLength={80} placeholder="Enter first name" /></label>
            <label>Last Name<input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} required maxLength={80} placeholder="Enter last name" /></label>
            <label>Phone Number <span>(Optional)</span><input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} maxLength={25} placeholder="e.g. 09XXXXXXXXX" /></label>
            {error && <div className="employee-alert error">{error}</div>}
            <div className="employee-modal-actions">
              <button type="button" className="employee-cancel-btn" onClick={() => setModalOpen(false)}>Cancel</button>
              <button type="submit" className="employee-primary-btn" disabled={saving}>{saving ? 'Saving...' : editing ? 'Save Changes' : 'Add Employee'}</button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}
