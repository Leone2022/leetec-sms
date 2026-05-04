import { useState, useEffect } from 'react';
import { feesAPI } from '../services/api';
import { DollarSign, FileText, TrendingUp, Clock, Receipt } from 'lucide-react';
import AdminLayout from '../components/AdminLayout';

type FilterKey = 'all' | 'Paid' | 'PartiallyPaid' | 'Unpaid';

const FILTERS: { label: string; value: FilterKey }[] = [
  { label: 'All', value: 'all' },
  { label: 'Paid', value: 'Paid' },
  { label: 'Partial', value: 'PartiallyPaid' },
  { label: 'Unpaid', value: 'Unpaid' },
];

export default function FeesPage() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterKey>('all');

  useEffect(() => {
    loadInvoices();
  }, []);

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

  const filtered = filter === 'all' ? invoices : invoices.filter((inv) => inv.status === filter);

  const summaryCards = summary
    ? [
        {
          label: 'Total Billed',
          value: `$${Number(summary.totalBilled).toLocaleString()}`,
          icon: FileText,
          iconBg: '#eef2ff',
          iconColor: '#1a237e',
        },
        {
          label: 'Collected',
          value: `$${Number(summary.totalCollected).toLocaleString()}`,
          icon: TrendingUp,
          iconBg: '#f0fdf4',
          iconColor: '#15803d',
        },
        {
          label: 'Outstanding',
          value: `$${Number(summary.totalOutstanding).toLocaleString()}`,
          icon: DollarSign,
          iconBg: '#fef2f2',
          iconColor: '#dc2626',
        },
        {
          label: 'Unpaid Invoices',
          value: summary.unpaid ?? '0',
          icon: Clock,
          iconBg: '#fffbeb',
          iconColor: '#b45309',
        },
      ]
    : [];

  const statusClass = (status: string) => {
    if (status === 'Paid') {
      return 'pill pill-success';
    }
    if (status === 'PartiallyPaid') {
      return 'pill pill-warning';
    }
    return 'pill pill-danger';
  };

  return (
    <AdminLayout title="Fees & Billing" subtitle="Term 1 · 2026">
      {summary && (
        <section className="stat-grid" style={{ marginBottom: 16 }}>
          {summaryCards.map(({ label, value, icon: Icon, iconBg, iconColor }) => (
            <div key={label} className="stat-card">
              <span className="stat-icon" style={{ background: iconBg, color: iconColor }}>
                <Icon size={17} />
              </span>
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
            <p>
              {filtered.length} record{filtered.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="table-filter">
            {FILTERS.map(({ label, value }) => (
              <button
                key={value}
                onClick={() => setFilter(value)}
                className={filter === value ? 'active' : ''}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="surface-card" style={{ border: 0, boxShadow: 'none', textAlign: 'center' }}>
            Loading invoices...
          </div>
        ) : filtered.length === 0 ? (
          <div className="surface-card" style={{ border: 0, boxShadow: 'none', textAlign: 'center' }}>
            <Receipt size={22} style={{ margin: '0 auto 8px', color: '#94a3b8' }} />
            No invoices found for the selected filter.
          </div>
        ) : (
          <>
            <div className="data-table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Invoice</th>
                    <th>Student</th>
                    <th>Total</th>
                    <th>Paid</th>
                    <th>Balance</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((inv) => (
                    <tr key={inv.id}>
                      <td style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>
                        {inv.invoiceNumber}
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div className="mini-avatar">
                            {inv.student?.firstName?.[0]}
                            {inv.student?.surname?.[0]}
                          </div>
                          <span>
                            {inv.student?.firstName} {inv.student?.surname}
                          </span>
                        </div>
                      </td>
                      <td>${Number(inv.totalAmount).toLocaleString()}</td>
                      <td style={{ color: '#15803d', fontWeight: 600 }}>
                        ${Number(inv.amountPaid).toLocaleString()}
                      </td>
                      <td
                        style={{
                          color: Number(inv.balance) > 0 ? '#dc2626' : '#64748b',
                          fontWeight: 600,
                        }}
                      >
                        ${Number(inv.balance).toLocaleString()}
                      </td>
                      <td>
                        <span className={statusClass(inv.status)}>
                          {inv.status === 'PartiallyPaid' ? 'Partial' : inv.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="table-footer">
              {filtered.length} invoice{filtered.length !== 1 ? 's' : ''}
            </div>
          </>
        )}
      </section>
    </AdminLayout>
  );
}