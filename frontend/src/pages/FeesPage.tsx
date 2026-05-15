import { useState, useEffect } from 'react';
import { feesAPI } from '../services/api';
import { DollarSign, FileText, TrendingUp, Clock, Receipt, FileDown, FileSpreadsheet, X, CreditCard } from 'lucide-react';
import AdminLayout from '../components/AdminLayout';
import { exportTableToExcel, exportTableToPdf, exportTableToWord } from '../utils/exportTable';

type FilterKey = 'all' | 'Paid' | 'PartiallyPaid' | 'Unpaid';

const FILTERS: { label: string; value: FilterKey }[] = [
  { label: 'All', value: 'all' },
  { label: 'Paid', value: 'Paid' },
  { label: 'Partial', value: 'PartiallyPaid' },
  { label: 'Unpaid', value: 'Unpaid' },
];

const todayISO = () => new Date().toISOString().split('T')[0];

const blankPayment = (invoiceId: number) => ({
  invoiceId,
  amount: '',
  paymentMethod: 'Bank Deposit',
  bankReceiptNumber: '',
  paymentDate: todayISO(),
  notes: '',
});

export default function FeesPage() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterKey>('all');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [paymentModal, setPaymentModal] = useState<{ open: boolean; invoice: any | null }>({ open: false, invoice: null });
  const [paymentForm, setPaymentForm] = useState(blankPayment(0));
  const [paying, setPaying] = useState(false);

  useEffect(() => { loadInvoices(); }, []);

  const loadInvoices = async () => {
    try {
      const res = await feesAPI.getTermInvoices(1, 1);
      setInvoices(res.data.invoices || []);
      setSummary(res.data.summary || null);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (text: string, type: 'success' | 'error') => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  const openPaymentModal = (invoice: any) => {
    setPaymentForm(blankPayment(invoice.id));
    setPaymentModal({ open: true, invoice });
  };

  const closePaymentModal = () => {
    setPaymentModal({ open: false, invoice: null });
    setPaymentForm(blankPayment(0));
  };

  const handlePostPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentForm.amount || Number(paymentForm.amount) <= 0) {
      showMessage('Enter a valid payment amount', 'error');
      return;
    }
    setPaying(true);
    try {
      const res = await feesAPI.postPayment({
        invoiceId: paymentForm.invoiceId,
        amount: Number(paymentForm.amount),
        paymentMethod: paymentForm.paymentMethod,
        bankReceiptNumber: paymentForm.bankReceiptNumber,
        paymentDate: paymentForm.paymentDate,
        notes: paymentForm.notes,
      });
      console.log('Payment response:', res.data);
      const ref = res.data?.receiptNumber ?? res.data?.reference ?? res.data?.id ?? '';
      showMessage(`Payment posted successfully${ref ? ` · Ref: ${ref}` : ''}`, 'success');
      closePaymentModal();
      loadInvoices();
    } catch (err: any) {
      console.error('Payment error:', err.response);
      showMessage(err.response?.data?.message || 'Failed to post payment', 'error');
    } finally {
      setPaying(false);
    }
  };

  const filtered = filter === 'all' ? invoices : invoices.filter((inv) => inv.status === filter);

  const exportRows = filtered.map((inv) => ({
    invoiceNumber: inv.invoiceNumber ?? '',
    studentName: `${inv.student?.firstName ?? ''} ${inv.student?.surname ?? ''}`.trim(),
    total: Number(inv.totalAmount ?? 0),
    paid: Number(inv.amountPaid ?? 0),
    balance: Number(inv.balance ?? 0),
    status: inv.status ?? '',
  }));
  const exportColumns = [
    { header: 'Invoice Number', value: (r: typeof exportRows[number]) => r.invoiceNumber },
    { header: 'Student Name', value: (r: typeof exportRows[number]) => r.studentName },
    { header: 'Total', value: (r: typeof exportRows[number]) => `$${r.total.toLocaleString()}` },
    { header: 'Paid', value: (r: typeof exportRows[number]) => `$${r.paid.toLocaleString()}` },
    { header: 'Balance', value: (r: typeof exportRows[number]) => `$${r.balance.toLocaleString()}` },
    { header: 'Status', value: (r: typeof exportRows[number]) => r.status === 'PartiallyPaid' ? 'Partial' : r.status },
  ];

  const summaryCards = summary ? [
    { label: 'Total Billed', value: `$${Number(summary.totalBilled).toLocaleString()}`, icon: FileText, iconBg: '#eef2ff', iconColor: '#1a237e' },
    { label: 'Collected', value: `$${Number(summary.totalCollected).toLocaleString()}`, icon: TrendingUp, iconBg: '#f0fdf4', iconColor: '#15803d' },
    { label: 'Outstanding', value: `$${Number(summary.totalOutstanding).toLocaleString()}`, icon: DollarSign, iconBg: '#fef2f2', iconColor: '#dc2626' },
    { label: 'Unpaid Invoices', value: summary.unpaid ?? '0', icon: Clock, iconBg: '#fffbeb', iconColor: '#b45309' },
  ] : [];

  const statusClass = (status: string) =>
    status === 'Paid' ? 'pill pill-success' : status === 'PartiallyPaid' ? 'pill pill-warning' : 'pill pill-danger';

  const fieldStyle = { paddingLeft: '14px', paddingRight: '14px' };
  const labelStyle: React.CSSProperties = { fontSize: '12px', fontWeight: '600', color: '#0f172a', display: 'block', marginBottom: '6px' };

  return (
    <AdminLayout title="Fees & Billing" subtitle="Term 1 · 2026">
      {message && (
        <div style={{
          position: 'fixed', top: 80, right: 20, padding: '14px 18px', borderRadius: '10px',
          background: message.type === 'success' ? '#0ea5e9' : '#dc2626', color: 'white',
          fontSize: '13px', fontWeight: '500', zIndex: 9999, boxShadow: '0 4px 12px rgba(0,0,0,0.15)', maxWidth: 420,
        }}>
          {message.text}
        </div>
      )}

      {summary && (
        <section className="stat-grid" style={{ marginBottom: 16 }}>
          {summaryCards.map(({ label, value, icon: Icon, iconBg, iconColor }) => (
            <div key={label} className="stat-card">
              <span className="stat-icon" style={{ background: iconBg, color: iconColor }}><Icon size={17} /></span>
              <p className="value">{value}</p>
              <p className="label">{label}</p>
            </div>
          ))}
        </section>
      )}

      <section className="table-card">
        <div className="table-head">
          <div>
            <h3>Invoices</h3>
            <p>{filtered.length} record{filtered.length !== 1 ? 's' : ''}</p>
          </div>
          <div className="toolbar-actions">
            <div className="table-filter">
              {FILTERS.map(({ label, value }) => (
                <button key={value} onClick={() => setFilter(value)} className={filter === value ? 'active' : ''}>{label}</button>
              ))}
            </div>
            <button className="btn btn-secondary export-btn" onClick={() => exportTableToPdf({ title: 'Fees', filename: 'fees.pdf', columns: exportColumns, rows: exportRows })} disabled={!filtered.length}><FileDown size={14} /> PDF</button>
            <button className="btn btn-secondary export-btn" onClick={() => exportTableToExcel({ sheetName: 'Fees', filename: 'fees.xlsx', columns: exportColumns, rows: exportRows })} disabled={!filtered.length}><FileSpreadsheet size={14} /> Excel</button>
            <button className="btn btn-secondary export-btn" onClick={() => exportTableToWord({ title: 'Fees', filename: 'fees.docx', columns: exportColumns, rows: exportRows })} disabled={!filtered.length}><FileText size={14} /> Word</button>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#475569' }}>Loading invoices...</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#475569' }}>
            <Receipt size={22} style={{ margin: '0 auto 8px', color: '#94a3b8' }} />
            No invoices found for the selected filter.
          </div>
        ) : (
          <>
            <div className="data-table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Invoice</th><th>Student</th><th>Total</th><th>Paid</th><th>Balance</th><th>Status</th><th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((inv) => (
                    <tr key={inv.id}>
                      <td style={{ fontFamily: 'ui-monospace, monospace' }}>{inv.invoiceNumber}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div className="mini-avatar">{inv.student?.firstName?.[0]}{inv.student?.surname?.[0]}</div>
                          <span>{inv.student?.firstName} {inv.student?.surname}</span>
                        </div>
                      </td>
                      <td>${Number(inv.totalAmount).toLocaleString()}</td>
                      <td style={{ color: '#15803d', fontWeight: 600 }}>${Number(inv.amountPaid).toLocaleString()}</td>
                      <td style={{ color: Number(inv.balance) > 0 ? '#dc2626' : '#64748b', fontWeight: 600 }}>
                        ${Number(inv.balance).toLocaleString()}
                      </td>
                      <td><span className={statusClass(inv.status)}>{inv.status === 'PartiallyPaid' ? 'Partial' : inv.status}</span></td>
                      <td>
                        {inv.status !== 'Paid' && (
                          <button
                            className="btn btn-primary"
                            style={{ padding: '5px 10px', fontSize: 12 }}
                            onClick={() => openPaymentModal(inv)}
                          >
                            <CreditCard size={12} /> Post Payment
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="table-footer">{filtered.length} invoice{filtered.length !== 1 ? 's' : ''}</div>
          </>
        )}
      </section>

      {/* ── Payment Modal ── */}
      {paymentModal.open && paymentModal.invoice && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}
          onClick={closePaymentModal}>
          <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 20px 60px rgba(0,0,0,0.15)', width: '100%', maxWidth: '480px' }}
            onClick={(e) => e.stopPropagation()}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ fontSize: '16px', fontWeight: '700', margin: 0 }}>Post Payment</h2>
                <p style={{ fontSize: '12px', color: '#64748b', margin: '4px 0 0' }}>
                  {paymentModal.invoice.student?.firstName} {paymentModal.invoice.student?.surname} · {paymentModal.invoice.invoiceNumber}
                </p>
              </div>
              <button onClick={closePaymentModal} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#475569' }}><X size={18} /></button>
            </div>

            {/* Invoice summary */}
            <div style={{ padding: '14px 24px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, fontSize: '12px' }}>
              {[
                ['Total', `$${Number(paymentModal.invoice.totalAmount).toLocaleString()}`],
                ['Paid', `$${Number(paymentModal.invoice.amountPaid).toLocaleString()}`],
                ['Balance', `$${Number(paymentModal.invoice.balance).toLocaleString()}`],
              ].map(([label, value]) => (
                <div key={label}>
                  <p style={{ color: '#64748b', margin: 0 }}>{label}</p>
                  <p style={{ fontWeight: 700, color: '#0f172a', margin: '2px 0 0' }}>{value}</p>
                </div>
              ))}
            </div>

            <form onSubmit={handlePostPayment} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={labelStyle}>Amount *</label>
                  <input
                    type="number"
                    value={paymentForm.amount}
                    onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                    placeholder="0.00"
                    min="0.01"
                    step="0.01"
                    required
                    className="text-field"
                    style={fieldStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Payment Date</label>
                  <input
                    type="date"
                    value={paymentForm.paymentDate}
                    onChange={(e) => setPaymentForm({ ...paymentForm, paymentDate: e.target.value })}
                    className="text-field"
                    style={fieldStyle}
                  />
                </div>
              </div>

              <div>
                <label style={labelStyle}>Payment Method</label>
                <select
                  value={paymentForm.paymentMethod}
                  onChange={(e) => setPaymentForm({ ...paymentForm, paymentMethod: e.target.value })}
                  className="text-field"
                  style={{ ...fieldStyle, appearance: 'auto', cursor: 'pointer' }}
                >
                  <option value="Bank Deposit">Bank Deposit</option>
                  <option value="Cash">Cash</option>
                  <option value="EcoCash">EcoCash</option>
                  <option value="Swipe">Swipe / Card</option>
                </select>
              </div>

              <div>
                <label style={labelStyle}>Bank Receipt / Reference Number</label>
                <input
                  type="text"
                  value={paymentForm.bankReceiptNumber}
                  onChange={(e) => setPaymentForm({ ...paymentForm, bankReceiptNumber: e.target.value })}
                  placeholder="e.g. TXN123456"
                  className="text-field"
                  style={fieldStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>Notes</label>
                <input
                  type="text"
                  value={paymentForm.notes}
                  onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                  placeholder="Optional notes"
                  className="text-field"
                  style={fieldStyle}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', paddingTop: '8px', borderTop: '1px solid #e2e8f0' }}>
                <button type="button" className="btn btn-secondary" onClick={closePaymentModal} disabled={paying}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={paying} style={{ opacity: paying ? 0.7 : 1 }}>
                  {paying ? 'Posting...' : 'Post Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
