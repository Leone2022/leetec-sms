import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { studentsAPI, feesAPI } from '../services/api';
import { Users, DollarSign, FileText, TrendingUp, ArrowUpRight } from 'lucide-react';
import AdminLayout from '../components/AdminLayout';

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalBilled: 0,
    totalCollected: 0,
    totalOutstanding: 0,
  });

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const [studentsRes, feesRes] = await Promise.all([
        studentsAPI.getAll(1),
        feesAPI.getTermInvoices(1, 1),
      ]);
      setStats({
        totalStudents: studentsRes.data.length,
        totalBilled: feesRes.data.summary?.totalBilled || 0,
        totalCollected: feesRes.data.summary?.totalCollected || 0,
        totalOutstanding: feesRes.data.summary?.totalOutstanding || 0,
      });
    } catch (err) {
      console.error(err);
    }
  };

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const statCards = [
    {
      label: 'Total Students',
      value: stats.totalStudents.toLocaleString(),
      icon: Users,
      iconBg: '#eef2ff',
      iconColor: '#1a237e',
      path: '/students',
    },
    {
      label: 'Total Billed',
      value: `$${stats.totalBilled.toLocaleString()}`,
      icon: FileText,
      iconBg: '#eff6ff',
      iconColor: '#1d4ed8',
      path: '/fees',
    },
    {
      label: 'Collected',
      value: `$${stats.totalCollected.toLocaleString()}`,
      icon: TrendingUp,
      iconBg: '#f0fdf4',
      iconColor: '#15803d',
      path: '/fees',
    },
    {
      label: 'Outstanding',
      value: `$${stats.totalOutstanding.toLocaleString()}`,
      icon: DollarSign,
      iconBg: '#fef2f2',
      iconColor: '#dc2626',
      path: '/fees',
    },
  ];

  const quickNav = [
    { label: 'Students', desc: 'Manage enrolment and profiles', path: '/students' },
    { label: 'Fees & Billing', desc: 'Track invoices and collections', path: '/fees' },
    { label: 'Approvals', desc: 'Review pending requests', path: '/approvals' },
  ];

  return (
    <AdminLayout title="Dashboard" subtitle={`${greeting}, ${user?.firstName ?? 'Admin'}`}>
      <div className="page-grid">
        <section className="hero-card">
          <h2>
            {greeting}, {user?.firstName} {user?.lastName}
          </h2>
          <p>
            Real-time visibility into student records, billing flow, and cash collection for
            Term 1.
          </p>
        </section>

        <section className="stat-grid">
          {statCards.map(({ label, value, icon: Icon, iconBg, iconColor, path }) => (
            <button
              key={label}
              className="stat-card"
              onClick={() => navigate(path)}
              style={{ textAlign: 'left', cursor: 'pointer' }}
            >
              <span className="stat-icon" style={{ background: iconBg, color: iconColor }}>
                <Icon size={18} />
              </span>
              <p className="value">{value}</p>
              <p className="label">{label}</p>
            </button>
          ))}
        </section>

        <section className="quick-grid">
          {quickNav.map(({ label, desc, path }) => (
            <button
              key={label}
              className="quick-card"
              onClick={() => navigate(path)}
              style={{ textAlign: 'left', cursor: 'pointer' }}
            >
              <h3>{label}</h3>
              <p>{desc}</p>
              <span style={{ marginTop: 8, color: '#2563eb', fontSize: 12, fontWeight: 600 }}>
                Open module <ArrowUpRight size={13} style={{ verticalAlign: 'middle' }} />
              </span>
            </button>
          ))}
        </section>
      </div>
    </AdminLayout>
  );
}