import { useState, useEffect } from 'react';
import { studentsAPI } from '../services/api';
import { Search, Users, X } from 'lucide-react';
import AdminLayout from '../components/AdminLayout';

const FORM_STYLES: Record<string, { bg: string; text: string }> = {
  'Form 1': { bg: '#eef2ff', text: '#4338ca' },
  'Form 2': { bg: '#eff6ff', text: '#1d4ed8' },
  'Form 3': { bg: '#f0fdf4', text: '#15803d' },
  'Form 4': { bg: '#fdf4ff', text: '#9333ea' },
  'Form 5': { bg: '#fff7ed', text: '#ea580c' },
  'Form 6': { bg: '#fff1f2', text: '#dc2626' },
};

export default function StudentsPage() {
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadStudents();
  }, []);

  const loadStudents = async () => {
    try {
      const res = await studentsAPI.getAll(1);
      setStudents(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = students.filter((s) =>
    `${s.firstName} ${s.surname} ${s.studentNumber}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  const formStyle = (form: string) => FORM_STYLES[form] ?? { bg: '#f1f5f9', text: '#475569' };

  return (
    <AdminLayout title="Students" subtitle={`${students.length} enrolled`}>
      <div className="toolbar">
        <div className="toolbar-search">
          <div className="field-wrap">
            <span className="field-icon field-icon-left">
              <Search size={15} />
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name or student number"
              className="text-field with-right"
            />
            {search && (
              <button className="field-icon field-icon-right" onClick={() => setSearch('')}>
                <X size={14} />
              </button>
            )}
          </div>
        </div>
        <div className="toolbar-meta">
          <Users size={13} style={{ verticalAlign: 'middle', marginRight: 6 }} />
          {filtered.length} student{filtered.length !== 1 ? 's' : ''}
        </div>
      </div>

      <div className="table-card">
        {loading ? (
          <div className="surface-card" style={{ border: 0, boxShadow: 'none', textAlign: 'center' }}>
            Loading students...
          </div>
        ) : filtered.length === 0 ? (
          <div className="surface-card" style={{ border: 0, boxShadow: 'none', textAlign: 'center' }}>
            {search ? 'No students match your search' : 'No students enrolled yet'}
          </div>
        ) : (
          <>
            <div className="data-table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Student No.</th>
                    <th>Form</th>
                    <th>Gender</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((s) => {
                    const fs = formStyle(s.form);
                    return (
                      <tr key={s.id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div className="mini-avatar">
                              {s.firstName?.[0]}
                              {s.surname?.[0]}
                            </div>
                            <div className="stack">
                              <strong style={{ fontSize: 13 }}>
                                {s.firstName} {s.surname}
                              </strong>
                            </div>
                          </div>
                        </td>
                        <td style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>
                          {s.studentNumber}
                        </td>
                        <td>
                          <span className="pill" style={{ background: fs.bg, color: fs.text }}>
                            {s.form}
                          </span>
                        </td>
                        <td>{s.gender}</td>
                        <td>
                          <span
                            className={`pill ${
                              s.status === 'Active' ? 'pill-success' : 'pill-danger'
                            }`}
                          >
                            {s.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="table-footer">
              {filtered.length} of {students.length} students
              {search ? ` - filtered by "${search}"` : ''}
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
}