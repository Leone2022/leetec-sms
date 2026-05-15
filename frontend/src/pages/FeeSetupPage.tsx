import { useState, useEffect } from 'react';
import { feesAPI } from '../services/api';
import { Tag, Package, Zap, Plus, X, Trash2, AlertTriangle, CheckCircle } from 'lucide-react';
import AdminLayout from '../components/AdminLayout';

interface LineItem { categoryId: number; amount: string; }

const blankCategory = () => ({ name: '', description: '' });
const blankPackageForm = () => ({ name: '', studentType: 'Day' });
const blankItem = (): LineItem => ({ categoryId: 0, amount: '' });

export default function FeeSetupPage() {
  const [activeTerm, setActiveTerm] = useState<any>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [packages, setPackages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Category form
  const [catForm, setCatForm] = useState(blankCategory());
  const [catSubmitting, setCatSubmitting] = useState(false);
  const [isCatModalOpen, setIsCatModalOpen] = useState(false);

  // Package form
  const [pkgForm, setPkgForm] = useState(blankPackageForm());
  const [lineItems, setLineItems] = useState<LineItem[]>([blankItem()]);
  const [pkgSubmitting, setPkgSubmitting] = useState(false);
  const [isPkgModalOpen, setIsPkgModalOpen] = useState(false);

  // Generate invoices
  const [generating, setGenerating] = useState(false);
  const [generateResult, setGenerateResult] = useState<any>(null);
  const [showGenerateConfirm, setShowGenerateConfirm] = useState(false);

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    try {
      const termsRes = await feesAPI.getTerms(1);
      const active = (termsRes.data as any[]).find((t: any) => t.isActive);
      setActiveTerm(active ?? null);
      const [catRes, pkgRes] = await Promise.all([
        feesAPI.getCategories(1),
        active ? feesAPI.getPackages(active.id) : Promise.resolve({ data: [] }),
      ]);
      setCategories(catRes.data || []);
      setPackages(pkgRes.data || []);
    } catch (err) {
      console.error(err);
      showMessage('Failed to load fee setup data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (text: string, type: 'success' | 'error') => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  // ── Categories ──
  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catForm.name.trim()) { showMessage('Category name is required', 'error'); return; }
    setCatSubmitting(true);
    try {
      await feesAPI.createCategory({ schoolId: 1, ...catForm });
      showMessage('Category created', 'success');
      setIsCatModalOpen(false);
      setCatForm(blankCategory());
      const res = await feesAPI.getCategories(1);
      setCategories(res.data || []);
    } catch (err: any) {
      console.error(err.response);
      showMessage(err.response?.data?.message || 'Failed to create category', 'error');
    } finally {
      setCatSubmitting(false);
    }
  };

  const handleDeleteCategory = async (id: number) => {
    if (!window.confirm('Delete this category?')) return;
    try {
      await feesAPI.deleteCategory(id);
      showMessage('Category deleted', 'success');
      const res = await feesAPI.getCategories(1);
      setCategories(res.data || []);
    } catch (err: any) {
      console.error(err.response);
      showMessage(err.response?.data?.message || 'Failed to delete category', 'error');
    }
  };

  // ── Packages ──
  const lineTotal = lineItems.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

  const handleCreatePackage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTerm) { showMessage('No active term found. Activate a term first.', 'error'); return; }
    if (!pkgForm.name.trim()) { showMessage('Package name is required', 'error'); return; }
    const validItems = lineItems.filter((i) => i.categoryId > 0 && Number(i.amount) > 0);
    if (validItems.length === 0) { showMessage('Add at least one line item with a category and amount', 'error'); return; }
    setPkgSubmitting(true);
    try {
      await feesAPI.createPackage({
        termId: activeTerm.id,
        schoolId: 1,
        name: pkgForm.name,
        studentType: pkgForm.studentType,
        items: validItems.map((i) => ({ categoryId: i.categoryId, amount: Number(i.amount) })),
      });
      showMessage('Package created', 'success');
      setIsPkgModalOpen(false);
      setPkgForm(blankPackageForm());
      setLineItems([blankItem()]);
      const res = await feesAPI.getPackages(activeTerm.id);
      setPackages(res.data || []);
    } catch (err: any) {
      console.error(err.response);
      showMessage(err.response?.data?.message || 'Failed to create package', 'error');
    } finally {
      setPkgSubmitting(false);
    }
  };

  // ── Generate Invoices ──
  const handleGenerate = async () => {
    if (!activeTerm) { showMessage('No active term', 'error'); return; }
    setGenerating(true);
    setShowGenerateConfirm(false);
    try {
      const res = await feesAPI.generateInvoices({ schoolId: 1, termId: activeTerm.id });
      setGenerateResult(res.data);
      showMessage(`Invoices generated successfully`, 'success');
    } catch (err: any) {
      console.error(err.response);
      showMessage(err.response?.data?.message || 'Failed to generate invoices', 'error');
    } finally {
      setGenerating(false);
    }
  };

  const fieldStyle = { paddingLeft: '14px', paddingRight: '14px' };
  const labelStyle: React.CSSProperties = { fontSize: '12px', fontWeight: '600', color: '#0f172a', display: 'block', marginBottom: '6px' };
  const sectionHead: React.CSSProperties = { fontSize: '12px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' };

  return (
    <AdminLayout title="Fee Setup" subtitle="Categories, packages & invoices">
      {message && (
        <div style={{
          position: 'fixed', top: 80, right: 20, padding: '14px 18px', borderRadius: '10px',
          background: message.type === 'success' ? '#0ea5e9' : '#dc2626', color: 'white',
          fontSize: '13px', fontWeight: '500', zIndex: 9999, boxShadow: '0 4px 12px rgba(0,0,0,0.15)', maxWidth: 400,
        }}>
          {message.text}
        </div>
      )}

      {!activeTerm && !loading && (
        <div style={{ padding: '14px 18px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '10px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: 10, fontSize: '13px', color: '#92400e' }}>
          <AlertTriangle size={15} />
          No active term found. Go to Terms &amp; Periods to activate a term before creating packages.
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#475569' }}>Loading...</div>
      ) : (
        <>
          {/* ── Section 1: Categories ── */}
          <div className="table-card" style={{ marginBottom: 20 }}>
            <div className="table-head">
              <div>
                <h3>Fee Categories</h3>
                <p>{categories.length} categor{categories.length !== 1 ? 'ies' : 'y'}</p>
              </div>
              <button className="btn btn-primary" onClick={() => setIsCatModalOpen(true)}>
                <Plus size={14} /> Add Category
              </button>
            </div>

            {categories.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px', color: '#475569' }}>
                <Tag size={28} style={{ margin: '0 auto 10px', color: '#94a3b8' }} />
                <p>No categories yet. Create your first fee category.</p>
              </div>
            ) : (
              <div className="data-table-wrap">
                <table className="data-table">
                  <thead>
                    <tr><th>Category Name</th><th>Description</th><th></th></tr>
                  </thead>
                  <tbody>
                    {categories.map((c: any) => (
                      <tr key={c.id}>
                        <td><strong style={{ fontSize: 13 }}>{c.name}</strong></td>
                        <td style={{ color: '#64748b' }}>{c.description || '—'}</td>
                        <td>
                          <button
                            onClick={() => handleDeleteCategory(c.id)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', padding: '4px' }}
                            title="Delete category"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* ── Section 2: Packages ── */}
          <div className="table-card" style={{ marginBottom: 20 }}>
            <div className="table-head">
              <div>
                <h3>Fee Packages</h3>
                <p>{activeTerm ? `${activeTerm.name} · ` : ''}{packages.length} package{packages.length !== 1 ? 's' : ''}</p>
              </div>
              <button className="btn btn-primary" onClick={() => setIsPkgModalOpen(true)} disabled={!activeTerm}>
                <Plus size={14} /> New Package
              </button>
            </div>

            {packages.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px', color: '#475569' }}>
                <Package size={28} style={{ margin: '0 auto 10px', color: '#94a3b8' }} />
                <p>{activeTerm ? 'No packages for this term yet.' : 'Activate a term to create packages.'}</p>
              </div>
            ) : (
              <div className="data-table-wrap">
                <table className="data-table">
                  <thead>
                    <tr><th>Package Name</th><th>Student Type</th><th>Total Amount</th><th>Line Items</th></tr>
                  </thead>
                  <tbody>
                    {packages.map((p: any) => (
                      <tr key={p.id}>
                        <td><strong style={{ fontSize: 13 }}>{p.name}</strong></td>
                        <td>
                          <span className="pill" style={{ background: p.studentType === 'Boarding' ? '#fff7ed' : '#eef2ff', color: p.studentType === 'Boarding' ? '#ea580c' : '#4338ca' }}>
                            {p.studentType}
                          </span>
                        </td>
                        <td><strong>${Number(p.totalAmount ?? 0).toLocaleString()}</strong></td>
                        <td style={{ color: '#64748b' }}>{p.items?.length ?? 0} item{(p.items?.length ?? 0) !== 1 ? 's' : ''}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* ── Section 3: Generate Invoices ── */}
          <div className="table-card">
            <div className="table-head">
              <div>
                <h3>Generate Invoices</h3>
                <p>Create invoices for all active students in the current term</p>
              </div>
            </div>
            <div style={{ padding: '24px' }}>
              {generateResult && (
                <div style={{ padding: '14px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: 10, fontSize: '13px', color: '#166534' }}>
                  <CheckCircle size={16} />
                  <div>
                    <strong>Invoices generated successfully.</strong>
                    {generateResult.invoicesCreated != null && <span> {generateResult.invoicesCreated} invoice{generateResult.invoicesCreated !== 1 ? 's' : ''} created.</span>}
                  </div>
                </div>
              )}

              <div style={{ padding: '16px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', marginBottom: '16px', fontSize: '13px', color: '#92400e', display: 'flex', gap: 10 }}>
                <AlertTriangle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
                <div>
                  This will create fee invoices for <strong>all active students</strong> in <strong>{activeTerm?.name ?? 'the active term'}</strong> using their assigned fee package.
                  Running this more than once may create duplicate invoices. Make sure packages are configured before proceeding.
                </div>
              </div>

              {!showGenerateConfirm ? (
                <button
                  className="btn btn-primary"
                  style={{ fontSize: '14px', padding: '10px 20px' }}
                  onClick={() => setShowGenerateConfirm(true)}
                  disabled={!activeTerm || generating}
                >
                  <Zap size={15} />
                  Generate Invoices for {activeTerm?.name ?? 'Active Term'}
                </button>
              ) : (
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <span style={{ fontSize: '13px', color: '#475569' }}>Are you sure?</span>
                  <button className="btn btn-primary" onClick={handleGenerate} disabled={generating} style={{ opacity: generating ? 0.7 : 1 }}>
                    {generating ? 'Generating...' : 'Yes, Generate'}
                  </button>
                  <button className="btn btn-secondary" onClick={() => setShowGenerateConfirm(false)} disabled={generating}>Cancel</button>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* ── Category Modal ── */}
      {isCatModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}
          onClick={() => setIsCatModalOpen(false)}>
          <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 20px 60px rgba(0,0,0,0.15)', width: '100%', maxWidth: '440px' }}
            onClick={(e) => e.stopPropagation()}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '16px', fontWeight: '700', margin: 0 }}>Add Fee Category</h2>
              <button onClick={() => setIsCatModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#475569' }}><X size={18} /></button>
            </div>
            <form onSubmit={handleCreateCategory} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={labelStyle}>Category Name *</label>
                <input type="text" value={catForm.name} onChange={(e) => setCatForm({ ...catForm, name: e.target.value })}
                  placeholder="e.g. Tuition Fee, Sports Levy" required className="text-field" style={fieldStyle} />
              </div>
              <div>
                <label style={labelStyle}>Description</label>
                <input type="text" value={catForm.description} onChange={(e) => setCatForm({ ...catForm, description: e.target.value })}
                  placeholder="Brief description" className="text-field" style={fieldStyle} />
              </div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', paddingTop: '8px', borderTop: '1px solid #e2e8f0' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsCatModalOpen(false)} disabled={catSubmitting}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={catSubmitting} style={{ opacity: catSubmitting ? 0.7 : 1 }}>
                  {catSubmitting ? 'Creating...' : 'Create Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Package Modal ── */}
      {isPkgModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}
          onClick={() => setIsPkgModalOpen(false)}>
          <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 20px 60px rgba(0,0,0,0.15)', width: '100%', maxWidth: '560px', maxHeight: '90vh', overflow: 'auto' }}
            onClick={(e) => e.stopPropagation()}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', position: 'sticky', top: 0, background: 'white', zIndex: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ fontSize: '16px', fontWeight: '700', margin: 0 }}>Create Fee Package</h2>
                <p style={{ fontSize: '12px', color: '#64748b', margin: '4px 0 0' }}>{activeTerm?.name}</p>
              </div>
              <button onClick={() => setIsPkgModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#475569' }}><X size={18} /></button>
            </div>

            <form onSubmit={handleCreatePackage} style={{ padding: '24px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
                <div>
                  <label style={labelStyle}>Package Name *</label>
                  <input type="text" value={pkgForm.name} onChange={(e) => setPkgForm({ ...pkgForm, name: e.target.value })}
                    placeholder="e.g. Day Scholar Package" required className="text-field" style={fieldStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Student Type</label>
                  <select value={pkgForm.studentType} onChange={(e) => setPkgForm({ ...pkgForm, studentType: e.target.value })}
                    className="text-field" style={{ ...fieldStyle, appearance: 'auto', cursor: 'pointer' }}>
                    <option value="Day">Day Scholar</option>
                    <option value="Boarding">Boarding</option>
                  </select>
                </div>
              </div>

              <h3 style={sectionHead}>Line Items</h3>
              {lineItems.map((item, idx) => (
                <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 140px 32px', gap: '8px', marginBottom: '8px', alignItems: 'center' }}>
                  <select
                    value={item.categoryId}
                    onChange={(e) => {
                      const updated = [...lineItems];
                      updated[idx] = { ...item, categoryId: Number(e.target.value) };
                      setLineItems(updated);
                    }}
                    className="text-field"
                    style={{ ...fieldStyle, appearance: 'auto', cursor: 'pointer' }}
                  >
                    <option value={0}>Select category...</option>
                    {categories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <input
                    type="number"
                    value={item.amount}
                    onChange={(e) => {
                      const updated = [...lineItems];
                      updated[idx] = { ...item, amount: e.target.value };
                      setLineItems(updated);
                    }}
                    placeholder="Amount"
                    min="0"
                    className="text-field"
                    style={fieldStyle}
                  />
                  <button
                    type="button"
                    onClick={() => setLineItems(lineItems.filter((_, i) => i !== idx))}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', padding: 4 }}
                    disabled={lineItems.length === 1}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}

              <button type="button" className="btn btn-secondary" style={{ fontSize: '12px', marginBottom: '16px' }}
                onClick={() => setLineItems([...lineItems, blankItem()])}>
                <Plus size={13} /> Add Line Item
              </button>

              {lineTotal > 0 && (
                <div style={{ padding: '12px 16px', background: '#f8fafc', borderRadius: '8px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                  <span style={{ color: '#475569' }}>Package Total:</span>
                  <strong>${lineTotal.toLocaleString()}</strong>
                </div>
              )}

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', paddingTop: '16px', borderTop: '1px solid #e2e8f0' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsPkgModalOpen(false)} disabled={pkgSubmitting}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={pkgSubmitting} style={{ opacity: pkgSubmitting ? 0.7 : 1 }}>
                  {pkgSubmitting ? 'Creating...' : 'Create Package'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
