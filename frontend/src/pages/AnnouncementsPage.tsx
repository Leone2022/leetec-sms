import { useState, useEffect } from 'react';
import { announcementsAPI } from '../services/api';
import AdminLayout from '../components/AdminLayout';
import { Bell, Trash2, Plus } from 'lucide-react';

interface Announcement {
  id: number;
  title: string;
  content: string;
  targetCampus: string;
  createdAt: string;
  isActive: boolean;
}

const CAMPUS_OPTIONS = ['All', 'AHJ', 'AHA', 'AHS'];

const campusBadge = (campus: string) => {
  if (campus === 'AHJ') return { bg: '#dbeafe', color: '#1d4ed8' };
  if (campus === 'AHA') return { bg: '#dcfce7', color: '#15803d' };
  if (campus === 'AHS') return { bg: '#fef9c3', color: '#854d0e' };
  return { bg: '#f1f5f9', color: '#475569' };
};

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', content: '', targetCampus: 'All' });
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showMsg = (text: string, type: 'success' | 'error') => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  };

  useEffect(() => { loadAnnouncements(); }, []);

  const loadAnnouncements = async () => {
    setLoading(true);
    try {
      const res = await announcementsAPI.getAll(1, undefined, true);
      setAnnouncements(res.data || []);
    } catch {
      showMsg('Failed to load announcements', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.content.trim()) return;
    setSubmitting(true);
    try {
      await announcementsAPI.create({ schoolId: 1, title: form.title, content: form.content, targetCampus: form.targetCampus });
      setForm({ title: '', content: '', targetCampus: 'All' });
      setShowForm(false);
      showMsg('Announcement posted', 'success');
      await loadAnnouncements();
    } catch {
      showMsg('Failed to post announcement', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeactivate = async (id: number) => {
    try {
      await announcementsAPI.delete(id);
      setAnnouncements(prev => prev.map(a => a.id === id ? { ...a, isActive: false } : a));
      showMsg('Announcement deactivated', 'success');
    } catch {
      showMsg('Failed to deactivate', 'error');
    }
  };

  const lbl: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4, display: 'block' };

  return (
    <AdminLayout title="Announcements" subtitle="Post and manage school-wide announcements for the student portal">
      {message && (
        <div style={{ position: 'fixed', top: 80, right: 20, padding: '14px 18px', borderRadius: 10, background: message.type === 'success' ? '#0ea5e9' : '#dc2626', color: 'white', fontSize: 13, fontWeight: 500, zIndex: 9999, boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
          {message.text}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Action bar */}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn btn-primary" style={{ fontSize: 13 }} onClick={() => setShowForm(v => !v)}>
            <Plus size={14} /> New Announcement
          </button>
        </div>

        {/* Create form */}
        {showForm && (
          <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e2e8f0', padding: '20px 24px' }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, margin: '0 0 16px', color: '#0f172a' }}>New Announcement</h3>
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 180px', gap: 12, marginBottom: 12 }}>
                <div>
                  <label style={lbl}>Title</label>
                  <input
                    className="text-field"
                    style={{ width: '100%' }}
                    value={form.title}
                    onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                    placeholder="Announcement title"
                    required
                  />
                </div>
                <div>
                  <label style={lbl}>Target Campus</label>
                  <select
                    className="text-field"
                    style={{ width: '100%', appearance: 'auto' }}
                    value={form.targetCampus}
                    onChange={e => setForm(f => ({ ...f, targetCampus: e.target.value }))}
                  >
                    {CAMPUS_OPTIONS.map(c => <option key={c} value={c}>{c === 'All' ? 'All Campuses' : c}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={lbl}>Content</label>
                <textarea
                  className="text-field"
                  style={{ width: '100%', height: 100, resize: 'vertical', padding: '10px 14px' }}
                  value={form.content}
                  onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                  placeholder="Write your announcement here..."
                  required
                />
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" style={{ fontSize: 13 }} onClick={() => setShowForm(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ fontSize: 13 }} disabled={submitting}>
                  {submitting ? 'Posting...' : 'Post Announcement'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Announcements list */}
        <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <div style={{ padding: '12px 18px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Bell size={15} style={{ color: '#94a3b8' }} />
            <h3 style={{ fontSize: 14, fontWeight: 700, margin: 0, color: '#0f172a' }}>
              All Announcements ({announcements.length})
            </h3>
          </div>

          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#64748b', fontSize: 13 }}>Loading...</div>
          ) : announcements.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#64748b', fontSize: 13 }}>
              No announcements yet. Create the first one above.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {announcements.map((a, i) => {
                const badge = campusBadge(a.targetCampus);
                return (
                  <div key={a.id} style={{ padding: '16px 20px', borderBottom: i < announcements.length - 1 ? '1px solid #f1f5f9' : 'none', display: 'flex', gap: 16, alignItems: 'flex-start', opacity: a.isActive ? 1 : 0.45 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 8, background: a.isActive ? '#eef2ff' : '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Bell size={16} color={a.isActive ? '#1a237e' : '#94a3b8'} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 700, fontSize: 14, color: '#0f172a' }}>{a.title}</span>
                        <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 12, fontWeight: 600, background: badge.bg, color: badge.color }}>
                          {a.targetCampus === 'All' ? 'All Campuses' : a.targetCampus}
                        </span>
                        {!a.isActive && (
                          <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 12, background: '#fee2e2', color: '#dc2626', fontWeight: 600 }}>
                            Deactivated
                          </span>
                        )}
                      </div>
                      <p style={{ fontSize: 13, color: '#475569', margin: '0 0 6px', lineHeight: 1.5 }}>{a.content}</p>
                      <p style={{ fontSize: 11, color: '#94a3b8', margin: 0 }}>
                        {new Date(a.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    {a.isActive && (
                      <button
                        onClick={() => handleDeactivate(a.id)}
                        title="Deactivate announcement"
                        style={{ background: 'none', border: '1px solid #e2e8f0', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', color: '#dc2626', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, flexShrink: 0 }}
                      >
                        <Trash2 size={13} /> Deactivate
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
