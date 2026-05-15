import { useState, useEffect } from 'react';
import { studentsAPI, feesAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Search, Users, X, FileDown, FileSpreadsheet, FileText, Plus, ChevronRight, ChevronLeft, Lock, Unlock } from 'lucide-react';
import AdminLayout from '../components/AdminLayout';
import { exportTableToExcel, exportTableToPdf, exportTableToWord } from '../utils/exportTable';

const FORM_STYLES: Record<string, { bg: string; text: string }> = {
  'Form 1': { bg: '#eef2ff', text: '#4338ca' },
  'Form 2': { bg: '#eff6ff', text: '#1d4ed8' },
  'Form 3': { bg: '#f0fdf4', text: '#15803d' },
  'Form 4': { bg: '#fdf4ff', text: '#9333ea' },
  'Form 5': { bg: '#fff7ed', text: '#ea580c' },
  'Form 6': { bg: '#fff1f2', text: '#dc2626' },
};

const todayISO = () => new Date().toISOString().split('T')[0];

const WIZARD_STEPS = [
  'Personal Details',
  'School & Medical',
  'Family Details',
  'Guardians',
  'Emergency Contacts',
];

const blankStep1 = () => ({
  firstName: '', surname: '', dateOfBirth: '', gender: 'Male',
  race: '', birthCertificateNo: '', email: '',
});
const blankStep2 = () => ({
  form: 'Form 1', dateOfEntry: todayISO(), previousSchool: '',
  medicalAidSociety: '', medicalAidNo: '', familyDoctorName: '',
  familyDoctorPhone: '', allergies: '', denomination: '', otherInformation: '',
});
const blankStep3 = () => ({ homeAddress: '', homePhone: '', homeLanguage: '', religion: '' });
const blankGuardian = (title: string) => ({
  title, firstName: '', surname: '', phone: '', email: '', occupation: '', address: '',
});
const blankContact = () => ({ name: '', phone: '', relationship: '' });

export default function StudentsPage() {
  const { user } = useAuth();
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [step1, setStep1] = useState(blankStep1());
  const [step2, setStep2] = useState(blankStep2());
  const [step3, setStep3] = useState(blankStep3());
  const [father, setFather] = useState(blankGuardian('Mr'));
  const [mother, setMother] = useState(blankGuardian('Mrs'));
  const [contact1, setContact1] = useState(blankContact());
  const [contact2, setContact2] = useState(blankContact());

  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [profileStudent, setProfileStudent] = useState<any>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileTab, setProfileTab] = useState('personal');
  const [studentInvoices, setStudentInvoices] = useState<any[]>([]);

  useEffect(() => { loadStudents(); }, []);

  const loadStudents = async () => {
    try {
      const res = await studentsAPI.getAll(1);
      setStudents(res.data);
    } catch (err) {
      console.error(err);
      showMessage('Failed to load students', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (text: string, type: 'success' | 'error') => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  const openWizard = () => {
    setStep1(blankStep1());
    setStep2(blankStep2());
    setStep3(blankStep3());
    setFather(blankGuardian('Mr'));
    setMother(blankGuardian('Mrs'));
    setContact1(blankContact());
    setContact2(blankContact());
    setWizardStep(1);
    setIsWizardOpen(true);
  };

  const closeWizard = () => {
    setIsWizardOpen(false);
    setWizardStep(1);
  };

  const handleFinalSubmit = async () => {
    setIsSubmitting(true);
    try {
      // Build payload matching EnrolStudentDTO exactly
      const payload = {
        schoolId: 1,
        firstName: step1.firstName.trim(),
        surname: step1.surname.trim(),
        email: step1.email.trim(),
        dateOfBirth: step1.dateOfBirth,       // already YYYY-MM-DD from date input
        birthCertificateNo: step1.birthCertificateNo.trim(),
        gender: step1.gender,
        form: step2.form,
        dateOfEntry: step2.dateOfEntry,        // already YYYY-MM-DD from date input
        race: step1.race.trim(),
        previousSchool: step2.previousSchool.trim(),
        otherInformation: step2.otherInformation.trim(),
        familyDoctorName: step2.familyDoctorName.trim(),
        familyDoctorPhone: step2.familyDoctorPhone.trim(),
        medicalAidSociety: step2.medicalAidSociety.trim(),
        medicalAidNo: step2.medicalAidNo.trim(),
        allergies: step2.allergies.trim(),
        denomination: step2.denomination.trim(),
      };

      console.log('Enrol payload:', JSON.stringify(payload, null, 2));

      const enrolRes = await studentsAPI.enrol(payload);

      console.log('Enrol response:', enrolRes.data);

      const studentId = enrolRes.data?.id ?? enrolRes.data?.studentId ?? enrolRes.data?.data?.id;
      const studentNumber = enrolRes.data?.studentNumber ?? enrolRes.data?.data?.studentNumber ?? '';
      const temporaryPassword = enrolRes.data?.temporaryPassword ?? enrolRes.data?.data?.temporaryPassword ?? '';

      // Family
      if (step3.homeAddress || step3.homePhone) {
        await studentsAPI.addFamily(studentId, step3);
      }

      // Guardians
      if (father.firstName) {
        await studentsAPI.addGuardian(studentId, { ...father, guardianType: 'Father' });
      }
      if (mother.firstName) {
        await studentsAPI.addGuardian(studentId, { ...mother, guardianType: 'Mother' });
      }

      // Emergency contacts
      if (contact1.name) await studentsAPI.addEmergencyContact(studentId, contact1);
      if (contact2.name) await studentsAPI.addEmergencyContact(studentId, contact2);

      showMessage(
        `Student enrolled! Number: ${studentNumber} — Email: ${step1.email} — Temp Password: ${temporaryPassword}`,
        'success'
      );
      closeWizard();
      loadStudents();
    } catch (err: any) {
      console.error('Enrol error — status:', err.response?.status);
      console.error('Enrol error — data:', err.response?.data);
      const msg =
        err.response?.data?.message ??
        err.response?.data?.title ??
        (typeof err.response?.data === 'string' ? err.response.data : null) ??
        `Server error ${err.response?.status ?? ''}`.trim();
      showMessage(msg || 'Failed to enrol student', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openProfilePanel = async (student: any) => {
    setSelectedStudent(student);
    setProfileStudent(null);
    setStudentInvoices([]);
    setProfileTab('personal');
    setIsProfileOpen(true);
    setProfileLoading(true);
    try {
      const [detailRes, invoicesRes] = await Promise.all([
        studentsAPI.getById(student.id),
        feesAPI.getStudentInvoices(student.id),
      ]);
      setProfileStudent(detailRes.data);
      setStudentInvoices(invoicesRes.data || []);
    } catch (err) {
      console.error('Failed to load student details:', err);
    } finally {
      setProfileLoading(false);
    }
  };

  const closeProfilePanel = () => {
    setIsProfileOpen(false);
    setSelectedStudent(null);
    setProfileStudent(null);
    setStudentInvoices([]);
    setProfileTab('personal');
  };

  const handleToggleStatus = async () => {
    if (!selectedStudent) return;
    const newStatus = selectedStudent.status === 'Active' ? 'Inactive' : 'Active';
    try {
      await studentsAPI.updateStatus(selectedStudent.id, newStatus);
      showMessage(`Student ${newStatus.toLowerCase()} successfully`, 'success');
      setSelectedStudent((prev: any) => ({ ...prev, status: newStatus }));
      setStudents((prev) =>
        prev.map((s) => (s.id === selectedStudent.id ? { ...s, status: newStatus } : s))
      );
    } catch (err: any) {
      showMessage(err.response?.data?.message || 'Failed to update status', 'error');
    }
  };

  const filtered = students.filter((s) =>
    `${s.firstName} ${s.surname} ${s.studentNumber}`.toLowerCase().includes(search.toLowerCase())
  );

  const formStyle = (form: string) => FORM_STYLES[form] ?? { bg: '#f1f5f9', text: '#475569' };

  const exportRows = filtered.map((s) => ({
    name: `${s.firstName ?? ''} ${s.surname ?? ''}`.trim(),
    number: s.studentNumber ?? '',
    form: s.form ?? '',
    gender: s.gender ?? '',
    status: s.status ?? '',
  }));
  const exportColumns = [
    { header: 'Student Name', value: (r: typeof exportRows[number]) => r.name },
    { header: 'Student Number', value: (r: typeof exportRows[number]) => r.number },
    { header: 'Form', value: (r: typeof exportRows[number]) => r.form },
    { header: 'Gender', value: (r: typeof exportRows[number]) => r.gender },
    { header: 'Status', value: (r: typeof exportRows[number]) => r.status },
  ];

  const fieldStyle = { paddingLeft: '14px', paddingRight: '14px' };
  const labelStyle: React.CSSProperties = { fontSize: '12px', fontWeight: '600', color: '#0f172a', display: 'block', marginBottom: '6px' };
  const sectionHeadStyle: React.CSSProperties = { fontSize: '12px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' };
  const gridTwo: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' };
  const gridThree: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' };

  const inp = (
    val: string,
    onChange: (v: string) => void,
    opts?: { type?: string; placeholder?: string; required?: boolean }
  ) => (
    <input
      type={opts?.type ?? 'text'}
      value={val}
      onChange={(e) => onChange(e.target.value)}
      placeholder={opts?.placeholder}
      required={opts?.required}
      className="text-field"
      style={fieldStyle}
    />
  );

  const sel = (val: string, onChange: (v: string) => void, options: string[]) => (
    <select
      value={val}
      onChange={(e) => onChange(e.target.value)}
      className="text-field"
      style={{ ...fieldStyle, appearance: 'auto', cursor: 'pointer' }}
    >
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  );

  return (
    <AdminLayout title="Students" subtitle={`${students.length} enrolled`}>
      {message && (
        <div style={{
          position: 'fixed', top: 80, right: 20, padding: '14px 18px',
          borderRadius: '10px', background: message.type === 'success' ? '#0ea5e9' : '#dc2626',
          color: 'white', fontSize: '13px', fontWeight: '500', zIndex: 9999,
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)', maxWidth: '420px',
        }}>
          {message.text}
        </div>
      )}

      <div className="toolbar">
        <div className="toolbar-search">
          <div className="field-wrap">
            <span className="field-icon field-icon-left"><Search size={15} /></span>
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name or student number" className="text-field with-right" />
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
        <div className="toolbar-actions" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button className="btn btn-primary" onClick={openWizard} style={{ fontSize: '13px' }}>
            <Plus size={14} /> Enrol Student
          </button>
          <button className="btn btn-secondary export-btn" onClick={() => exportTableToPdf({ title: 'Students', filename: 'students.pdf', columns: exportColumns, rows: exportRows })} disabled={!filtered.length}><FileDown size={14} /> PDF</button>
          <button className="btn btn-secondary export-btn" onClick={() => exportTableToExcel({ sheetName: 'Students', filename: 'students.xlsx', columns: exportColumns, rows: exportRows })} disabled={!filtered.length}><FileSpreadsheet size={14} /> Excel</button>
          <button className="btn btn-secondary export-btn" onClick={() => exportTableToWord({ title: 'Students', filename: 'students.docx', columns: exportColumns, rows: exportRows })} disabled={!filtered.length}><FileText size={14} /> Word</button>
        </div>
      </div>

      <div className="table-card">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#475569' }}>Loading students...</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#475569' }}>
            {search ? 'No students match your search' : 'No students enrolled yet'}
          </div>
        ) : (
          <>
            <div className="data-table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Student</th><th>Student No.</th><th>Form</th><th>Gender</th><th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((s) => {
                    const fs = formStyle(s.form);
                    return (
                      <tr key={s.id} style={{ cursor: 'pointer' }} onClick={() => openProfilePanel(s)}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div className="mini-avatar">{s.firstName?.[0]}{s.surname?.[0]}</div>
                            <strong style={{ fontSize: 13 }}>{s.firstName} {s.surname}</strong>
                          </div>
                        </td>
                        <td style={{ fontFamily: 'ui-monospace, monospace' }}>{s.studentNumber}</td>
                        <td><span className="pill" style={{ background: fs.bg, color: fs.text }}>{s.form}</span></td>
                        <td>{s.gender}</td>
                        <td>
                          <span className={`pill ${s.status === 'Active' ? 'pill-success' : 'pill-danger'}`}>
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
              {filtered.length} of {students.length} students{search ? ` — filtered by "${search}"` : ''}
            </div>
          </>
        )}
      </div>

      {/* ─── ENROL WIZARD ─── */}
      {isWizardOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}
          onClick={undefined}>
          <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 20px 60px rgba(0,0,0,0.15)', width: '100%', maxWidth: '640px', maxHeight: '92vh', overflow: 'auto' }}
            onClick={(e) => e.stopPropagation()}>

            {/* Header */}
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', position: 'sticky', top: 0, background: 'white', zIndex: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h2 style={{ fontSize: '17px', fontWeight: '700', margin: 0 }}>Enrol New Student</h2>
                  <p style={{ fontSize: '12px', color: '#475569', margin: '4px 0 0 0' }}>
                    Step {wizardStep} of {WIZARD_STEPS.length} — {WIZARD_STEPS[wizardStep - 1]}
                  </p>
                </div>
                <button onClick={closeWizard} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#475569' }}>
                  <X size={20} />
                </button>
              </div>
              {/* Progress bar */}
              <div style={{ marginTop: '12px', display: 'flex', gap: '4px' }}>
                {WIZARD_STEPS.map((_, i) => (
                  <div key={i} style={{ flex: 1, height: '3px', borderRadius: '2px', background: i < wizardStep ? '#0ea5e9' : '#e2e8f0' }} />
                ))}
              </div>
            </div>

            <div style={{ padding: '24px' }}>

              {/* ─ Step 1: Personal Details ─ */}
              {wizardStep === 1 && (
                <>
                  <h3 style={sectionHeadStyle}>Personal Details</h3>
                  <div style={gridTwo}>
                    <div>
                      <label style={labelStyle}>First Name *</label>
                      {inp(step1.firstName, (v) => setStep1({ ...step1, firstName: v }), { required: true, placeholder: 'John' })}
                    </div>
                    <div>
                      <label style={labelStyle}>Surname *</label>
                      {inp(step1.surname, (v) => setStep1({ ...step1, surname: v }), { required: true, placeholder: 'Doe' })}
                    </div>
                    <div>
                      <label style={labelStyle}>Date of Birth *</label>
                      {inp(step1.dateOfBirth, (v) => setStep1({ ...step1, dateOfBirth: v }), { type: 'date', required: true })}
                    </div>
                    <div>
                      <label style={labelStyle}>Gender</label>
                      {sel(step1.gender, (v) => setStep1({ ...step1, gender: v }), ['Male', 'Female'])}
                    </div>
                    <div>
                      <label style={labelStyle}>Race</label>
                      {inp(step1.race, (v) => setStep1({ ...step1, race: v }), { placeholder: 'e.g. African, Coloured' })}
                    </div>
                    <div>
                      <label style={labelStyle}>Birth Certificate No.</label>
                      {inp(step1.birthCertificateNo, (v) => setStep1({ ...step1, birthCertificateNo: v }), { placeholder: 'BC123456' })}
                    </div>
                    <div>
                      <label style={labelStyle}>Student Email *</label>
                      {inp(step1.email, (v) => setStep1({ ...step1, email: v }), { type: 'email', required: true, placeholder: 'student@email.com' })}
                    </div>
                  </div>
                </>
              )}

              {/* ─ Step 2: School & Medical ─ */}
              {wizardStep === 2 && (
                <>
                  <h3 style={sectionHeadStyle}>School Information</h3>
                  <div style={{ ...gridThree, marginBottom: '20px' }}>
                    <div>
                      <label style={labelStyle}>Form</label>
                      {sel(step2.form, (v) => setStep2({ ...step2, form: v }), ['Form 1', 'Form 2', 'Form 3', 'Form 4', 'Form 5', 'Form 6'])}
                    </div>
                    <div>
                      <label style={labelStyle}>Date of Entry</label>
                      {inp(step2.dateOfEntry, (v) => setStep2({ ...step2, dateOfEntry: v }), { type: 'date' })}
                    </div>
                    <div>
                      <label style={labelStyle}>Previous School</label>
                      {inp(step2.previousSchool, (v) => setStep2({ ...step2, previousSchool: v }), { placeholder: 'Primary school name' })}
                    </div>
                  </div>
                  <h3 style={sectionHeadStyle}>Medical Information</h3>
                  <div style={{ ...gridTwo, marginBottom: '20px' }}>
                    <div>
                      <label style={labelStyle}>Medical Aid Society</label>
                      {inp(step2.medicalAidSociety, (v) => setStep2({ ...step2, medicalAidSociety: v }), { placeholder: 'e.g. CIMAS, Medicore' })}
                    </div>
                    <div>
                      <label style={labelStyle}>Medical Aid No.</label>
                      {inp(step2.medicalAidNo, (v) => setStep2({ ...step2, medicalAidNo: v }), { placeholder: 'MA123456' })}
                    </div>
                    <div>
                      <label style={labelStyle}>Family Doctor</label>
                      {inp(step2.familyDoctorName, (v) => setStep2({ ...step2, familyDoctorName: v }), { placeholder: 'Dr. Name' })}
                    </div>
                    <div>
                      <label style={labelStyle}>Doctor Phone</label>
                      {inp(step2.familyDoctorPhone, (v) => setStep2({ ...step2, familyDoctorPhone: v }), { placeholder: '+263...' })}
                    </div>
                    <div>
                      <label style={labelStyle}>Allergies</label>
                      {inp(step2.allergies, (v) => setStep2({ ...step2, allergies: v }), { placeholder: 'e.g. Peanuts, Penicillin' })}
                    </div>
                    <div>
                      <label style={labelStyle}>Denomination</label>
                      {inp(step2.denomination, (v) => setStep2({ ...step2, denomination: v }), { placeholder: 'e.g. Christian, Muslim' })}
                    </div>
                    <div style={{ gridColumn: '1/-1' }}>
                      <label style={labelStyle}>Other Information</label>
                      {inp(step2.otherInformation, (v) => setStep2({ ...step2, otherInformation: v }), { placeholder: 'Any additional notes' })}
                    </div>
                  </div>
                </>
              )}

              {/* ─ Step 3: Family Details ─ */}
              {wizardStep === 3 && (
                <>
                  <h3 style={sectionHeadStyle}>Family Details</h3>
                  <div style={gridTwo}>
                    <div style={{ gridColumn: '1/-1' }}>
                      <label style={labelStyle}>Home Address</label>
                      {inp(step3.homeAddress, (v) => setStep3({ ...step3, homeAddress: v }), { placeholder: '123 Main Street, Harare' })}
                    </div>
                    <div>
                      <label style={labelStyle}>Home Phone</label>
                      {inp(step3.homePhone, (v) => setStep3({ ...step3, homePhone: v }), { placeholder: '+263 4 123456' })}
                    </div>
                    <div>
                      <label style={labelStyle}>Home Language</label>
                      {inp(step3.homeLanguage, (v) => setStep3({ ...step3, homeLanguage: v }), { placeholder: 'e.g. English, Shona' })}
                    </div>
                    <div>
                      <label style={labelStyle}>Religion</label>
                      {inp(step3.religion, (v) => setStep3({ ...step3, religion: v }), { placeholder: 'e.g. Christian' })}
                    </div>
                  </div>
                </>
              )}

              {/* ─ Step 4: Guardians ─ */}
              {wizardStep === 4 && (
                <>
                  <h3 style={sectionHeadStyle}>Father / Guardian</h3>
                  <div style={{ ...gridTwo, marginBottom: '20px' }}>
                    <div>
                      <label style={labelStyle}>Title</label>
                      {sel(father.title, (v) => setFather({ ...father, title: v }), ['Mr', 'Dr', 'Prof', 'Rev'])}
                    </div>
                    <div>
                      <label style={labelStyle}>First Name</label>
                      {inp(father.firstName, (v) => setFather({ ...father, firstName: v }), { placeholder: 'John' })}
                    </div>
                    <div>
                      <label style={labelStyle}>Surname</label>
                      {inp(father.surname, (v) => setFather({ ...father, surname: v }), { placeholder: 'Doe' })}
                    </div>
                    <div>
                      <label style={labelStyle}>Phone</label>
                      {inp(father.phone, (v) => setFather({ ...father, phone: v }), { placeholder: '+263 77 123 4567' })}
                    </div>
                    <div>
                      <label style={labelStyle}>Email</label>
                      {inp(father.email, (v) => setFather({ ...father, email: v }), { type: 'email', placeholder: 'john@example.com' })}
                    </div>
                    <div>
                      <label style={labelStyle}>Occupation</label>
                      {inp(father.occupation, (v) => setFather({ ...father, occupation: v }), { placeholder: 'e.g. Engineer' })}
                    </div>
                    <div style={{ gridColumn: '1/-1' }}>
                      <label style={labelStyle}>Address (if different)</label>
                      {inp(father.address, (v) => setFather({ ...father, address: v }), { placeholder: 'Work or postal address' })}
                    </div>
                  </div>

                  <h3 style={sectionHeadStyle}>Mother / Guardian</h3>
                  <div style={gridTwo}>
                    <div>
                      <label style={labelStyle}>Title</label>
                      {sel(mother.title, (v) => setMother({ ...mother, title: v }), ['Mrs', 'Ms', 'Dr', 'Prof'])}
                    </div>
                    <div>
                      <label style={labelStyle}>First Name</label>
                      {inp(mother.firstName, (v) => setMother({ ...mother, firstName: v }), { placeholder: 'Jane' })}
                    </div>
                    <div>
                      <label style={labelStyle}>Surname</label>
                      {inp(mother.surname, (v) => setMother({ ...mother, surname: v }), { placeholder: 'Doe' })}
                    </div>
                    <div>
                      <label style={labelStyle}>Phone</label>
                      {inp(mother.phone, (v) => setMother({ ...mother, phone: v }), { placeholder: '+263 77 123 4567' })}
                    </div>
                    <div>
                      <label style={labelStyle}>Email</label>
                      {inp(mother.email, (v) => setMother({ ...mother, email: v }), { type: 'email', placeholder: 'jane@example.com' })}
                    </div>
                    <div>
                      <label style={labelStyle}>Occupation</label>
                      {inp(mother.occupation, (v) => setMother({ ...mother, occupation: v }), { placeholder: 'e.g. Teacher' })}
                    </div>
                    <div style={{ gridColumn: '1/-1' }}>
                      <label style={labelStyle}>Address (if different)</label>
                      {inp(mother.address, (v) => setMother({ ...mother, address: v }), { placeholder: 'Work or postal address' })}
                    </div>
                  </div>
                </>
              )}

              {/* ─ Step 5: Emergency Contacts ─ */}
              {wizardStep === 5 && (
                <>
                  <h3 style={sectionHeadStyle}>Emergency Contact 1</h3>
                  <div style={{ ...gridThree, marginBottom: '20px' }}>
                    <div>
                      <label style={labelStyle}>Full Name</label>
                      {inp(contact1.name, (v) => setContact1({ ...contact1, name: v }), { placeholder: 'Jane Doe' })}
                    </div>
                    <div>
                      <label style={labelStyle}>Phone</label>
                      {inp(contact1.phone, (v) => setContact1({ ...contact1, phone: v }), { placeholder: '+263...' })}
                    </div>
                    <div>
                      <label style={labelStyle}>Relationship</label>
                      {inp(contact1.relationship, (v) => setContact1({ ...contact1, relationship: v }), { placeholder: 'e.g. Aunt' })}
                    </div>
                  </div>
                  <h3 style={sectionHeadStyle}>Emergency Contact 2</h3>
                  <div style={gridThree}>
                    <div>
                      <label style={labelStyle}>Full Name</label>
                      {inp(contact2.name, (v) => setContact2({ ...contact2, name: v }), { placeholder: 'John Smith' })}
                    </div>
                    <div>
                      <label style={labelStyle}>Phone</label>
                      {inp(contact2.phone, (v) => setContact2({ ...contact2, phone: v }), { placeholder: '+263...' })}
                    </div>
                    <div>
                      <label style={labelStyle}>Relationship</label>
                      {inp(contact2.relationship, (v) => setContact2({ ...contact2, relationship: v }), { placeholder: 'e.g. Uncle' })}
                    </div>
                  </div>
                </>
              )}

            </div>

            {/* Footer nav */}
            <div style={{ padding: '16px 24px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', position: 'sticky', bottom: 0, background: 'white' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => wizardStep === 1 ? closeWizard() : setWizardStep((s) => s - 1)}
              >
                <ChevronLeft size={14} />
                {wizardStep === 1 ? 'Cancel' : 'Back'}
              </button>
              {wizardStep < WIZARD_STEPS.length ? (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    if (wizardStep === 1 && (!step1.firstName.trim() || !step1.surname.trim() || !step1.dateOfBirth || !step1.email.trim())) {
                      showMessage('First name, surname, date of birth and email are required', 'error');
                      return;
                    }
                    setWizardStep((s) => s + 1);
                  }}
                >
                  Next <ChevronRight size={14} />
                </button>
              ) : (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleFinalSubmit}
                  disabled={isSubmitting}
                  style={{ opacity: isSubmitting ? 0.7 : 1 }}
                >
                  {isSubmitting ? 'Enrolling...' : 'Enrol Student'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── PROFILE PANEL ─── */}
      {isProfileOpen && selectedStudent && (() => {
        const s = profileStudent || selectedStudent;
        const TABS = ['Personal', 'Medical', 'Family', 'Guardians', 'Emergency', 'Invoices'];
        const tabBtn = (label: string) => (
          <button
            key={label}
            onClick={() => setProfileTab(label.toLowerCase())}
            style={{
              padding: '7px 14px', fontSize: '12px', fontWeight: profileTab === label.toLowerCase() ? '700' : '500',
              background: profileTab === label.toLowerCase() ? '#0ea5e9' : 'transparent',
              color: profileTab === label.toLowerCase() ? 'white' : '#475569',
              border: 'none', borderRadius: '6px', cursor: 'pointer', whiteSpace: 'nowrap',
            }}
          >
            {label}
          </button>
        );
        const field = (label: string, value: string | undefined | null) => (
          <div key={label}>
            <p style={{ color: '#64748b', fontSize: '11px', margin: 0, marginBottom: 2, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</p>
            <p style={{ fontWeight: '600', color: '#0f172a', margin: 0, fontSize: '13px' }}>{value || '—'}</p>
          </div>
        );
        const grid2: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' };
        const grid3: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' };
        const guardians: any[] = s.guardians ?? (s.father || s.mother ? [s.father, s.mother].filter(Boolean) : []);
        const contacts: any[] = s.emergencyContacts ?? s.emergencyContact ?? [];
        const family: any = s.family ?? s.familyDetails ?? null;
        return (
          <>
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', zIndex: 999 }} onClick={closeProfilePanel} />
            <div style={{ position: 'fixed', right: 0, top: 0, bottom: 0, width: '100%', maxWidth: '700px', background: 'white', boxShadow: '-4px 0 24px rgba(0,0,0,0.12)', zIndex: 1000, display: 'flex', flexDirection: 'column' }}>

              {/* Header */}
              <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexShrink: 0 }}>
                <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
                  <div className="mini-avatar" style={{ width: '52px', height: '52px', fontSize: '20px', flexShrink: 0 }}>
                    {selectedStudent.firstName?.[0]}{selectedStudent.surname?.[0]}
                  </div>
                  <div>
                    <h2 style={{ fontSize: '17px', fontWeight: '700', margin: '0 0 3px 0' }}>
                      {selectedStudent.firstName} {selectedStudent.surname}
                    </h2>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <p style={{ fontSize: '12px', color: '#475569', margin: 0 }}>
                        <span style={{ fontFamily: 'ui-monospace, monospace' }}>{selectedStudent.studentNumber}</span>
                        {' · '}{selectedStudent.form}
                      </p>
                      <span className={`pill ${selectedStudent.status === 'Active' ? 'pill-success' : 'pill-danger'}`} style={{ fontSize: '11px' }}>
                        {selectedStudent.status}
                      </span>
                    </div>
                  </div>
                </div>
                <button onClick={closeProfilePanel} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#475569', padding: '4px' }}>
                  <X size={20} />
                </button>
              </div>

              {/* Tabs */}
              <div style={{ padding: '10px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', gap: '4px', overflowX: 'auto', flexShrink: 0, background: '#f8fafc' }}>
                {TABS.map(tabBtn)}
              </div>

              {/* Body */}
              {(profileLoading || !profileStudent) ? (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569', fontSize: '13px' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ width: 28, height: 28, border: '3px solid #e2e8f0', borderTopColor: '#0ea5e9', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 10px' }} />
                    Loading student details...
                  </div>
                </div>
              ) : (
                <div style={{ flex: 1, overflow: 'auto', padding: '24px' }}>

                  {/* ── Personal ── */}
                  {profileTab === 'personal' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                      <div>
                        <p style={sectionHeadStyle}>Basic Information</p>
                        <div style={grid3}>
                          {field('First Name', s.firstName)}
                          {field('Surname', s.surname)}
                          {field('Gender', s.gender)}
                          {field('Date of Birth', s.dateOfBirth ? new Date(s.dateOfBirth).toLocaleDateString() : null)}
                          {field('Birth Certificate No.', s.birthCertificateNo)}
                          {field('Race', s.race)}
                        </div>
                      </div>
                      <div>
                        <p style={sectionHeadStyle}>School Details</p>
                        <div style={grid3}>
                          {field('Form', s.form)}
                          {field('Date of Entry', s.dateOfEntry ? new Date(s.dateOfEntry).toLocaleDateString() : null)}
                          {field('Previous School', s.previousSchool)}
                          {field('Denomination', s.denomination)}
                          {field('Status', s.status)}
                        </div>
                      </div>
                      {s.otherInformation && (
                        <div>
                          <p style={sectionHeadStyle}>Other Information</p>
                          <p style={{ fontSize: '13px', color: '#0f172a' }}>{s.otherInformation}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* ── Medical ── */}
                  {profileTab === 'medical' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                      <div>
                        <p style={sectionHeadStyle}>Medical Aid</p>
                        <div style={grid2}>
                          {field('Medical Aid Society', s.medicalAidSociety)}
                          {field('Medical Aid No.', s.medicalAidNo)}
                        </div>
                      </div>
                      <div>
                        <p style={sectionHeadStyle}>Family Doctor</p>
                        <div style={grid2}>
                          {field('Doctor Name', s.familyDoctorName)}
                          {field('Doctor Phone', s.familyDoctorPhone)}
                        </div>
                      </div>
                      <div>
                        <p style={sectionHeadStyle}>Conditions</p>
                        <div style={grid2}>
                          {field('Allergies', s.allergies)}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ── Family ── */}
                  {profileTab === 'family' && (
                    family ? (
                      <div>
                        <p style={sectionHeadStyle}>Family Details</p>
                        <div style={grid2}>
                          {field('Home Address', family.homeAddress)}
                          {field('Home Telephone', family.homeTelephone)}
                          {field('Home Language', family.homeLanguage)}
                          {field('Religion', family.religion)}
                          {field('Marital Status', family.maritalStatus)}
                        </div>
                      </div>
                    ) : (
                      <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748b', fontSize: '13px' }}>
                        No family details recorded.
                      </div>
                    )
                  )}

                  {/* ── Guardians ── */}
                  {profileTab === 'guardians' && (
                    guardians.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        {guardians.map((g: any, i: number) => (
                          <div key={i} style={{ padding: '16px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                            <p style={{ ...sectionHeadStyle, marginBottom: '12px' }}>
                              {g.guardianType ?? (i === 0 ? 'Father / Guardian' : 'Mother / Guardian')}
                            </p>
                            <div style={grid3}>
                              {field('Name', `${g.title ?? ''} ${g.firstName ?? ''} ${g.surname ?? ''}`.trim())}
                              {field('Phone', g.phone)}
                              {field('Email', g.email)}
                              {field('Occupation', g.occupation)}
                              {field('Address', g.address)}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748b', fontSize: '13px' }}>
                        No guardian records found.
                      </div>
                    )
                  )}

                  {/* ── Emergency Contacts ── */}
                  {profileTab === 'emergency' && (
                    contacts.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {contacts.map((c: any, i: number) => (
                          <div key={i} style={{ padding: '14px 16px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                            <p style={{ ...sectionHeadStyle, marginBottom: '10px' }}>Contact {i + 1}</p>
                            <div style={grid3}>
                              {field('Name', c.name)}
                              {field('Phone', c.phone)}
                              {field('Relationship', c.relationship)}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748b', fontSize: '13px' }}>
                        No emergency contacts recorded.
                      </div>
                    )
                  )}

                  {/* ── Invoices ── */}
                  {profileTab === 'invoices' && (
                    studentInvoices.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {studentInvoices.map((inv: any) => (
                          <div key={inv.id} style={{ padding: '14px 16px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '13px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                              <strong style={{ fontFamily: 'ui-monospace, monospace' }}>{inv.invoiceNumber}</strong>
                              <span className={`pill ${inv.status === 'Paid' ? 'pill-success' : inv.status === 'PartiallyPaid' ? 'pill-warning' : 'pill-danger'}`} style={{ fontSize: '11px' }}>
                                {inv.status === 'PartiallyPaid' ? 'Partial' : inv.status}
                              </span>
                            </div>
                            <div style={grid3}>
                              {field('Total', `$${Number(inv.totalAmount ?? 0).toLocaleString()}`)}
                              {field('Paid', `$${Number(inv.amountPaid ?? 0).toLocaleString()}`)}
                              {field('Balance', `$${Number(inv.balance ?? 0).toLocaleString()}`)}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748b', fontSize: '13px' }}>
                        No invoices found for this student.
                      </div>
                    )
                  )}

                </div>
              )}

              {/* Footer */}
              <div style={{ padding: '14px 24px', borderTop: '1px solid #e2e8f0', display: 'flex', gap: '8px', background: 'white', flexShrink: 0 }}>
                <button
                  onClick={handleToggleStatus}
                  className="btn"
                  style={{ background: selectedStudent.status === 'Active' ? '#dc2626' : '#0ea5e9', color: 'white', border: 'none' }}
                >
                  {selectedStudent.status === 'Active' ? <><Lock size={14} /> Deactivate</> : <><Unlock size={14} /> Activate</>}
                </button>
              </div>
            </div>
          </>
        );
      })()}

      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideUp { from { transform: translateY(20px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }
        @keyframes slideInRight { from { transform: translateX(100%) } to { transform: translateX(0) } }
        @keyframes spin { to { transform: rotate(360deg) } }
      `}</style>
    </AdminLayout>
  );
}
