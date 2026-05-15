import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { portalAPI, feesAPI, studentsAPI } from '../services/api';
import {
  LogOut, GraduationCap, LayoutDashboard, DollarSign,
  BarChart3, Bell, User, Menu, X, ChevronDown, ChevronUp,
} from 'lucide-react';

type View = 'dashboard' | 'fees' | 'results' | 'announcements' | 'profile';

const NAV: { id: View; label: string; Icon: React.ComponentType<{ size?: number }> }[] = [
  { id: 'dashboard', label: 'Dashboard', Icon: LayoutDashboard },
  { id: 'fees', label: 'My Fees', Icon: DollarSign },
  { id: 'results', label: 'My Results', Icon: BarChart3 },
  { id: 'announcements', label: 'Announcements', Icon: Bell },
  { id: 'profile', label: 'My Profile', Icon: User },
];

export default function StudentDashboardPage() {
  const navigate = useNavigate();
  const [view, setView] = useState<View>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [dashboard, setDashboard] = useState<any>(null);
  const [allInvoices, setAllInvoices] = useState<any[]>([]);
  const [fullProfile, setFullProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [expandedInvoice, setExpandedInvoice] = useState<number | null>(null);

  const studentInfo = JSON.parse(localStorage.getItem('student_info') || '{}');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const studentId = studentInfo?.id ?? studentInfo?.studentId;
    try {
      const dashRes = await portalAPI.getDashboard(studentId ?? 1);
      setDashboard(dashRes.data);
      if (studentId) {
        await Promise.allSettled([
          feesAPI.getStudentInvoices(studentId).then(r => setAllInvoices(r.data || [])),
          studentsAPI.getById(studentId).then(r => setFullProfile(r.data)),
        ]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('student_token');
    localStorage.removeItem('student_info');
    navigate('/student-login');
  };

  const handleNav = (v: View) => { setView(v); setSidebarOpen(false); };

  const student = dashboard?.student ?? studentInfo;
  const invoice = dashboard?.latestInvoice;
  const firstName = student?.firstName ?? '';
  const surname = student?.surname ?? '';
  const initials = `${firstName[0] ?? ''}${surname[0] ?? ''}`.toUpperCase();

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const statusPill = (status: string) =>
    status === 'Paid' ? 'pill-success' : status === 'PartiallyPaid' ? 'pill-warning' : 'pill-danger';

  const fmtAmt = (v: any) => `$${Number(v ?? 0).toLocaleString()}`;

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#f8fafc' }}>
        <div style={{ textAlign: 'center' }}>
          <GraduationCap size={36} style={{ color: '#1a237e', margin: '0 auto 12px' }} />
          <p style={{ color: '#475569', fontSize: '14px' }}>Loading your portal...</p>
        </div>
      </div>
    );
  }

  // ── Sidebar ──────────────────────────────────────────────────
  const Sidebar = (
    <aside style={{
      width: 260, background: '#1a237e', display: 'flex', flexDirection: 'column',
      height: '100%', flexShrink: 0,
    }}>
      {/* Brand */}
      <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <div style={{ width: 32, height: 32, background: 'rgba(255,255,255,0.15)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <GraduationCap size={16} color="white" />
          </div>
          <div>
            <p style={{ color: 'white', fontWeight: 700, fontSize: 13, margin: 0 }}>LeeTec SMS</p>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11, margin: 0 }}>Student Portal</p>
          </div>
        </div>

        {/* Avatar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 48, height: 48, borderRadius: '50%', background: 'rgba(255,255,255,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18, fontWeight: 700, color: 'white', flexShrink: 0,
          }}>
            {initials}
          </div>
          <div style={{ minWidth: 0 }}>
            <p style={{ color: 'white', fontWeight: 600, fontSize: 13, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {firstName} {surname}
            </p>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11, margin: '2px 0 0', fontFamily: 'ui-monospace, monospace' }}>
              {student?.studentNumber ?? '—'}
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)' }}>{student?.form}</span>
              <span style={{
                fontSize: 10, padding: '1px 6px', borderRadius: 10,
                background: student?.status === 'Active' ? '#22c55e' : '#ef4444',
                color: 'white', fontWeight: 600,
              }}>
                {student?.status ?? 'Active'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: 2 }}>
        <p style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '4px 10px 8px' }}>
          Menu
        </p>
        {NAV.map(({ id, label, Icon }) => {
          const active = view === id;
          return (
            <button
              key={id}
              onClick={() => handleNav(id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px',
                borderRadius: 8, border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left',
                background: active ? 'rgba(255,255,255,0.15)' : 'transparent',
                color: active ? 'white' : 'rgba(255,255,255,0.65)',
                fontWeight: active ? 600 : 400, fontSize: 13, transition: 'all 0.15s',
              }}
            >
              <Icon size={15} />
              {label}
            </button>
          );
        })}
      </nav>

      {/* Sign out */}
      <div style={{ padding: '12px 10px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
        <button
          onClick={handleLogout}
          style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px',
            borderRadius: 8, border: 'none', cursor: 'pointer', width: '100%',
            background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)',
            fontSize: 13, fontWeight: 500,
          }}
        >
          <LogOut size={14} />
          Sign Out
        </button>
      </div>
    </aside>
  );

  // ── Content views ─────────────────────────────────────────────

  const DashboardView = (
    <div style={{ padding: '28px 32px', maxWidth: 900 }}>
      {/* Welcome */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#0f172a', margin: 0 }}>
          {greeting}, {firstName}!
        </h1>
        <p style={{ color: '#64748b', fontSize: 13, margin: '4px 0 0' }}>
          Here's a summary of your account.
        </p>
      </div>

      {/* Quick stats */}
      {invoice && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 24 }}>
          {[
            {
              label: 'Balance Due', value: fmtAmt(invoice.balance),
              color: Number(invoice.balance) > 0 ? '#dc2626' : '#15803d',
              bg: Number(invoice.balance) > 0 ? '#fef2f2' : '#f0fdf4',
            },
            { label: 'Amount Paid', value: fmtAmt(invoice.amountPaid), color: '#15803d', bg: '#f0fdf4' },
            { label: 'Total Invoiced', value: fmtAmt(invoice.totalAmount), color: '#1a237e', bg: '#eef2ff' },
          ].map(({ label, value, color, bg }) => (
            <div key={label} style={{ background: 'white', borderRadius: 12, padding: '18px 20px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9' }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
                <DollarSign size={15} color={color} />
              </div>
              <p style={{ fontSize: 22, fontWeight: 700, color, margin: 0 }}>{value}</p>
              <p style={{ fontSize: 12, color: '#64748b', margin: '2px 0 0' }}>{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Latest invoice */}
      {invoice ? (
        <div style={{ background: 'white', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ fontWeight: 700, fontSize: 14, margin: 0 }}>Latest Invoice</h3>
              <p style={{ fontSize: 12, color: '#64748b', margin: '2px 0 0', fontFamily: 'ui-monospace, monospace' }}>{invoice.invoiceNumber}</p>
            </div>
            <span className={`pill ${statusPill(invoice.status)}`}>
              {invoice.status === 'PartiallyPaid' ? 'Partially Paid' : invoice.status}
            </span>
          </div>
          {invoice.items?.length > 0 && (
            <div style={{ padding: '0 20px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', padding: '10px 0 8px', color: '#64748b', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid #f1f5f9' }}>Description</th>
                    <th style={{ textAlign: 'right', padding: '10px 0 8px', color: '#64748b', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid #f1f5f9' }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.items.map((item: any, i: number) => (
                    <tr key={item.id ?? i}>
                      <td style={{ padding: '8px 0', borderBottom: '1px solid #f8fafc' }}>{item.description ?? item.category?.name ?? `Item ${i + 1}`}</td>
                      <td style={{ padding: '8px 0', textAlign: 'right', fontWeight: 600, borderBottom: '1px solid #f8fafc' }}>{fmtAmt(item.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div style={{ padding: '14px 20px', background: '#f8fafc', borderTop: '1px solid #f1f5f9', display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13 }}>
            {[
              ['Total Amount', fmtAmt(invoice.totalAmount), false],
              ['Amount Paid', fmtAmt(invoice.amountPaid), false],
              ['Balance Due', fmtAmt(invoice.balance), true],
            ].map(([label, value, bold]) => (
              <div key={label as string} style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>{label as string}</span>
                <strong style={{ color: (bold && Number(invoice.balance) > 0) ? '#dc2626' : bold ? '#15803d' : '#0f172a' }}>{value as string}</strong>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div style={{ background: 'white', borderRadius: 12, padding: '40px', textAlign: 'center', color: '#64748b', fontSize: 13 }}>
          No invoice found for the current term.
        </div>
      )}
    </div>
  );

  const FeesView = (
    <div style={{ padding: '28px 32px', maxWidth: 900 }}>
      <h1 style={{ fontSize: 20, fontWeight: 700, color: '#0f172a', margin: '0 0 20px' }}>My Fees</h1>
      {allInvoices.length === 0 ? (
        <div style={{ background: 'white', borderRadius: 12, padding: '40px', textAlign: 'center', color: '#64748b', fontSize: 13 }}>
          No invoices found.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {allInvoices.map((inv: any) => {
            const open = expandedInvoice === inv.id;
            return (
              <div key={inv.id} style={{ background: 'white', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9', overflow: 'hidden' }}>
                <button
                  onClick={() => setExpandedInvoice(open ? null : inv.id)}
                  style={{ width: '100%', padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 13, fontWeight: 600, color: '#0f172a' }}>{inv.invoiceNumber}</span>
                    <span style={{ fontSize: 12, color: '#64748b' }}>{inv.term?.name ?? '—'}</span>
                    <span className={`pill ${statusPill(inv.status)}`} style={{ fontSize: 11 }}>
                      {inv.status === 'PartiallyPaid' ? 'Partial' : inv.status}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ fontSize: 13, fontWeight: 700, color: Number(inv.balance) > 0 ? '#dc2626' : '#15803d', margin: 0 }}>
                        {fmtAmt(inv.balance)} balance
                      </p>
                      <p style={{ fontSize: 11, color: '#64748b', margin: 0 }}>of {fmtAmt(inv.totalAmount)}</p>
                    </div>
                    {open ? <ChevronUp size={16} color="#64748b" /> : <ChevronDown size={16} color="#64748b" />}
                  </div>
                </button>
                {open && (
                  <div style={{ borderTop: '1px solid #f1f5f9' }}>
                    {inv.items?.length > 0 && (
                      <div style={{ padding: '0 20px' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                          <thead>
                            <tr>
                              <th style={{ textAlign: 'left', padding: '10px 0 6px', color: '#64748b', fontWeight: 600 }}>Description</th>
                              <th style={{ textAlign: 'right', padding: '10px 0 6px', color: '#64748b', fontWeight: 600 }}>Amount</th>
                            </tr>
                          </thead>
                          <tbody>
                            {inv.items.map((item: any, i: number) => (
                              <tr key={item.id ?? i}>
                                <td style={{ padding: '6px 0', borderTop: '1px solid #f8fafc' }}>{item.description ?? item.category?.name ?? `Item ${i + 1}`}</td>
                                <td style={{ padding: '6px 0', textAlign: 'right', fontWeight: 600, borderTop: '1px solid #f8fafc' }}>{fmtAmt(item.amount)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                    <div style={{ padding: '12px 20px', background: '#f8fafc', display: 'flex', gap: 24, fontSize: 12 }}>
                      {[['Total', fmtAmt(inv.totalAmount)], ['Paid', fmtAmt(inv.amountPaid)], ['Balance', fmtAmt(inv.balance)]].map(([l, v]) => (
                        <div key={l}><span style={{ color: '#64748b' }}>{l}: </span><strong>{v}</strong></div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  const ComingSoon = ({ label }: { label: string }) => (
    <div style={{ padding: '28px 32px', maxWidth: 600 }}>
      <h1 style={{ fontSize: 20, fontWeight: 700, color: '#0f172a', margin: '0 0 20px' }}>{label}</h1>
      <div style={{ background: 'white', borderRadius: 12, padding: '60px 40px', textAlign: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
        <div style={{ width: 56, height: 56, background: '#eef2ff', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
          <BarChart3 size={24} color="#1a237e" />
        </div>
        <h3 style={{ fontWeight: 700, fontSize: 16, margin: '0 0 8px' }}>Coming Soon</h3>
        <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>This feature is under development and will be available soon.</p>
      </div>
    </div>
  );

  const p = fullProfile || student;

  const ProfileField = ({ label, value }: { label: string; value?: string | null }) => (
    <div>
      <p style={{ color: '#64748b', margin: 0, marginBottom: 3, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>{label}</p>
      <p style={{ fontWeight: 600, color: '#0f172a', margin: 0, fontSize: 13 }}>{value || '—'}</p>
    </div>
  );

  const ProfileSection = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div style={{ background: 'white', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9', overflow: 'hidden', marginBottom: 16 }}>
      <div style={{ padding: '12px 20px', borderBottom: '1px solid #f1f5f9', background: '#f8fafc' }}>
        <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{title}</p>
      </div>
      <div style={{ padding: '20px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '18px 24px' }}>
        {children}
      </div>
    </div>
  );

  const guardians: any[] = p?.guardians ?? [];
  const contacts: any[] = p?.emergencyContacts ?? [];
  const family: any = p?.family ?? null;

  const ProfileView = (
    <div style={{ padding: '28px 32px', maxWidth: 860 }}>
      {/* Header card */}
      <div style={{ background: '#1a237e', borderRadius: 12, padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 18, marginBottom: 20 }}>
        <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 700, color: 'white', flexShrink: 0 }}>
          {initials}
        </div>
        <div style={{ flex: 1 }}>
          <h1 style={{ color: 'white', fontWeight: 700, fontSize: 20, margin: '0 0 4px' }}>{firstName} {surname}</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, fontFamily: 'ui-monospace, monospace' }}>{p?.studentNumber}</span>
            <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>·</span>
            <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>{p?.form}</span>
            <span style={{
              fontSize: 11, padding: '2px 8px', borderRadius: 20, fontWeight: 600,
              background: p?.status === 'Active' ? '#22c55e' : '#ef4444', color: 'white',
            }}>{p?.status ?? 'Active'}</span>
          </div>
        </div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', textAlign: 'right' }}>
          <p style={{ margin: 0 }}>Read-only view</p>
          <p style={{ margin: '2px 0 0' }}>Contact admin to update</p>
        </div>
      </div>

      {/* Personal Details */}
      <ProfileSection title="Personal Details">
        <ProfileField label="First Name" value={p?.firstName} />
        <ProfileField label="Surname" value={p?.surname} />
        <ProfileField label="Gender" value={p?.gender} />
        <ProfileField label="Date of Birth" value={p?.dateOfBirth ? new Date(p.dateOfBirth).toLocaleDateString() : null} />
        <ProfileField label="Birth Certificate No." value={p?.birthCertificateNo} />
        <ProfileField label="Race" value={p?.race} />
        <ProfileField label="Denomination" value={p?.denomination} />
        <ProfileField label="Email" value={p?.email} />
      </ProfileSection>

      {/* School Information */}
      <ProfileSection title="School Information">
        <ProfileField label="Form" value={p?.form} />
        <ProfileField label="Date of Entry" value={p?.dateOfEntry ? new Date(p.dateOfEntry).toLocaleDateString() : null} />
        <ProfileField label="Previous School" value={p?.previousSchool} />
        <ProfileField label="Student Number" value={p?.studentNumber} />
        <ProfileField label="Status" value={p?.status} />
        {p?.otherInformation && <ProfileField label="Other Information" value={p.otherInformation} />}
      </ProfileSection>

      {/* Medical Information */}
      <ProfileSection title="Medical Information">
        <ProfileField label="Medical Aid Society" value={p?.medicalAidSociety} />
        <ProfileField label="Medical Aid No." value={p?.medicalAidNo} />
        <ProfileField label="Family Doctor" value={p?.familyDoctorName} />
        <ProfileField label="Doctor Phone" value={p?.familyDoctorPhone} />
        <ProfileField label="Allergies" value={p?.allergies} />
      </ProfileSection>

      {/* Family Details */}
      {family && (
        <ProfileSection title="Family Details">
          <ProfileField label="Home Address" value={family.homeAddress} />
          <ProfileField label="Home Telephone" value={family.homeTelephone} />
          <ProfileField label="Home Language" value={family.homeLanguage} />
          <ProfileField label="Religion" value={family.religion} />
          <ProfileField label="Marital Status" value={family.maritalStatus} />
        </ProfileSection>
      )}

      {/* Guardians */}
      {guardians.length > 0 && guardians.map((g: any, i: number) => (
        <div key={i} style={{ background: 'white', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9', overflow: 'hidden', marginBottom: 16 }}>
          <div style={{ padding: '12px 20px', borderBottom: '1px solid #f1f5f9', background: '#f8fafc' }}>
            <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {g.guardianType ?? (i === 0 ? 'Father / Guardian' : 'Mother / Guardian')}
            </p>
          </div>
          <div style={{ padding: '20px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '18px 24px' }}>
            <ProfileField label="Full Name" value={`${g.title ?? ''} ${g.firstName ?? ''} ${g.surname ?? ''}`.trim()} />
            <ProfileField label="Phone" value={g.phone} />
            <ProfileField label="Email" value={g.email} />
            <ProfileField label="Occupation" value={g.occupation} />
            <ProfileField label="Address" value={g.address} />
          </div>
        </div>
      ))}

      {/* Emergency Contacts */}
      {contacts.length > 0 && (
        <div style={{ background: 'white', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9', overflow: 'hidden', marginBottom: 16 }}>
          <div style={{ padding: '12px 20px', borderBottom: '1px solid #f1f5f9', background: '#f8fafc' }}>
            <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Emergency Contacts</p>
          </div>
          <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
            {contacts.map((c: any, i: number) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px 24px', paddingBottom: i < contacts.length - 1 ? 16 : 0, borderBottom: i < contacts.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                <ProfileField label={`Contact ${i + 1} — Name`} value={c.name} />
                <ProfileField label="Phone" value={c.phone} />
                <ProfileField label="Relationship" value={c.relationship} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  // ── Shell ─────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', height: '100vh', background: '#f8fafc', overflow: 'hidden' }}>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', zIndex: 40 }} onClick={() => setSidebarOpen(false)} />
      )}

      {/* Desktop sidebar */}
      <div style={{ display: 'none' }} className="portal-sidebar-desktop">
        {Sidebar}
      </div>

      {/* Mobile sidebar (slide-in) */}
      <div style={{
        position: 'fixed', left: 0, top: 0, bottom: 0, zIndex: 50,
        transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform 0.25s ease',
        display: 'flex',
      }}>
        {Sidebar}
      </div>

      {/* Main */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Topbar (mobile) */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', background: '#1a237e', flexShrink: 0 }} className="portal-topbar">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'white', padding: 4, display: 'flex' }}
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <GraduationCap size={15} color="white" />
            <span style={{ color: 'white', fontWeight: 700, fontSize: 13 }}>LeeTec SMS</span>
          </div>
          <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: 'white' }}>
            {initials}
          </div>
        </div>

        {/* Scrollable content */}
        <div style={{ flex: 1, overflow: 'auto' }}>
          {view === 'dashboard' && DashboardView}
          {view === 'fees' && FeesView}
          {view === 'results' && <ComingSoon label="My Results" />}
          {view === 'announcements' && <ComingSoon label="Announcements" />}
          {view === 'profile' && ProfileView}
        </div>
      </div>

      <style>{`
        @media (min-width: 768px) {
          .portal-sidebar-desktop { display: flex !important; }
          .portal-topbar { display: none !important; }
          div[style*="position: fixed"][style*="left: 0"] { display: none !important; }
        }
      `}</style>
    </div>
  );
}
