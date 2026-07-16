import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { studentsAPI, feesAPI, versesAPI } from '../services/api';
import { Users, DollarSign, FileText, TrendingUp, ArrowUpRight, Send } from 'lucide-react';
import AdminLayout from '../components/AdminLayout';
import VerseCard, { type VerseData } from '../components/VerseCard';

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalBilled: 0,
    totalCollected: 0,
    totalOutstanding: 0,
  });
  const [activeTerm, setActiveTerm] = useState<any>(null);

  // ── Verse / Quote of the Day ────────────────────────────────────────────
  const blankVerseForm = () => ({
    type: 'Bible Verse',
    text: '',
    reference: '',
    definition: '',
    usageExample: '',
    partOfSpeech: 'Noun',
  });
  const [currentVerse, setCurrentVerse] = useState<VerseData | null>(null);
  const [verseForm, setVerseForm] = useState(blankVerseForm());
  const [postingVerse, setPostingVerse] = useState(false);
  const [verseMessage, setVerseMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const isWordForm = verseForm.type === 'Word';

  const loadVerse = () => {
    versesAPI.getCurrent(1).then((res) => setCurrentVerse(res.data || null)).catch(() => {});
  };

  useEffect(() => {
    loadVerse();
  }, []);

  const handlePostVerse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isWordForm) {
      if (!verseForm.text.trim() || !verseForm.definition.trim()) {
        setVerseMessage({ type: 'error', text: 'Please fill in the word and its definition.' });
        return;
      }
    } else if (!verseForm.text.trim() || !verseForm.reference.trim()) {
      setVerseMessage({ type: 'error', text: 'Please fill in both the verse/quote and the reference.' });
      return;
    }
    setPostingVerse(true);
    try {
      await versesAPI.create({
        schoolId: 1,
        type: verseForm.type,
        text: verseForm.text.trim(),
        reference: verseForm.reference.trim(),
        postedBy: isWordForm ? 'English Dept.' : `${user?.firstName ?? 'Admin'} ${user?.lastName ?? ''}`.trim(),
        ...(isWordForm && {
          definition: verseForm.definition.trim(),
          usageExample: verseForm.usageExample.trim(),
          partOfSpeech: verseForm.partOfSpeech,
        }),
      });
      setVerseMessage({ type: 'success', text: 'Posted to all portals.' });
      setVerseForm(blankVerseForm());
      loadVerse();
    } catch {
      setVerseMessage({ type: 'error', text: 'Failed to post. Please try again.' });
    } finally {
      setPostingVerse(false);
      setTimeout(() => setVerseMessage(null), 4000);
    }
  };

  const previewVerse: VerseData | null = verseForm.text.trim()
    ? {
        type: verseForm.type,
        text: verseForm.text,
        reference: verseForm.reference || 'Reference',
        postedBy: isWordForm ? 'English Dept.' : `${user?.firstName ?? 'Admin'} ${user?.lastName ?? ''}`.trim(),
        definition: verseForm.definition,
        usageExample: verseForm.usageExample,
        partOfSpeech: verseForm.partOfSpeech,
      }
    : null;

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const [studentsRes, feesRes, termsRes] = await Promise.all([
        studentsAPI.getAll(1),
        feesAPI.getTermInvoices(1, 1),
        feesAPI.getTerms(1),
      ]);
      setStats({
        totalStudents: studentsRes.data.length,
        totalBilled: feesRes.data.summary?.totalBilled || 0,
        totalCollected: feesRes.data.summary?.totalCollected || 0,
        totalOutstanding: feesRes.data.summary?.totalOutstanding || 0,
      });
      const active = (termsRes.data as any[]).find((t) => t.isActive) ?? null;
      setActiveTerm(active);
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
            Real-time visibility into student records, billing flow, and cash collection for{' '}
            {activeTerm ? activeTerm.name : 'the current term'}.
          </p>
        </section>

        {currentVerse && <VerseCard verse={currentVerse} />}

        <section
          style={{
            background: 'white',
            borderRadius: 16,
            padding: '20px 24px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          }}
        >
          <h3 style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 700, color: '#0f172a' }}>
            Post a Verse, Quote, or Word of the Day
          </h3>
          <p style={{ margin: '0 0 16px', fontSize: 12.5, color: '#64748b' }}>
            This will be shown to Admins, Teachers, and Students across all portals.
          </p>

          <form onSubmit={handlePostVerse}>
            <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
              {(['Bible Verse', 'Quote of the Day', 'Word'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setVerseForm((f) => ({ ...f, type: t }))}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: 8,
                    fontSize: 12.5,
                    fontWeight: 700,
                    cursor: 'pointer',
                    border: verseForm.type === t ? '1.5px solid #1a237e' : '1.5px solid #e2e8f0',
                    background: verseForm.type === t ? '#eef2ff' : 'white',
                    color: verseForm.type === t ? '#1a237e' : '#64748b',
                  }}
                >
                  {t === 'Bible Verse' ? '📖 Bible Verse' : t === 'Quote of the Day' ? '💬 Quote of the Day' : '📚 Word of the Day'}
                </button>
              ))}
            </div>

            {isWordForm ? (
              <>
                <input
                  className="text-field"
                  type="text"
                  placeholder="Word"
                  value={verseForm.text}
                  onChange={(e) => setVerseForm((f) => ({ ...f, text: e.target.value }))}
                  style={{ width: '100%', marginBottom: 12 }}
                />

                <textarea
                  className="text-field"
                  placeholder="Definition"
                  value={verseForm.definition}
                  onChange={(e) => setVerseForm((f) => ({ ...f, definition: e.target.value }))}
                  rows={3}
                  style={{ width: '100%', resize: 'vertical', marginBottom: 12, fontFamily: 'inherit' }}
                />

                <input
                  className="text-field"
                  type="text"
                  placeholder="Usage example, e.g. She showed great resilience after the setback."
                  value={verseForm.usageExample}
                  onChange={(e) => setVerseForm((f) => ({ ...f, usageExample: e.target.value }))}
                  style={{ width: '100%', marginBottom: 12 }}
                />

                <select
                  className="text-field"
                  value={verseForm.partOfSpeech}
                  onChange={(e) => setVerseForm((f) => ({ ...f, partOfSpeech: e.target.value }))}
                  style={{ width: '100%', marginBottom: 16, appearance: 'auto' }}
                >
                  {['Noun', 'Verb', 'Adjective', 'Adverb', 'Other'].map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </>
            ) : (
              <>
                <textarea
                  className="text-field"
                  placeholder="Enter Bible verse or inspirational quote..."
                  value={verseForm.text}
                  onChange={(e) => setVerseForm((f) => ({ ...f, text: e.target.value }))}
                  rows={4}
                  style={{ width: '100%', resize: 'vertical', marginBottom: 12, fontFamily: 'inherit' }}
                />

                <input
                  className="text-field"
                  type="text"
                  placeholder="e.g. John 3:16 or — Author Name"
                  value={verseForm.reference}
                  onChange={(e) => setVerseForm((f) => ({ ...f, reference: e.target.value }))}
                  style={{ width: '100%', marginBottom: 16 }}
                />
              </>
            )}

            {previewVerse && (
              <div style={{ marginBottom: 16 }}>
                <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 700, color: '#94a3b8', letterSpacing: 0.4 }}>
                  PREVIEW
                </p>
                <VerseCard verse={previewVerse} />
              </div>
            )}

            {verseMessage && (
              <div
                style={{
                  marginBottom: 14,
                  padding: '10px 14px',
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 600,
                  background: verseMessage.type === 'success' ? '#f0fdf4' : '#fef2f2',
                  color: verseMessage.type === 'success' ? '#15803d' : '#dc2626',
                }}
              >
                {verseMessage.text}
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary"
              disabled={postingVerse}
              style={{
                background: 'linear-gradient(135deg, #1a237e, #3949ab)',
                border: 'none',
              }}
            >
              <Send size={14} /> {postingVerse ? 'Posting...' : '📤 Post to All Portals'}
            </button>
          </form>
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