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
  race: '', birthCertificateNo: '', campus: 'AHA',
});

const blankStep2 = () => ({
  form: 'Form 1', dateOfEntry: todayISO(), previousSchool: '',
  medicalAidSociety: '', medicalAidNo: '', familyDoctorName: '',
  familyDoctorPhone: '', allergies: '', denomination: '', otherInformation: '',
});
const blankStep3 = () => ({
  homeAddress: '', homeTelephone: '', homeLanguage: '',
  religion: '', maritalStatus: '', cell: '', email: '',
});
const blankGuardian = (title: string) => ({
  title, forenames: '', surname: '', nationality: '',
  occupation: '', companyName: '', businessAddress: '',
  businessTelephone: '', cell: '', email: '',
});
const blankContact = () => ({
  name: '', homeTelephone: '', businessTelephone: '',
  cell: '', relationship: '',
});

export default function StudentsPage() {
  const { user } = useAuth();
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [enrolledStudentNumber, setEnrolledStudentNumber] = useState<string | null>(null);

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
    setTimeout(() => setMessage(null), 8000);
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
    setEnrolledStudentNumber(null);
    setIsWizardOpen(true);
  };

  const closeWizard = () => {
    setIsWizardOpen(false);
    setWizardStep(1);
    setEnrolledStudentNumber(null);
  };

  const handleFinalSubmit = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      // Build payload matching EnrolStudentDTO exactly
      const payload = {
        schoolId: 1,
        firstName: step1.firstName.trim(),
        surname: step1.surname.trim(),
        dateOfBirth: step1.dateOfBirth,
        birthCertificateNo: step1.birthCertificateNo.trim(),
        gender: step1.gender,
        form: step2.form,
        dateOfEntry: step2.dateOfEntry,
        campus: step1.campus,
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

      console.log('Enrol full response:', enrolRes.data);

      const studentId = enrolRes.data?.studentId;
      const studentNumber = enrolRes.data?.studentNumber ?? '';

      console.log('Enrolled student ID:', studentId);
      console.log('Enrolled student number:', studentNumber);

      if (!studentId) {
        console.error('No studentId returned!', enrolRes.data);
      }

      // Optional calls — each wrapped independently so failures never block the success screen
      try {
        if (step3.homeAddress.trim()) {
          console.log('Saving family:', {
            homeAddress: step3.homeAddress,
            homeTelephone: step3.homeTelephone,
            homeLanguage: step3.homeLanguage,
            religion: step3.religion,
            maritalStatus: step3.maritalStatus,
            cell: step3.cell,
            email: step3.email,
          });
          await studentsAPI.addFamily(studentId, {
            homeAddress: step3.homeAddress,
            homeTelephone: step3.homeTelephone,
            homeLanguage: step3.homeLanguage,
            religion: step3.religion,
            maritalStatus: step3.maritalStatus,
            cell: step3.cell,
            email: step3.email,
          });
          console.log('Family saved!');
        } else {
          console.log('Family skipped - homeAddress empty');
        }
      } catch (e: any) { console.error('Family save FAILED:', e.response?.data); }

      try {
        if (father.forenames.trim()) {
          console.log('Saving father:', father);
          await studentsAPI.addGuardian(studentId, {
            guardianType: 'Father',
            title: father.title,
            forenames: father.forenames,
            surname: father.surname,
            nationality: father.nationality,
            occupation: father.occupation,
            companyName: father.companyName,
            businessAddress: father.businessAddress,
            businessTelephone: father.businessTelephone,
            cell: father.cell,
            email: father.email,
          });
          console.log('Father saved!');
        } else {
          console.log('Father skipped - forenames empty');
        }
      } catch (e: any) { console.error('Father save FAILED:', e.response?.data); }

      try {
        if (mother.forenames.trim()) {
          console.log('Saving mother:', mother);
          await studentsAPI.addGuardian(studentId, {
            guardianType: 'Mother',
            title: mother.title,
            forenames: mother.forenames,
            surname: mother.surname,
            nationality: mother.nationality,
            occupation: mother.occupation,
            companyName: mother.companyName,
            businessAddress: mother.businessAddress,
            businessTelephone: mother.businessTelephone,
            cell: mother.cell,
            email: mother.email,
          });
          console.log('Mother saved!');
        } else {
          console.log('Mother skipped - forenames empty');
        }
      } catch (e: any) { console.error('Mother save FAILED:', e.response?.data); }

      try {
        if (contact1.name.trim()) {
          console.log('Saving contact1:', contact1);
          await studentsAPI.addEmergencyContact(studentId, {
            name: contact1.name,
            homeTelephone: contact1.homeTelephone,
            businessTelephone: contact1.businessTelephone,
            cell: contact1.cell,
            relationship: contact1.relationship,
            contactOrder: 1,
          });
          console.log('Contact1 saved!');
        } else {
          console.log('Contact1 skipped - name empty');
        }
      } catch (e: any) { console.error('Contact1 save FAILED:', e.response?.data); }

      try {
        if (contact2.name.trim()) {
          console.log('Saving contact2:', contact2);
          await studentsAPI.addEmergencyContact(studentId, {
            name: contact2.name,
            homeTelephone: contact2.homeTelephone,
            businessTelephone: contact2.businessTelephone,
            cell: contact2.cell,
            relationship: contact2.relationship,
            contactOrder: 2,
          });
          console.log('Contact2 saved!');
        } else {
          console.log('Contact2 skipped - name empty');
        }
      } catch (e: any) { console.error('Contact2 save FAILED:', e.response?.data); }

      // Always show success if the main enrolment worked
      loadStudents();
      setEnrolledStudentNumber(studentNumber);
    } catch (err: any) {
      const status = err.response?.status;
      const data = err.response?.data;
      console.error('=== ENROL ERROR ===');
      console.error('Status:', status);
      console.error('Response data:', JSON.stringify(data, null, 2));

      // Extract specific field errors from ASP.NET Core's ProblemDetails format
      const fieldErrors: string[] = [];
      if (data?.errors && typeof data.errors === 'object') {
        for (const [field, msgs] of Object.entries(data.errors)) {
          fieldErrors.push(`${field}: ${(msgs as string[]).join(', ')}`);
        }
      }

      const baseMsg =
        data?.message ??
        data?.title ??
        (typeof data === 'string' ? data : null) ??
        `Server error ${status ?? ''}`.trim();

      const fullMsg = fieldErrors.length > 0
        ? `${baseMsg}\n${fieldErrors.join('\n')}`
        : baseMsg || 'Failed to enrol student';

      showMessage(fullMsg, 'error');
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
      console.log(detailRes.data);
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

  const handleDeleteStudent = async () => {
    if (!selectedStudent) return;
    const confirm = window.confirm(
      `Delete ${selectedStudent.firstName} ${selectedStudent.surname}?\nStudent number: ${selectedStudent.studentNumber}\nThis will permanently delete all their records.\nThis cannot be undone.`
    );
    if (!confirm) return;
    try {
      await studentsAPI.deleteStudent(selectedStudent.id);
      showMessage('Student deleted successfully', 'success');
      closeProfilePanel();
      loadStudents();
    } catch (err: any) {
      console.error('Delete error:', err.response?.status);
      console.error('Delete error data:', err.response?.data);
      showMessage(
        err.response?.data?.message ||
        err.response?.data?.error ||
        'Failed to delete student',
        'error'
      );
    }
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
    <>
      {/* Toast rendered outside AdminLayout to avoid CSS stacking context issues */}
      {message && (
        <div style={{
          position: 'fixed',
          top: message.type === 'success' ? '50%' : 20,
          left: message.type === 'success' ? '50%' : 'auto',
          right: message.type === 'success' ? 'auto' : 20,
          transform: message.type === 'success' ? 'translate(-50%, -50%)' : 'none',
          padding: message.type === 'success' ? '32px 40px' : '16px 24px',
          borderRadius: '16px',
          background: message.type === 'success' ? '#16a34a' : '#dc2626',
          color: 'white',
          fontSize: message.type === 'success' ? '16px' : '14px',
          fontWeight: '600',
          zIndex: 999999,
          boxShadow: '0 20px 60px rgba(0,0,0,0.35)',
          maxWidth: message.type === 'success' ? '480px' : '460px',
          width: message.type === 'success' ? '90vw' : 'auto',
          whiteSpace: 'pre-line',
          lineHeight: '1.7',
          textAlign: message.type === 'success' ? 'center' : 'left',
          cursor: 'pointer',
        }}
          onClick={() => setMessage(null)}
        >
          {message.text}
          {message.type === 'success' && (
            <p style={{ fontSize: '12px', marginTop: '12px', opacity: 0.8, fontWeight: 400 }}>
              Click to dismiss
            </p>
          )}
        </div>
      )}
      {/* Dim backdrop for success messages */}
      {message?.type === 'success' && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 999998,
        }}
          onClick={() => setMessage(null)}
        />
      )}

    <AdminLayout title="Students" subtitle={`${students.length} enrolled`}>

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
          <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 20px 60px rgba(0,0,0,0.15)', width: '100%', maxWidth: '640px', maxHeight: '92vh', overflow: 'auto', position: 'relative' }}
            onClick={(e) => e.stopPropagation()}>

            {/* Loading overlay — prevents double-click */}
            {isSubmitting && !enrolledStudentNumber && (
              <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.92)', zIndex: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', borderRadius: '12px', gap: 16 }}>
                <div style={{ width: 44, height: 44, border: '4px solid #e2e8f0', borderTopColor: '#1a237e', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                <p style={{ fontSize: '15px', fontWeight: '600', color: '#1a237e', margin: 0 }}>Enrolling student, please wait...</p>
              </div>
            )}

            {/* Success screen */}
            {enrolledStudentNumber ? (
              <div style={{ padding: '48px 40px', textAlign: 'center' }}>
                <div style={{ fontSize: '64px', marginBottom: '16px' }}>✅</div>
                <h2 style={{ fontSize: '22px', fontWeight: '700', color: '#0f172a', margin: '0 0 8px' }}>
                  Student Enrolled Successfully!
                </h2>
                <p style={{ fontSize: '13px', color: '#1a237e', fontWeight: '600', margin: '0 0 6px' }}>
                  {step1.campus === 'AHJ' ? 'Advent Hope Junior' : step1.campus === 'AHS' ? 'Advent Hope Senior' : 'Advent Hope Academy'}
                </p>
                <p style={{ fontSize: '13px', color: '#475569', margin: '0 0 24px' }}>
                  The student can now register on the portal using their student number.
                </p>
                <div style={{ background: '#f0fdf4', border: '2px solid #bbf7d0', borderRadius: '12px', padding: '20px 24px', marginBottom: '28px', display: 'inline-block', minWidth: '240px' }}>
                  <p style={{ fontSize: '12px', color: '#15803d', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 6px' }}>Student Number</p>
                  <p style={{ fontSize: '28px', fontWeight: '700', color: '#15803d', fontFamily: 'ui-monospace, monospace', margin: '0 0 10px' }}>{enrolledStudentNumber}</p>
                  <p style={{ fontSize: '12px', color: '#15803d', fontWeight: '500', margin: 0 }}>Enrolled for Term 1 · 2026 Academic Year</p>
                </div>
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                  <button
                    onClick={closeWizard}
                    style={{ padding: '10px 24px', borderRadius: '8px', border: '1px solid #e2e8f0', background: 'white', color: '#475569', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}
                  >
                    Close
                  </button>
                  <button
                    onClick={() => {
                      setEnrolledStudentNumber(null);
                      setStep1(blankStep1());
                      setStep2(blankStep2());
                      setStep3(blankStep3());
                      setFather(blankGuardian('Mr'));
                      setMother(blankGuardian('Mrs'));
                      setContact1(blankContact());
                      setContact2(blankContact());
                      setWizardStep(1);
                    }}
                    style={{ padding: '10px 24px', borderRadius: '8px', border: 'none', background: '#1a237e', color: 'white', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}
                  >
                    Enrol Another Student
                  </button>
                </div>
              </div>
            ) : (
            <>

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
                  <div style={{ marginBottom: '24px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                      {[
                        { code: 'AHJ', name: 'Advent Hope Junior', desc: 'Primary School' },
                        { code: 'AHA', name: 'Advent Hope Academy', desc: 'Secondary - O Level' },
                        { code: 'AHS', name: 'Advent Hope Senior', desc: 'A Level' },
                      ].map(({ code, name, desc }) => (
                        <div
                          key={code}
                          onClick={() => setStep1({ ...step1, campus: code })}
                          style={{
                            border: step1.campus === code ? '2px solid #1a237e' : '2px solid #e2e8f0',
                            background: step1.campus === code ? '#eef2ff' : 'white',
                            borderRadius: '8px',
                            padding: '14px 12px',
                            cursor: 'pointer',
                            textAlign: 'center',
                          }}
                        >
                          <div style={{ fontWeight: '700', fontSize: '15px', color: '#0f172a', marginBottom: '4px' }}>{code}</div>
                          <div style={{ fontWeight: '600', fontSize: '12px', color: '#1a237e', marginBottom: '2px' }}>{name}</div>
                          <div style={{ fontSize: '11px', color: '#64748b' }}>{desc}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <h3 style={sectionHeadStyle}>Personal Details</h3>
                  <div style={gridTwo}>
                    <div>
                      <label style={labelStyle}>First Name *</label>
                      {inp(step1.firstName, (v) => setStep1({ ...step1, firstName: v }), { required: true, placeholder: 'First name' })}
                    </div>
                    <div>
                      <label style={labelStyle}>Surname *</label>
                      {inp(step1.surname, (v) => setStep1({ ...step1, surname: v }), { required: true, placeholder: 'Surname' })}
                    </div>
                    <div>
                      <label style={labelStyle}>Date of Birth *</label>
                      {inp(step1.dateOfBirth, (v) => setStep1({ ...step1, dateOfBirth: v }), { type: 'date', required: true })}
                    </div>
                    <div>
                      <label style={labelStyle}>Gender *</label>
                      {sel(step1.gender, (v) => setStep1({ ...step1, gender: v }), ['Male', 'Female'])}
                    </div>
                    <div>
                      <label style={labelStyle}>Race</label>
                      {inp(step1.race, (v) => setStep1({ ...step1, race: v }), { placeholder: 'e.g. African' })}
                    </div>
                    <div>
                      <label style={labelStyle}>Birth Certificate No.</label>
                      {inp(step1.birthCertificateNo, (v) => setStep1({ ...step1, birthCertificateNo: v }), { placeholder: 'Birth certificate number' })}
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
                      {sel(step2.form, (v) => setStep2({ ...step2, form: v }),
                        step1.campus === 'AHJ' ? ['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7'] :
                        step1.campus === 'AHS' ? ['Lower 6', 'Upper 6'] :
                        ['Form 1', 'Form 2', 'Form 3', 'Form 4', 'Form 5', 'Form 6']
                      )}
                    </div>
                    <div>
                      <label style={labelStyle}>Date of Entry</label>
                      {inp(step2.dateOfEntry, (v) => setStep2({ ...step2, dateOfEntry: v }), { type: 'date' })}
                    </div>
                    <div>
                      <label style={labelStyle}>Previous School</label>
                      {inp(step2.previousSchool, (v) => setStep2({ ...step2, previousSchool: v }), { placeholder: 'Previous school name' })}
                    </div>
                  </div>
                  <h3 style={sectionHeadStyle}>Medical Information</h3>
                  <div style={{ ...gridTwo, marginBottom: '20px' }}>
                    <div>
                      <label style={labelStyle}>Medical Aid Society</label>
                      {inp(step2.medicalAidSociety, (v) => setStep2({ ...step2, medicalAidSociety: v }), { placeholder: 'Medical aid society' })}
                    </div>
                    <div>
                      <label style={labelStyle}>Medical Aid No.</label>
                      {inp(step2.medicalAidNo, (v) => setStep2({ ...step2, medicalAidNo: v }), { placeholder: 'Medical aid number' })}
                    </div>
                    <div>
                      <label style={labelStyle}>Family Doctor</label>
                      {inp(step2.familyDoctorName, (v) => setStep2({ ...step2, familyDoctorName: v }), { placeholder: 'Doctor name' })}
                    </div>
                    <div>
                      <label style={labelStyle}>Doctor Phone</label>
                      {inp(step2.familyDoctorPhone, (v) => setStep2({ ...step2, familyDoctorPhone: v }), { placeholder: 'Doctor phone number' })}
                    </div>
                    <div>
                      <label style={labelStyle}>Allergies</label>
                      {inp(step2.allergies, (v) => setStep2({ ...step2, allergies: v }), { placeholder: 'Any allergies or medical conditions' })}
                    </div>
                    <div>
                      <label style={labelStyle}>Denomination</label>
                      {inp(step2.denomination, (v) => setStep2({ ...step2, denomination: v }), { placeholder: 'Religious denomination' })}
                    </div>
                    <div style={{ gridColumn: '1/-1' }}>
                      <label style={labelStyle}>Other Information</label>
                      {inp(step2.otherInformation, (v) => setStep2({ ...step2, otherInformation: v }), { placeholder: 'Any other relevant information' })}
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
                      {inp(step3.homeAddress, (v) => setStep3({ ...step3, homeAddress: v }), { placeholder: 'Home address' })}
                    </div>
                    <div>
                      <label style={labelStyle}>Home Telephone</label>
                      {inp(step3.homeTelephone, (v) => setStep3({ ...step3, homeTelephone: v }), { placeholder: 'Home telephone' })}
                    </div>
                    <div>
                      <label style={labelStyle}>Cell</label>
                      {inp(step3.cell, (v) => setStep3({ ...step3, cell: v }), { placeholder: 'Cell number' })}
                    </div>
                    <div>
                      <label style={labelStyle}>Home Language</label>
                      {inp(step3.homeLanguage, (v) => setStep3({ ...step3, homeLanguage: v }), { placeholder: 'Home language' })}
                    </div>
                    <div>
                      <label style={labelStyle}>Religion</label>
                      {inp(step3.religion, (v) => setStep3({ ...step3, religion: v }), { placeholder: 'Religion' })}
                    </div>
                    <div>
                      <label style={labelStyle}>Marital Status</label>
                      {sel(step3.maritalStatus, (v) => setStep3({ ...step3, maritalStatus: v }), ['', 'Married', 'Single', 'Divorced', 'Widowed'])}
                    </div>
                    <div>
                      <label style={labelStyle}>Email</label>
                      {inp(step3.email, (v) => setStep3({ ...step3, email: v }), { type: 'email', placeholder: 'Family email address' })}
                    </div>
                  </div>
                </>
              )}

              {/* ─ Step 4: Guardians ─ */}
              {wizardStep === 4 && (
                <>
                  <h3 style={sectionHeadStyle}>Father / Guardian</h3>
                  <div style={{ ...gridTwo, marginBottom: '24px' }}>
                    <div>
                      <label style={labelStyle}>Title</label>
                      {sel(father.title, (v) => setFather({ ...father, title: v }), ['Mr', 'Dr', 'Prof', 'Rev'])}
                    </div>
                    <div>
                      <label style={labelStyle}>Forenames</label>
                      {inp(father.forenames, (v) => setFather({ ...father, forenames: v }), { placeholder: 'Forenames' })}
                    </div>
                    <div>
                      <label style={labelStyle}>Surname</label>
                      {inp(father.surname, (v) => setFather({ ...father, surname: v }), { placeholder: 'Surname' })}
                    </div>
                    <div>
                      <label style={labelStyle}>Nationality</label>
                      {inp(father.nationality, (v) => setFather({ ...father, nationality: v }), { placeholder: 'Nationality' })}
                    </div>
                    <div>
                      <label style={labelStyle}>Occupation</label>
                      {inp(father.occupation, (v) => setFather({ ...father, occupation: v }), { placeholder: 'Occupation' })}
                    </div>
                    <div>
                      <label style={labelStyle}>Company Name</label>
                      {inp(father.companyName, (v) => setFather({ ...father, companyName: v }), { placeholder: 'Company / Employer name' })}
                    </div>
                    <div>
                      <label style={labelStyle}>Business Telephone</label>
                      {inp(father.businessTelephone, (v) => setFather({ ...father, businessTelephone: v }), { placeholder: 'Business telephone' })}
                    </div>
                    <div>
                      <label style={labelStyle}>Cell</label>
                      {inp(father.cell, (v) => setFather({ ...father, cell: v }), { placeholder: 'Cell number' })}
                    </div>
                    <div>
                      <label style={labelStyle}>Email</label>
                      {inp(father.email, (v) => setFather({ ...father, email: v }), { type: 'email', placeholder: 'Email address' })}
                    </div>
                    <div style={{ gridColumn: '1/-1' }}>
                      <label style={labelStyle}>Business Address</label>
                      {inp(father.businessAddress, (v) => setFather({ ...father, businessAddress: v }), { placeholder: 'Business address' })}
                    </div>
                  </div>

                  <h3 style={sectionHeadStyle}>Mother / Guardian</h3>
                  <div style={gridTwo}>
                    <div>
                      <label style={labelStyle}>Title</label>
                      {sel(mother.title, (v) => setMother({ ...mother, title: v }), ['Mrs', 'Ms', 'Dr', 'Prof'])}
                    </div>
                    <div>
                      <label style={labelStyle}>Forenames</label>
                      {inp(mother.forenames, (v) => setMother({ ...mother, forenames: v }), { placeholder: 'Forenames' })}
                    </div>
                    <div>
                      <label style={labelStyle}>Surname</label>
                      {inp(mother.surname, (v) => setMother({ ...mother, surname: v }), { placeholder: 'Surname' })}
                    </div>
                    <div>
                      <label style={labelStyle}>Nationality</label>
                      {inp(mother.nationality, (v) => setMother({ ...mother, nationality: v }), { placeholder: 'Nationality' })}
                    </div>
                    <div>
                      <label style={labelStyle}>Occupation</label>
                      {inp(mother.occupation, (v) => setMother({ ...mother, occupation: v }), { placeholder: 'Occupation' })}
                    </div>
                    <div>
                      <label style={labelStyle}>Company Name</label>
                      {inp(mother.companyName, (v) => setMother({ ...mother, companyName: v }), { placeholder: 'Company / Employer name' })}
                    </div>
                    <div>
                      <label style={labelStyle}>Business Telephone</label>
                      {inp(mother.businessTelephone, (v) => setMother({ ...mother, businessTelephone: v }), { placeholder: 'Business telephone' })}
                    </div>
                    <div>
                      <label style={labelStyle}>Cell</label>
                      {inp(mother.cell, (v) => setMother({ ...mother, cell: v }), { placeholder: 'Cell number' })}
                    </div>
                    <div>
                      <label style={labelStyle}>Email</label>
                      {inp(mother.email, (v) => setMother({ ...mother, email: v }), { type: 'email', placeholder: 'Email address' })}
                    </div>
                    <div style={{ gridColumn: '1/-1' }}>
                      <label style={labelStyle}>Business Address</label>
                      {inp(mother.businessAddress, (v) => setMother({ ...mother, businessAddress: v }), { placeholder: 'Business address' })}
                    </div>
                  </div>
                </>
              )}

              {/* ─ Step 5: Emergency Contacts ─ */}
              {wizardStep === 5 && (
                <>
                  <h3 style={sectionHeadStyle}>Emergency Contact 1</h3>
                  <div style={{ ...gridTwo, marginBottom: '20px' }}>
                    <div style={{ gridColumn: '1/-1' }}>
                      <label style={labelStyle}>Full Name</label>
                      {inp(contact1.name, (v) => setContact1({ ...contact1, name: v }), { placeholder: 'Full name' })}
                    </div>
                    <div>
                      <label style={labelStyle}>Home Telephone</label>
                      {inp(contact1.homeTelephone, (v) => setContact1({ ...contact1, homeTelephone: v }), { placeholder: 'Home telephone' })}
                    </div>
                    <div>
                      <label style={labelStyle}>Cell</label>
                      {inp(contact1.cell, (v) => setContact1({ ...contact1, cell: v }), { placeholder: 'Cell number' })}
                    </div>
                    <div>
                      <label style={labelStyle}>Business Telephone</label>
                      {inp(contact1.businessTelephone, (v) => setContact1({ ...contact1, businessTelephone: v }), { placeholder: 'Business telephone' })}
                    </div>
                    <div>
                      <label style={labelStyle}>Relationship</label>
                      {inp(contact1.relationship, (v) => setContact1({ ...contact1, relationship: v }), { placeholder: 'Relationship to student' })}
                    </div>
                  </div>
                  <h3 style={sectionHeadStyle}>Emergency Contact 2</h3>
                  <div style={gridTwo}>
                    <div style={{ gridColumn: '1/-1' }}>
                      <label style={labelStyle}>Full Name</label>
                      {inp(contact2.name, (v) => setContact2({ ...contact2, name: v }), { placeholder: 'Full name' })}
                    </div>
                    <div>
                      <label style={labelStyle}>Home Telephone</label>
                      {inp(contact2.homeTelephone, (v) => setContact2({ ...contact2, homeTelephone: v }), { placeholder: 'Home telephone' })}
                    </div>
                    <div>
                      <label style={labelStyle}>Cell</label>
                      {inp(contact2.cell, (v) => setContact2({ ...contact2, cell: v }), { placeholder: 'Cell number' })}
                    </div>
                    <div>
                      <label style={labelStyle}>Business Telephone</label>
                      {inp(contact2.businessTelephone, (v) => setContact2({ ...contact2, businessTelephone: v }), { placeholder: 'Business telephone' })}
                    </div>
                    <div>
                      <label style={labelStyle}>Relationship</label>
                      {inp(contact2.relationship, (v) => setContact2({ ...contact2, relationship: v }), { placeholder: 'Relationship to student' })}
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
                    if (wizardStep === 1 && (!step1.firstName.trim() || !step1.surname.trim() || !step1.dateOfBirth)) {
                      showMessage('Please fill in First Name, Surname and Date of Birth', 'error');
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
                  disabled={isSubmitting}
                  onClick={handleFinalSubmit}
                  style={{
                    opacity: isSubmitting ? 0.6 : 1,
                    cursor: isSubmitting ? 'not-allowed' : 'pointer',
                    background: '#1a237e',
                    color: 'white',
                    padding: '12px 32px',
                    borderRadius: '8px',
                    border: 'none',
                    fontSize: '14px',
                    fontWeight: '600',
                  }}
                >
                  {isSubmitting ? 'Enrolling...' : 'Enrol Student'}
                </button>
              )}
            </div>
            </>
            )}
          </div>
        </div>
      )}

      {/* ─── PROFILE PANEL ─── */}
      {isProfileOpen && selectedStudent && (() => {
        const s = profileStudent || selectedStudent;
        const TABS = ['Personal', 'Medical', 'Family', 'Guardians', 'Emergency'];
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
                              {field('Name', `${g.title ?? ''} ${g.forenames ?? ''} ${g.surname ?? ''}`.trim())}
                              {field('Cell', g.cell)}
                              {field('Business Tel', g.businessTelephone)}
                              {field('Email', g.email)}
                              {field('Occupation', g.occupation)}
                              {field('Nationality', g.nationality)}
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
                              {field('Home Tel', c.homeTelephone)}
                              {field('Cell', c.cell)}
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
                <button
                  onClick={handleDeleteStudent}
                  className="btn"
                  style={{ background: '#dc2626', color: 'white', border: 'none' }}
                >
                  🗑 Delete
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
    </>
  );
}
