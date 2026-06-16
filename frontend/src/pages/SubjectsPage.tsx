import { useState, useEffect } from 'react';
import { subjectsAPI } from '../services/api';
import { Plus, Trash2, Pencil, BookOpen, RefreshCw } from 'lucide-react';
import AdminLayout from '../components/AdminLayout';

type CampusTab = 'All' | 'AHJ Cambridge' | 'AHA ZIMSEC' | 'AHA Cambridge' | 'AHS ZIMSEC' | 'AHS Cambridge';

const TABS: { label: CampusTab; campus: string; curriculumType: string }[] = [
  { label: 'All',           campus: '',    curriculumType: 'All' },
  { label: 'AHJ Cambridge', campus: 'AHJ', curriculumType: 'Cambridge' },
  { label: 'AHA ZIMSEC',   campus: 'AHA', curriculumType: 'ZIMSEC' },
  { label: 'AHA Cambridge', campus: 'AHA', curriculumType: 'Cambridge' },
  { label: 'AHS ZIMSEC',   campus: 'AHS', curriculumType: 'ZIMSEC' },
  { label: 'AHS Cambridge', campus: 'AHS', curriculumType: 'Cambridge' },
];

const CAMPUS_LEVEL: Record<string, string> = {
  AHJ: 'Primary',
  AHA: 'O-Level',
  AHS: 'A-Level',
};

const blank = { schoolId: 1, name: '', code: '', campus: 'AHJ', curriculumType: 'Cambridge', level: 'Primary' };

export default function SubjectsPage() {
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<CampusTab>('All');
  const [seeding, setSeeding] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({ ...blank });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => { load(); }, [activeTab]);

  const showMsg = (text: string, type: 'success' | 'error') => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  };

  const currentTab = TABS.find(t => t.label === activeTab)!;

  const load = async () => {
    setLoading(true);
    try {
      const res = await subjectsAPI.getAll(1, currentTab.campus || undefined, currentTab.curriculumType !== 'All' ? currentTab.curriculumType : undefined);
      setSubjects(res.data || []);
    } catch { showMsg('Failed to load subjects', 'error'); }
    finally { setLoading(false); }
  };

  const handleSeed = async () => {
    if (activeTab === 'All') return;
    setSeeding(true);
    try {
      const res = await subjectsAPI.seed({ schoolId: 1, campus: currentTab.campus, curriculumType: currentTab.curriculumType });
      showMsg(res.data.message, 'success');
      load();
    } catch { showMsg('Seed failed', 'error'); }
    finally { setSeeding(false); }
  };

  const handleDelete = async (id: number) => {
    try {
      await subjectsAPI.delete(id);
      setSubjects(prev => prev.filter(s => s.id !== id));
      showMsg('Subject removed', 'success');
    } catch { showMsg('Delete failed', 'error'); }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.code.trim()) { showMsg('Name and code are required', 'error'); return; }
    setSaving(true);
    try {
      if (editingId) {
        await subjectsAPI.update(editingId, form);
        showMsg('Subject updated', 'success');
      } else {
        await subjectsAPI.create(form);
        showMsg('Subject added', 'success');
      }
      setIsAddOpen(false);
      setEditingId(null);
      setForm({ ...blank });
      load();
    } catch { showMsg(editingId ? 'Failed to update subject' : 'Failed to add subject', 'error'); }
    finally { setSaving(false); }
  };

  const handleEdit = (s: any) => {
    setEditingId(s.id);
    setForm({ schoolId: s.schoolId, name: s.name, code: s.code, campus: s.campus, curriculumType: s.curriculumType, level: s.level });
    setIsAddOpen(true);
  };

  const updateForm = (field: string, value: string) => {
    setForm(prev => {
      const next = { ...prev, [field]: value };
      if (field === 'campus') next.level = CAMPUS_LEVEL[value] || 'Primary';
      return next;
    });
  };

  const lbl: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4, display: 'block' };
  const fld: React.CSSProperties = { width: '100%', boxSizing: 'border-box' };

  return (
    <AdminLayout title="Subjects" subtitle="Manage subjects by campus and curriculum">
      {message && (
        <div style={{
          position: 'fixed', top: 80, right: 20, padding: '14px 18px', borderRadius: '10px',
          background: message.type === 'success' ? '#0ea5e9' : '#dc2626',
          color: 'white', fontSize: '13px', fontWeight: '500', zIndex: 9999,
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        }}>
          {message.text}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Tab bar */}
        <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {TABS.map(t => (
              <button key={t.label} onClick={() => setActiveTab(t.label)}
                style={{
                  padding: '6px 14px', borderRadius: '20px', fontSize: 12, fontWeight: 600, cursor: 'pointer', border: 'none',
                  background: activeTab === t.label ? '#1a237e' : '#f1f5f9',
                  color: activeTab === t.label ? 'white' : '#475569',
                }}>
                {t.label}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {activeTab !== 'All' && (
              <button className="btn btn-secondary" style={{ fontSize: 12 }} onClick={handleSeed} disabled={seeding}>
                <RefreshCw size={13} /> {seeding ? 'Seeding...' : `Seed ${activeTab}`}
              </button>
            )}
            <button className="btn btn-primary" style={{ fontSize: 12 }} onClick={() => setIsAddOpen(true)}>
              <Plus size={13} /> Add Subject
            </button>
          </div>
        </div>

        {/* Subject table */}
        <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <div style={{ padding: '12px 18px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ fontSize: 14, fontWeight: 700, margin: 0, color: '#0f172a' }}>
                {activeTab === 'All' ? 'All Subjects' : `${activeTab} Subjects`}
              </h3>
              <p style={{ fontSize: 12, color: '#64748b', margin: '2px 0 0' }}>{subjects.length} subject{subjects.length !== 1 ? 's' : ''}</p>
            </div>
            <BookOpen size={18} style={{ color: '#94a3b8' }} />
          </div>

          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#475569', fontSize: 13 }}>Loading...</div>
          ) : subjects.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#64748b', fontSize: 13 }}>
              No subjects found.{activeTab !== 'All' && <> Click <strong>Seed {activeTab}</strong> to load the official subject list.</>}
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Subject Name</th>
                    <th>Code</th>
                    <th>Campus</th>
                    <th>Level</th>
                    <th>Curriculum</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {subjects.map((s: any) => (
                    <tr key={s.id}>
                      <td style={{ fontWeight: 600, color: '#0f172a', fontSize: 13 }}>{s.name}</td>
                      <td style={{ fontSize: 12, fontFamily: 'ui-monospace, monospace', color: '#1a237e' }}>{s.code}</td>
                      <td>
                        <span className="pill" style={{ background: s.campus === 'AHJ' ? '#fef3c7' : s.campus === 'AHA' ? '#eef2ff' : '#f0fdf4', color: s.campus === 'AHJ' ? '#92400e' : s.campus === 'AHA' ? '#3730a3' : '#166534', fontSize: 11 }}>
                          {s.campus}
                        </span>
                      </td>
                      <td style={{ fontSize: 12, color: '#475569' }}>{s.level}</td>
                      <td>
                        <span className="pill" style={{ background: s.curriculumType === 'Cambridge' ? '#e0f2fe' : '#fef9c3', color: s.curriculumType === 'Cambridge' ? '#075985' : '#713f12', fontSize: 11 }}>
                          {s.curriculumType}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button className="btn btn-secondary" style={{ fontSize: 11, padding: '4px 10px', marginRight: 6 }}
                          onClick={() => handleEdit(s)}>
                          <Pencil size={12} />
                        </button>
                        <button className="btn btn-secondary" style={{ fontSize: 11, padding: '4px 10px', color: '#dc2626' }}
                          onClick={() => handleDelete(s.id)}>
                          <Trash2 size={12} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Add Subject modal */}
      {isAddOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
          <div style={{ background: 'white', borderRadius: '16px', width: '100%', maxWidth: 440, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ padding: '18px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>{editingId ? 'Edit Subject' : 'Add Subject'}</h2>
              <button onClick={() => { setIsAddOpen(false); setEditingId(null); setForm({ ...blank }); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#475569', fontSize: 20 }}>✕</button>
            </div>
            <form onSubmit={handleAdd} style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={lbl}>Subject Name *</label>
                <input className="text-field" style={fld} value={form.name} onChange={e => updateForm('name', e.target.value)} placeholder="e.g. Mathematics" required />
              </div>
              <div>
                <label style={lbl}>Subject Code *</label>
                <input className="text-field" style={fld} value={form.code} onChange={e => updateForm('code', e.target.value)} placeholder="e.g. 4004 or MAT" required />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={lbl}>Campus *</label>
                  <select className="text-field" style={{ ...fld, appearance: 'auto', cursor: 'pointer' }}
                    value={form.campus} onChange={e => updateForm('campus', e.target.value)}>
                    <option value="AHJ">AHJ</option>
                    <option value="AHA">AHA</option>
                    <option value="AHS">AHS</option>
                  </select>
                </div>
                <div>
                  <label style={lbl}>Curriculum *</label>
                  <select className="text-field" style={{ ...fld, appearance: 'auto', cursor: 'pointer' }}
                    value={form.curriculumType} onChange={e => updateForm('curriculumType', e.target.value)}>
                    <option value="Cambridge">Cambridge</option>
                    <option value="ZIMSEC">ZIMSEC</option>
                  </select>
                </div>
              </div>
              <div>
                <label style={lbl}>Level</label>
                <input className="text-field" style={{ ...fld, background: '#f8fafc', color: '#64748b' }}
                  value={form.level} readOnly title="Auto-filled based on campus" />
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 8, borderTop: '1px solid #e2e8f0' }}>
                <button type="button" className="btn btn-secondary" onClick={() => { setIsAddOpen(false); setEditingId(null); setForm({ ...blank }); }} disabled={saving}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : editingId ? 'Save Changes' : 'Add Subject'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
