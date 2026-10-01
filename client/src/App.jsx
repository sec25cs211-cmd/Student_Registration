import { useEffect, useState } from 'react'
import './App.css'

const companies = [
  'Wipro',
  'HCLTech',
  'Accenture',
  'TCS',
  'Infosys',
  'Cognizant',
  'Capgemini',
  'IBM',
  'Tech Mahindra',
  'LTIMindtree',
]

const emptyStudent = {
  name: '',
  studentId: '',
  department: '',
  year: '',
  section: '',
  bloodGroup: '',
  fatherName: '',
  motherName: '',
  phone: '',
  email: '',
  arrears: '0',
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

async function apiRequest(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, options)
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(data.message || 'The server could not complete the request.')
  }
  return data
}

function App() {
  const [students, setStudents] = useState([])
  const [view, setView] = useState('student')
  const [step, setStep] = useState(1)
  const [form, setForm] = useState(emptyStudent)
  const [selectedCompanies, setSelectedCompanies] = useState([])
  const [notice, setNotice] = useState('')
  const [search, setSearch] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    let cancelled = false
    apiRequest('/students')
      .then((loadedStudents) => {
        if (!cancelled) setStudents(loadedStudents)
      })
      .catch(() => {
        if (!cancelled) setNotice('Unable to load the roster. Check that the registration server is running.')
      })
    return () => {
      cancelled = true
    }
  }, [])

  const arrears = Number(form.arrears)
  const eligibleCount = students.filter((student) => student.eligible).length

  function updateField(event) {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
    setNotice('')
  }

  async function saveStudent(student, preferences = []) {
    const duplicate = students.some(
      (savedStudent) => savedStudent.studentId.toLowerCase() === student.studentId.toLowerCase(),
    )
    if (duplicate) {
      setNotice('That student ID is already registered. Check the ID and try again.')
      return false
    }

    setIsSaving(true)
    try {
      const savedStudent = await apiRequest('/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...student, companies: preferences }),
      })
      setStudents((current) => [...current, savedStudent])
      setForm(emptyStudent)
      setSelectedCompanies([])
      setStep(1)
      setNotice('Registration saved. Your details are now on the student roster.')
      return true
    } catch (error) {
      setNotice(error.message)
      return false
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDetailsSubmit(event) {
    event.preventDefault()
    if (arrears > 0) {
      await saveStudent(form)
      return
    }
    const duplicate = students.some(
      (savedStudent) => savedStudent.studentId.toLowerCase() === form.studentId.toLowerCase(),
    )
    if (duplicate) {
      setNotice('That student ID is already registered. Check the ID and try again.')
      return
    }
    setStep(2)
    setNotice('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function toggleCompany(company) {
    setSelectedCompanies((current) =>
      current.includes(company)
        ? current.filter((item) => item !== company)
        : current.length < 4
          ? [...current, company]
          : current,
    )
  }

  async function handlePreferencesSubmit(event) {
    event.preventDefault()
    if (selectedCompanies.length !== 4) {
      setNotice('Select exactly four companies before submitting your registration.')
      return
    }
    if (await saveStudent(form, selectedCompanies)) {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  function changeView(nextView) {
    setView(nextView)
    setNotice('')
    setSearch('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const normalizedSearch = search.trim().toLowerCase()
  const visibleCompanies = companies.filter((company) => {
    const companyStudents = students.filter((student) =>
      student.companies.includes(company),
    )
    return (
      !normalizedSearch ||
      company.toLowerCase().includes(normalizedSearch) ||
      companyStudents.some(
        (student) =>
          student.name.toLowerCase().includes(normalizedSearch) ||
          student.studentId.toLowerCase().includes(normalizedSearch),
      )
    )
  })
  const unassignedStudents = students.filter(
    (student) => !student.eligible || student.companies.length === 0,
  )
  const visibleUnassigned = unassignedStudents.filter(
    (student) =>
      !normalizedSearch ||
      student.name.toLowerCase().includes(normalizedSearch) ||
      student.studentId.toLowerCase().includes(normalizedSearch),
  )

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#home" onClick={() => changeView('student')}>
          <span className="brand-mark" aria-hidden="true">N</span>
          <span className="brand-copy">
            <strong>northstar</strong>
            <small>CAREER SERVICES</small>
          </span>
        </a>
        <div className="topbar-meta">
          <span className="academic-year">PLACEMENT CELL <i /> 2025–26</span>
          <div className="view-switch" aria-label="Choose workspace">
            <button
              className={view === 'student' ? 'active' : ''}
              type="button"
              onClick={() => changeView('student')}
            >
              Student
            </button>
            <button
              className={view === 'admin' ? 'active' : ''}
              type="button"
              onClick={() => changeView('admin')}
            >
              Admin
            </button>
          </div>
        </div>
      </header>

      <main id="home" className="main-content">
        {view === 'student' ? (
          <StudentView
            step={step}
            form={form}
            updateField={updateField}
            arrears={arrears}
            selectedCompanies={selectedCompanies}
            toggleCompany={toggleCompany}
            onDetailsSubmit={handleDetailsSubmit}
            onPreferencesSubmit={handlePreferencesSubmit}
            onBack={() => setStep(1)}
            notice={notice}
            isSaving={isSaving}
          />
        ) : (
          <AdminView
            students={students}
            eligibleCount={eligibleCount}
            search={search}
            setSearch={setSearch}
            normalizedSearch={normalizedSearch}
            visibleCompanies={visibleCompanies}
            visibleUnassigned={visibleUnassigned}
          />
        )}
      </main>
      <footer className="footer">
        <span>Northstar Institute <i /> Placement Cell</span>
        <span>STUDENT OPPORTUNITIES, MADE CLEAR.</span>
      </footer>
    </div>
  )
}

function StudentView({
  step,
  form,
  updateField,
  arrears,
  selectedCompanies,
  toggleCompany,
  onDetailsSubmit,
  onPreferencesSubmit,
  onBack,
  notice,
  isSaving,
}) {
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">STUDENT PORTAL <span> / </span> REGISTRATION</p>
          <h1>Your next chapter <em>starts here.</em></h1>
          <p className="heading-copy">Share your details to get started with campus placements.</p>
        </div>
        <div className="heading-aside">
          <span className="aside-dot" /> REGISTRATION OPEN
          <strong>Class of 2026</strong>
        </div>
      </div>

      <div className="registration-layout">
        <section className="registration-panel">
          <div className="stepper" aria-label={`Step ${step} of 2`}>
            <div className={`step-item ${step === 1 ? 'current' : 'complete'}`}>
              <span className="step-number">{step === 1 ? '01' : '✓'}</span>
              <span><strong>Student details</strong><small>About you</small></span>
            </div>
            <span className={`step-line ${step === 2 ? 'complete' : ''}`} />
            <div className={`step-item ${step === 2 ? 'current' : ''}`}>
              <span className="step-number">02</span>
              <span><strong>Company choices</strong><small>Pick your four</small></span>
            </div>
          </div>

          {notice && <div className="notice" role={notice.startsWith('Registration saved.') ? 'status' : 'alert'}>{notice}</div>}

          {step === 1 ? (
            <form className="student-form" onSubmit={onDetailsSubmit}>
              <div className="section-intro">
                <div>
                  <p className="eyebrow">01 — PERSONAL & ACADEMIC</p>
                  <h2>Student information</h2>
                </div>
                <span className="required-note"><b>*</b> Required fields</span>
              </div>

              <div className="form-grid">
                <label className="field span-2">
                  <span>Full name <b>*</b></span>
                  <input name="name" value={form.name} onChange={updateField} placeholder="As shown on your college ID" autoComplete="name" required />
                </label>
                <label className="field">
                  <span>Student ID <b>*</b></span>
                  <input name="studentId" value={form.studentId} onChange={updateField} placeholder="e.g. NS24CS018" required />
                </label>
                <label className="field">
                  <span>Department <b>*</b></span>
                  <select name="department" value={form.department} onChange={updateField} required>
                    <option value="" disabled>Select department</option>
                    <option>Computer Science</option>
                    <option>Information Technology</option>
                    <option>Electronics & Communication</option>
                    <option>Electrical Engineering</option>
                    <option>Mechanical Engineering</option>
                    <option>Civil Engineering</option>
                    <option>Business Administration</option>
                    <option>Other</option>
                  </select>
                </label>
                <label className="field">
                  <span>Year <b>*</b></span>
                  <select name="year" value={form.year} onChange={updateField} required>
                    <option value="" disabled>Select year</option>
                    <option>1st year</option><option>2nd year</option>
                    <option>3rd year</option><option>4th year</option>
                  </select>
                </label>
                <label className="field">
                  <span>Section <b>*</b></span>
                  <input name="section" value={form.section} onChange={updateField} placeholder="e.g. A" required />
                </label>
                <label className="field">
                  <span>Blood group <b>*</b></span>
                  <select name="bloodGroup" value={form.bloodGroup} onChange={updateField} required>
                    <option value="" disabled>Select blood group</option>
                    {['A+', 'A−', 'B+', 'B−', 'AB+', 'AB−', 'O+', 'O−'].map((group) => <option key={group}>{group}</option>)}
                  </select>
                </label>
                <label className="field">
                  <span>Standing arrears <b>*</b></span>
                  <input className="number-input" name="arrears" type="number" min="0" step="1" value={form.arrears} onChange={updateField} required />
                  <small className="field-hint">Enter 0 if you have no standing arrears.</small>
                </label>
              </div>

              <div className="form-divider"><span>FAMILY & CONTACT</span></div>
              <div className="form-grid">
                <label className="field">
                  <span>Father&apos;s name <b>*</b></span>
                  <input name="fatherName" value={form.fatherName} onChange={updateField} placeholder="Full name" autoComplete="off" required />
                </label>
                <label className="field">
                  <span>Mother&apos;s name <b>*</b></span>
                  <input name="motherName" value={form.motherName} onChange={updateField} placeholder="Full name" autoComplete="off" required />
                </label>
                <label className="field">
                  <span>Phone number <b>*</b></span>
                  <input name="phone" type="tel" value={form.phone} onChange={updateField} placeholder="10-digit mobile number" autoComplete="tel" minLength="7" maxLength="18" required />
                </label>
                <label className="field">
                  <span>Email address <b>*</b></span>
                  <input name="email" type="email" value={form.email} onChange={updateField} placeholder="you@example.com" autoComplete="email" required />
                </label>
              </div>

              {arrears > 0 && <div className="eligibility-note"><span className="eligibility-icon">i</span><span><strong>Company preferences are currently locked.</strong> You can save your student details now. Placement eligibility requires zero standing arrears.</span></div>}

              <div className="form-actions">
                <span className="privacy-note">Your information is visible to the placement cell.</span>
                <button className="primary-button" type="submit" disabled={isSaving}>
                  {isSaving ? 'Saving registration…' : arrears === 0 ? 'Continue to company choices' : 'Save student details'}
                  <span aria-hidden="true">→</span>
                </button>
              </div>
            </form>
          ) : (
            <form className="student-form choices-form" onSubmit={onPreferencesSubmit}>
              <div className="section-intro">
                <div>
                  <p className="eyebrow">02 — PLACEMENT PREFERENCES</p>
                  <h2>Choose your four</h2>
                  <p className="section-copy">Select the companies you&apos;d most like to hear from.</p>
                </div>
                <span className="selection-count"><strong>{selectedCompanies.length}</strong> / 4 selected</span>
              </div>
              <div className="choice-grid">
                {companies.map((company, index) => {
                  const selected = selectedCompanies.includes(company)
                  return (
                    <button
                      className={`company-choice ${selected ? 'selected' : ''}`}
                      type="button"
                      key={company}
                      aria-pressed={selected}
                      onClick={() => toggleCompany(company)}
                    >
                      <span className={`company-monogram monogram-${index % 5}`}>{company.slice(0, 1)}</span>
                      <span className="company-choice-name">{company}</span>
                      <span className="choice-check" aria-hidden="true">{selected ? '✓' : '+'}</span>
                    </button>
                  )
                })}
              </div>
              <div className="preference-footnote"><span className="small-check">✓</span> You can choose exactly four companies. Your choices help us match you with relevant opportunities.</div>
              <div className="form-actions">
                <button className="text-button" type="button" onClick={onBack}>← Back to details</button>
                <button className="primary-button" type="submit" disabled={isSaving}>
                  {isSaving ? 'Submitting…' : 'Submit registration'} <span aria-hidden="true">→</span>
                </button>
              </div>
            </form>
          )}
        </section>

        <aside className="side-rail">
          <div className="rail-card eligibility-card">
            <div className="rail-card-top"><span className="rail-symbol">↗</span><span>PLACEMENT CHECK</span></div>
            <h3>Ready for what&apos;s next?</h3>
            <p>Students with no standing arrears can select their preferred companies.</p>
            <div className={`eligibility-status ${arrears === 0 ? 'clear' : 'hold'}`}>
              <span />{arrears === 0 ? 'No standing arrears' : `${arrears} standing ${arrears === 1 ? 'arrear' : 'arrears'}`}
            </div>
          </div>
          <div className="rail-note">
            <span className="note-index">01</span>
            <div><strong>One profile, better matches.</strong><p>Keep your student ID and contact details accurate so recruiters can reach you.</p></div>
          </div>
          <div className="rail-note">
            <span className="note-index">02</span>
            <div><strong>Your choices matter.</strong><p>Pick four companies that align with the work you want to do.</p></div>
          </div>
          <div className="rail-deadline"><span>NEED HELP?</span><strong>Contact your placement coordinator</strong><a href="mailto:placements@northstar.edu">placements@northstar.edu ↗</a></div>
        </aside>
      </div>
    </>
  )
}

function AdminView({ students, eligibleCount, search, setSearch, normalizedSearch, visibleCompanies, visibleUnassigned }) {
  return (
    <>
      <div className="page-heading admin-heading">
        <div>
          <p className="eyebrow">PLACEMENT CELL <span> / </span> ADMIN WORKSPACE</p>
          <h1>Candidate <em>roster.</em></h1>
          <p className="heading-copy">Review student preferences across participating companies.</p>
        </div>
          <div className="admin-summary"><span>LAST UPDATED</span><strong>{students.length ? 'Live roster' : 'No registrations yet'}</strong><small>Stored in MongoDB</small></div>
      </div>

      <section className="admin-dashboard">
        <div className="stats-row">
          <div className="stat-block"><span>TOTAL STUDENTS</span><strong>{students.length.toString().padStart(2, '0')}</strong><small>Registered profiles</small></div>
          <div className="stat-block"><span>PLACEMENT ELIGIBLE</span><strong>{eligibleCount.toString().padStart(2, '0')}</strong><small>Zero standing arrears</small></div>
          <div className="stat-block"><span>COMPANIES</span><strong>{companies.length.toString().padStart(2, '0')}</strong><small>Preference destinations</small></div>
          <div className="admin-search-wrap">
            <label htmlFor="roster-search">FIND A STUDENT OR COMPANY</label>
            <div className="search-field"><span aria-hidden="true">⌕</span><input id="roster-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Name, student ID, company" /><kbd>/</kbd></div>
          </div>
        </div>

        <div className="roster-title-row">
          <div><p className="eyebrow">PREFERENCE BREAKDOWN</p><h2>Students by company</h2></div>
          <span className="roster-result-count">{students.length} {students.length === 1 ? 'student' : 'students'} in roster</span>
        </div>

        {students.length === 0 ? (
          <div className="empty-roster"><span className="empty-mark">N</span><h3>Your roster is ready.</h3><p>Student registrations will appear here, grouped by their selected companies.</p></div>
        ) : (
          <div className="company-roster-grid">
            {visibleCompanies.map((company, index) => {
              const companyStudents = students.filter((student) =>
                student.companies.includes(company),
              ).filter((student) =>
                !normalizedSearch ||
                student.name.toLowerCase().includes(normalizedSearch) ||
                student.studentId.toLowerCase().includes(normalizedSearch),
              )
              return (
                <section className="company-roster" key={company}>
                  <div className="roster-company-heading">
                    <span className={`company-monogram monogram-${index % 5}`}>{company.slice(0, 1)}</span>
                    <div><h3>{company}</h3><span>{companyStudents.length} {companyStudents.length === 1 ? 'student' : 'students'}</span></div>
                    <span className="roster-arrow">↗</span>
                  </div>
                  {companyStudents.length ? (
                    <ul className="roster-students">
                      {companyStudents.map((student) => (
                        <li key={student.studentId}>
                          <span className="student-avatar">{student.name.trim().slice(0, 1).toUpperCase()}</span>
                          <span className="roster-student-info"><strong>{student.name}</strong><small>{student.studentId} <i /> {student.department}</small></span>
                          <a href={`mailto:${student.email}`} className="email-link" title={`Email ${student.name}`} aria-label={`Email ${student.name}`}>↗</a>
                        </li>
                      ))}
                    </ul>
                  ) : <p className="no-company-students">No students selected this company yet.</p>}
                </section>
              )
            })}
            {visibleUnassigned.length > 0 && (
              <section className="company-roster unassigned-roster">
                <div className="roster-company-heading">
                  <span className="unassigned-mark">—</span>
                  <div><h3>Not assigned</h3><span>{visibleUnassigned.length} {visibleUnassigned.length === 1 ? 'student' : 'students'}</span></div>
                </div>
                <ul className="roster-students">
                  {visibleUnassigned.map((student) => (
                    <li key={student.studentId}>
                      <span className="student-avatar">{student.name.trim().slice(0, 1).toUpperCase()}</span>
                      <span className="roster-student-info"><strong>{student.name}</strong><small>{student.studentId} <i /> {student.arrears} standing {Number(student.arrears) === 1 ? 'arrear' : 'arrears'}</small></span>
                      <span className="status-pill">Ineligible</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        )}
      </section>
    </>
  )
}

export default App
