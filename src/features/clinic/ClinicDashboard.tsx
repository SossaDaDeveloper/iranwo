import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import type { User } from '@supabase/supabase-js'
import {
  Activity, AlertTriangle, ArrowDown, ArrowUp, Bell, Check, CheckCircle2,
  ChevronRight, Clock3, FileText, HeartPulse, Hospital, LogOut, MapPin,
  Search, ShieldCheck, Siren, UserRound, Users, Volume2, VolumeX, Wifi,
} from 'lucide-react'
import { signOutFromSupabase, supabase } from '../../supabase'
import './clinic-dashboard.css'

type Section = 'overview' | 'patients' | 'alerts' | 'activity'
type AlertStatus = 'new' | 'acknowledged' | 'responding' | 'resolved'
type PatientProfile = Record<string, unknown> & {
  name?: string
  fullName?: string
  full_name?: string
  firstName?: string
  country?: string
  phone?: string
  age?: string | number
  sex?: string
  language?: string
  conditions?: unknown
  customConditions?: unknown
  conditionOther?: string
  notes?: string
  allergy?: string
  allergyText?: string
  medication?: string
  medicationText?: string
  symptomsNow?: string
  symptomsText?: string
  recurring?: string
  recurringText?: string
  contacts?: unknown
  trustedContacts?: unknown
  trustedContact?: unknown
  notifyOnEmergency?: boolean
}
type Patient = {
  user_id: string
  profile: PatientProfile | null
  onboarded: boolean
  created_at: string | null
  updated_at: string | null
}
type EmergencyAlert = {
  id: string
  patient_id: string
  clinic_id: string
  reason: string | null
  status: AlertStatus
  latitude: number | null
  longitude: number | null
  location_shared: boolean
  created_at: string
  updated_at: string
  handled_by: string | null
  patient?: Patient
}
type ResponseEvent = {
  id: string
  alert_id: string
  staff_user_id: string
  status: AlertStatus | null
  action: string
  created_at: string
}
type StaffClinic = {
  clinic_id: string
  role: string
  care_clinics: { name: string } | null
}

const demoPatients: Patient[] = [
  {
    user_id: 'DEMO-IW-1042',
    profile: {
      name: 'Amara Okafor', age: 31, sex: 'Female', language: 'en',
      conditions: ['asthma'], customConditions: [], allergy: 'Yes — specify',
      allergyText: 'Penicillin (patient reported)', medication: 'Yes',
      medicationText: 'Salbutamol inhaler (patient reported)', symptomsNow: 'No',
      recurring: 'Yes', recurringText: 'Occasional wheezing during exercise',
      notes: 'Mock patient record for demonstration only.',
      contacts: [{ name: 'Chidi Okafor', relationship: 'Sibling', phone: '+234 800 000 0001' }],
    },
    onboarded: true,
    created_at: '2026-09-16T09:00:00.000Z',
    updated_at: '2026-10-28T15:40:00.000Z',
  },
  {
    user_id: 'DEMO-IW-1078',
    profile: {
      name: 'Tunde Adeyemi', age: 54, sex: 'Male', language: 'yo',
      conditions: ['hypertension'], customConditions: ['Type 2 diabetes'],
      allergy: 'No known allergies', medication: 'Not currently taking medication',
      symptomsNow: 'Yes', symptomsText: 'Headache and dizziness since this morning',
      recurring: 'Not provided', notes: 'Mock patient record for demonstration only.',
      contacts: [{ name: 'Bisi Adeyemi', relationship: 'Partner', phone: '+234 800 000 0002' }],
    },
    onboarded: true,
    created_at: '2026-10-24T11:30:00.000Z',
    updated_at: '2026-10-30T08:20:00.000Z',
  },
  {
    user_id: 'DEMO-IW-1113',
    profile: {
      name: 'Zainab Musa', age: 22, language: 'ha', conditions: [],
      notes: 'Mock patient record for demonstration only.', contacts: [],
    },
    onboarded: false,
    created_at: '2026-10-30T13:15:00.000Z',
    updated_at: '2026-10-30T13:15:00.000Z',
  },
]

const demoAlerts: EmergencyAlert[] = [
  {
    id: 'DEMO-ALERT-2001', patient_id: 'DEMO-IW-1078', clinic_id: 'DEMO-CLINIC',
    reason: 'Headache and dizziness since this morning', status: 'new',
    latitude: null, longitude: null, location_shared: false,
    created_at: new Date(Date.now() - 9 * 60_000).toISOString(),
    updated_at: new Date(Date.now() - 9 * 60_000).toISOString(), handled_by: null,
  },
  {
    id: 'DEMO-ALERT-1998', patient_id: 'DEMO-IW-1042', clinic_id: 'DEMO-CLINIC',
    reason: 'Patient reported breathing difficulty', status: 'responding',
    latitude: null, longitude: null, location_shared: false,
    created_at: new Date(Date.now() - 47 * 60_000).toISOString(),
    updated_at: new Date(Date.now() - 38 * 60_000).toISOString(), handled_by: 'DEMO-STAFF',
  },
]

const languageNames: Record<string, string> = {
  en: 'English', yo: 'Yorùbá', pcm: 'Nigerian Pidgin', ha: 'Hausa', ig: 'Igbo',
}
const statusNames: Record<AlertStatus, string> = {
  new: 'New', acknowledged: 'Acknowledged', responding: 'Responding', resolved: 'Resolved',
}
const dayMs = 24 * 60 * 60 * 1000

function display(value: unknown): string {
  if (value == null || value === '') return 'Not provided'
  if (Array.isArray(value)) return value.length ? value.map(String).join(', ') : 'None reported'
  return String(value)
}

function patientName(patient: Patient | undefined): string {
  const profile = patient?.profile
  return profile?.name?.trim() || profile?.fullName?.trim() || profile?.full_name?.trim() || profile?.firstName?.trim() || 'Name not provided'
}

function displayConditions(value: unknown): string {
  const labels: Record<string, string> = {
    asthma: 'Asthma',
    diabetes: 'Diabetes',
    hypertension: 'High blood pressure',
    heart: 'Heart condition',
    seizures: 'Seizure disorder',
    sickle: 'Sickle cell disease',
    other: 'Other',
  }
  if (!Array.isArray(value)) return display(value)
  return value.length ? value.map((condition) => labels[String(condition)] ?? String(condition)).join(', ') : 'None reported'
}

function patientContacts(profile: PatientProfile | null) {
  const contacts = profile?.contacts ?? profile?.trustedContacts ?? (profile?.trustedContact ? [profile.trustedContact] : [])
  if (!Array.isArray(contacts)) return []
  return contacts.filter((contact): contact is Record<string, unknown> => !!contact && typeof contact === 'object')
}

function elapsed(iso: string, now: number): string {
  const minutes = Math.max(0, Math.floor((now - Date.parse(iso)) / 60_000))
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  return `${hours}h ${minutes % 60}m`
}

function dateTime(iso: string | null | undefined): string {
  if (!iso) return 'Not available'
  const value = new Date(iso)
  return Number.isNaN(value.getTime()) ? 'Not available' : value.toLocaleString()
}

function patientId(value: string) {
  return value.startsWith('DEMO-') ? value : value.slice(0, 8).toUpperCase()
}

function tone(status: AlertStatus) {
  return `clinic-status clinic-status-${status}`
}

function playAlertTone() {
  const AudioContextConstructor = window.AudioContext
  if (!AudioContextConstructor) return
  const context = new AudioContextConstructor()
  const oscillator = context.createOscillator()
  const gain = context.createGain()
  oscillator.type = 'sine'
  oscillator.frequency.value = 880
  gain.gain.setValueAtTime(0.0001, context.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.16, context.currentTime + 0.03)
  gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.38)
  oscillator.connect(gain)
  gain.connect(context.destination)
  oscillator.start()
  oscillator.stop(context.currentTime + 0.4)
  oscillator.onended = () => { void context.close() }
}

export default function ClinicDashboard({ onPatientApp, onSignedOut }: { onPatientApp: () => void; onSignedOut: () => void }) {
  const [user, setUser] = useState<User | null>(null)
  const [section, setSection] = useState<Section>('overview')
  const [patients, setPatients] = useState<Patient[]>([])
  const [alerts, setAlerts] = useState<EmergencyAlert[]>([])
  const [mockAlerts, setMockAlerts] = useState<EmergencyAlert[]>(demoAlerts)
  const [events, setEvents] = useState<ResponseEvent[]>([])
  const [staffClinic, setStaffClinic] = useState<StaffClinic | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [demoMode, setDemoMode] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [authError, setAuthError] = useState('')
  const [authBusy, setAuthBusy] = useState(false)
  const [search, setSearch] = useState('')
  const [patientFilter, setPatientFilter] = useState('all')
  const [selectedPatientId, setSelectedPatientId] = useState('')
  const [responseDrafts, setResponseDrafts] = useState<Record<string, string>>({})
  const [actionError, setActionError] = useState('')
  const [soundEnabled, setSoundEnabled] = useState(false)
  const [clock, setClock] = useState(Date.now())
  const previousAlertIds = useRef<Set<string> | null>(null)

  const loadDashboard = useCallback(async (quiet = false) => {
    const client = supabase
    if (!client || !user || demoMode) return
    if (!quiet) setLoading(true)
    setError('')
    const { data: memberships, error: membershipError } = await client
      .from('clinic_staff')
      .select('clinic_id, role')
      .eq('user_id', user.id)
      .eq('active', true)
      .limit(1)
    if (membershipError) {
      setError(`Could not verify clinic access: ${membershipError.message}. Apply the clinic access schema and assign this account to a clinic.`)
      setStaffClinic(null)
      setLoading(false)
      return
    }
    const membershipRow = memberships?.[0]
    let membership: StaffClinic | null = membershipRow
      ? { clinic_id: membershipRow.clinic_id, role: membershipRow.role, care_clinics: null }
      : null
    if (membership) {
      const { data: clinic, error: clinicError } = await client
        .from('care_clinics')
        .select('name')
        .eq('id', membership.clinic_id)
        .maybeSingle()
      if (clinicError) {
        setError(`Could not load clinic details: ${clinicError.message}`)
        setStaffClinic(null)
        setLoading(false)
        return
      }
      membership = { ...membership, care_clinics: clinic ? { name: clinic.name } : null }
    }
    setStaffClinic(membership)
    if (!membership) {
      setPatients([])
      setAlerts([])
      setEvents([])
      setError('This account is not assigned to a clinic. A clinic administrator must activate its staff membership before patient records can be viewed.')
      setLoading(false)
      return
    }
    const { data: sharedGrants, error: grantsError } = await client
      .from('patient_clinic_access')
      .select('patient_id')
      .eq('clinic_id', membership.clinic_id)
      .is('revoked_at', null)
    if (grantsError) {
      setError(`Could not load active patient permissions: ${grantsError.message}`)
      setLoading(false)
      return
    }
    const sharedPatientIds = new Set((sharedGrants ?? []).map((grant) => grant.patient_id))
    const [patientResult, alertResult, eventResult] = await Promise.all([
      client.from('user_profiles').select('user_id, profile, onboarded, created_at, updated_at').order('created_at', { ascending: false }),
      client.from('patient_emergency_alerts').select('id, patient_id, clinic_id, reason, status, latitude, longitude, location_shared, created_at, updated_at, handled_by').eq('clinic_id', membership.clinic_id).order('created_at', { ascending: false }),
      client.from('emergency_response_history').select('id, alert_id, staff_user_id, status, action, created_at').eq('clinic_id', membership.clinic_id).order('created_at', { ascending: false }).limit(200),
    ])
    const firstError = patientResult.error ?? alertResult.error ?? eventResult.error
    if (firstError) {
      setError(`Could not load clinic records: ${firstError.message}`)
      setLoading(false)
      return
    }
    const loadedPatients = ((patientResult.data ?? []) as Patient[]).filter((patient) => sharedPatientIds.has(patient.user_id))
    const loadedAlerts = (alertResult.data ?? []) as EmergencyAlert[]
    setPatients(loadedPatients)
    setAlerts(loadedAlerts)
    setEvents((eventResult.data ?? []) as ResponseEvent[])
    setError('')
    setLoading(false)
  }, [demoMode, user])

  useEffect(() => {
    if (!supabase) { setLoading(false); return }
    let active = true
    void supabase.auth.getSession().then(({ data, error: sessionError }) => {
      if (!active) return
      if (sessionError) setAuthError(`Could not check the sign-in session: ${sessionError.message}`)
      setUser(data.session?.user ?? null)
      setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active) {
        setDemoMode(false)
        setUser(session?.user ?? null)
      }
    })
    return () => { active = false; subscription.unsubscribe() }
  }, [])

  useEffect(() => { void loadDashboard() }, [loadDashboard])

  useEffect(() => {
    if (!user || demoMode || !staffClinic) return
    const timer = window.setInterval(() => { void loadDashboard(true) }, 20_000)
    return () => window.clearInterval(timer)
  }, [demoMode, loadDashboard, staffClinic, user])

  useEffect(() => {
    const timer = window.setInterval(() => setClock(Date.now()), 30_000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    const currentIds = new Set(alerts.filter((alert) => alert.status === 'new').map((alert) => alert.id))
    if (previousAlertIds.current && soundEnabled && [...currentIds].some((id) => !previousAlertIds.current?.has(id))) {
      playAlertTone()
    }
    previousAlertIds.current = currentIds
  }, [alerts, soundEnabled])

  const effectivePatients = demoMode ? demoPatients : patients
  const effectiveAlerts = demoMode ? mockAlerts : alerts
  const selectedPatient = effectivePatients.find((patient) => patient.user_id === selectedPatientId) ?? null
  const patientsById = useMemo(() => new Map(effectivePatients.map((patient) => [patient.user_id, patient])), [effectivePatients])
  const filteredPatients = useMemo(() => effectivePatients.filter((patient) => {
    const name = patientName(patient).toLocaleLowerCase()
    const id = patientId(patient.user_id).toLocaleLowerCase()
    const matchesSearch = `${name} ${id} ${patient.user_id}`.toLocaleLowerCase().includes(search.toLocaleLowerCase())
    const hasAlert = effectiveAlerts.some((alert) => alert.patient_id === patient.user_id && alert.status !== 'resolved')
    return matchesSearch && (patientFilter === 'all' || (patientFilter === 'alerts' && hasAlert) || (patientFilter === 'incomplete' && !patient.onboarded))
  }), [effectiveAlerts, effectivePatients, patientFilter, search])
  const activeAlerts = effectiveAlerts.filter((alert) => alert.status !== 'resolved')
  const unresolvedAcknowledged = effectiveAlerts.filter((alert) => alert.status === 'acknowledged' || alert.status === 'responding')
  const newRegistrations = effectivePatients.filter((patient) => {
    if (!patient.created_at) return false
    const age = Date.now() - Date.parse(patient.created_at)
    return age >= 0 && age <= 30 * dayMs
  }).length
  const acknowledgementDurations = effectiveAlerts.flatMap((alert) => {
    const acknowledgement = events
      .filter((event) => event.alert_id === alert.id && event.status === 'acknowledged')
      .sort((left, right) => Date.parse(left.created_at) - Date.parse(right.created_at))[0]
    return acknowledgement ? [Math.max(0, Date.parse(acknowledgement.created_at) - Date.parse(alert.created_at))] : []
  })
  const averageAcknowledgement = acknowledgementDurations.length
    ? `${Math.floor(acknowledgementDurations.reduce((total, duration) => total + duration, 0) / acknowledgementDurations.length / 60_000)} min`
    : 'Not available'
  const resolvedAlertCount = effectiveAlerts.filter((alert) => alert.status === 'resolved').length
  const alertCountForPatient = (id: string) => effectiveAlerts.filter((alert) => alert.patient_id === id && alert.status !== 'resolved').length
  const recentActivities = [
    ...events.map((event) => ({
      id: `response-${event.id}`,
      title: event.action,
      detail: `Alert ${event.alert_id.slice(0, 8)} · staff ${event.staff_user_id.slice(0, 8)}`,
      created_at: event.created_at,
    })),
    ...effectivePatients.flatMap((patient) => {
      const activityDate = patient.updated_at ?? patient.created_at
      return activityDate ? [{
        id: `patient-${patient.user_id}`,
        title: patient.updated_at && patient.created_at && Date.parse(patient.updated_at) > Date.parse(patient.created_at)
          ? `${patientName(patient)}'s health profile updated`
          : `${patientName(patient)} registered`,
        detail: `Patient ID ${patientId(patient.user_id)}`,
        created_at: activityDate,
      }] : []
    }),
  ].sort((left, right) => Date.parse(right.created_at) - Date.parse(left.created_at))

  const submitAuth = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!supabase) return
    setAuthBusy(true)
    setAuthError('')
    const result = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    if (result.error) setAuthError(result.error.message)
    setAuthBusy(false)
  }

  const signOut = async () => {
    if (!supabase || !user) return
    setError('')
    try {
      await signOutFromSupabase()
      setUser(null)
      setStaffClinic(null)
      setPatients([])
      setAlerts([])
      setEvents([])
      onSignedOut()
    } catch (error) {
      setError(error instanceof Error ? `Could not sign out: ${error.message}` : 'Could not sign out. Please try again.')
    }
  }

  const respondToAlert = async (alert: EmergencyAlert, status: AlertStatus) => {
    if (demoMode) {
      setMockAlerts((current) => current.map((item) => item.id === alert.id ? { ...item, status, handled_by: 'DEMO-STAFF', updated_at: new Date().toISOString() } : item))
      setEvents((current) => [{
        id: crypto.randomUUID(), alert_id: alert.id, staff_user_id: 'DEMO-STAFF',
        status, action: responseDrafts[alert.id]?.trim() || `Status changed to ${statusNames[status]}.`, created_at: new Date().toISOString(),
      }, ...current])
      setResponseDrafts((current) => ({ ...current, [alert.id]: '' }))
      setActionError('')
      return
    }
    if (!supabase || !user) return
    setActionError('')
    const action = responseDrafts[alert.id]?.trim() || `Status changed to ${statusNames[status]}.`
    const { error: responseError } = await supabase.rpc('respond_to_emergency_alert', {
      p_alert_id: alert.id,
      p_status: status,
      p_action: action,
    })
    if (responseError) {
      setActionError(`Could not update this alert: ${responseError.message}`)
      return
    }
    setResponseDrafts((current) => ({ ...current, [alert.id]: '' }))
    await loadDashboard(true)
  }

  const patientRow = (patient: Patient) => {
    const alertCount = alertCountForPatient(patient.user_id)
    return <tr key={patient.user_id} onClick={() => setSelectedPatientId(patient.user_id)} className="clinic-patient-row">
      <td><span className="clinic-person-cell"><span className="clinic-avatar"><UserRound size={18}/></span><span><strong>{patientName(patient)}</strong><small>{patientId(patient.user_id)}</small></span></span></td>
      <td>{display(patient.profile?.age)}{patient.profile?.age ? ' years' : ''}</td>
      <td>{display(patient.profile?.sex)}</td>
      <td>{dateTime(patient.created_at)}</td>
      <td>{alertCount ? <span className="clinic-alert-count"><Siren size={13}/>{alertCount} active</span> : <span className="clinic-muted">None</span>}</td>
      <td><span className={`clinic-account-pill ${patient.onboarded ? 'is-ready' : 'is-pending'}`}>{patient.onboarded ? 'Active' : 'Setup incomplete'}</span></td>
      <td><button className="clinic-open-button" onClick={(event) => { event.stopPropagation(); setSelectedPatientId(patient.user_id) }} aria-label={`Open ${patientName(patient)} profile`}><ChevronRight size={17}/></button></td>
    </tr>
  }

  const alertCard = (alert: EmergencyAlert) => {
    const patient = patientsById.get(alert.patient_id)
    const demoPatient = demoPatients.find((row) => row.user_id === alert.patient_id)
    const resolvedPatient = patient ?? demoPatient
    return <article className={`clinic-alert-card ${alert.status === 'new' ? 'is-new' : ''}`} key={alert.id}>
      <div className="clinic-alert-heading">
        <span className={tone(alert.status)}><span className="clinic-status-dot"/>{statusNames[alert.status]}</span>
        <span className="clinic-alert-time"><Clock3 size={14}/>{elapsed(alert.created_at, clock)} ago</span>
      </div>
      <button className="clinic-alert-patient" onClick={() => resolvedPatient && setSelectedPatientId(resolvedPatient.user_id)}>
        <span className="clinic-avatar clinic-avatar-alert"><UserRound size={19}/></span>
        <span><strong>{patientName(resolvedPatient)}</strong><small>Patient ID {patientId(alert.patient_id)} · {dateTime(alert.created_at)}</small></span>
        <ChevronRight size={18}/>
      </button>
      <p className="clinic-alert-reason">{alert.reason || 'No symptoms or reason provided.'}</p>
      {alert.location_shared && alert.latitude != null && alert.longitude != null
        ? <p className="clinic-alert-location"><MapPin size={14}/>{alert.latitude.toFixed(5)}, {alert.longitude.toFixed(5)} · shared by patient</p>
        : <p className="clinic-alert-no-location"><MapPin size={14}/>Patient location not shared</p>}
      <p className="clinic-alert-handler">{alert.handled_by ? `Assigned staff ID ${alert.handled_by.startsWith('DEMO-') ? alert.handled_by : alert.handled_by.slice(0, 8)}` : 'No staff member assigned'}</p>
      <div className="clinic-alert-actions">
        {alert.status === 'new' && <button className="clinic-button clinic-button-primary" onClick={() => void respondToAlert(alert, 'acknowledged')}><Check size={15}/>Acknowledge</button>}
        {(alert.status === 'new' || alert.status === 'acknowledged') && <button className="clinic-button clinic-button-secondary" onClick={() => void respondToAlert(alert, 'responding')}><Activity size={15}/>Responding</button>}
        {alert.status !== 'resolved' && <button className="clinic-button clinic-button-quiet" onClick={() => void respondToAlert(alert, 'resolved')}><CheckCircle2 size={15}/>Resolve</button>}
      </div>
        {events.filter((event) => event.alert_id === alert.id).length > 0 && <div className="clinic-response-history">
          <strong>Response history</strong>
          {events.filter((event) => event.alert_id === alert.id).map((event) => <p key={event.id}><span>{event.action}</span><small>{dateTime(event.created_at)} · staff {event.staff_user_id.slice(0, 8)}</small></p>)}
        </div>}
        {alert.status !== 'resolved' && <div className="clinic-response-entry">
          <label>Response note (optional)<textarea value={responseDrafts[alert.id] ?? ''} onChange={(event) => setResponseDrafts((current) => ({ ...current, [alert.id]: event.target.value }))} placeholder="Record the action taken by clinic staff…" rows={2}/></label>
          {actionError && <p className="clinic-inline-error" role="alert">{actionError}</p>}
        </div>}
    </article>
  }

  const patientDetail = selectedPatient && <aside className="clinic-detail-panel" aria-label="Patient profile">
    <div className="clinic-detail-head"><div><p className="clinic-eyebrow">PATIENT PROFILE</p><h2>{patientName(selectedPatient)}</h2><p>Patient ID {patientId(selectedPatient.user_id)}</p></div><button className="clinic-close" onClick={() => setSelectedPatientId('')} aria-label="Close patient profile">×</button></div>
    <div className="clinic-consent-note"><ShieldCheck size={16}/>Shared with this clinic by the patient. Patient-reported information is not a verified medical record.</div>
    <section className="clinic-detail-section"><h3><UserRound size={17}/>Personal information</h3><dl>
      <div><dt>Age</dt><dd>{display(selectedPatient.profile?.age)}</dd></div>
      <div><dt>Sex</dt><dd>{display(selectedPatient.profile?.sex)}</dd></div>
      <div><dt>Phone</dt><dd>{display(selectedPatient.profile?.phone ? `${selectedPatient.profile.phone}${selectedPatient.profile.country ? ` (${selectedPatient.profile.country})` : ''}` : undefined)}</dd></div>
      <div><dt>Registration date</dt><dd>{dateTime(selectedPatient.created_at)}</dd></div>
      <div><dt>Preferred language</dt><dd>{languageNames[String(selectedPatient.profile?.language ?? '')] ?? display(selectedPatient.profile?.language)}</dd></div>
      <div><dt>Account status</dt><dd>{selectedPatient.onboarded ? 'Onboarding complete' : 'Setup incomplete'}</dd></div>
      <div><dt>Last profile update</dt><dd>{dateTime(selectedPatient.updated_at)}</dd></div>
    </dl></section>
    <section className="clinic-detail-section"><h3><HeartPulse size={17}/>Health information</h3><dl>
      <div><dt>Known conditions</dt><dd>{displayConditions(selectedPatient.profile?.conditions)}</dd></div>
      <div><dt>Other conditions</dt><dd>{display(Array.isArray(selectedPatient.profile?.customConditions) && selectedPatient.profile.customConditions.length ? selectedPatient.profile.customConditions : selectedPatient.profile?.conditionOther)}</dd></div>
      <div><dt>Allergies</dt><dd>{display(selectedPatient.profile?.allergyText || selectedPatient.profile?.allergy)}</dd></div>
      <div><dt>Current medications</dt><dd>{display(selectedPatient.profile?.medicationText || selectedPatient.profile?.medication)}</dd></div>
      <div><dt>Current symptoms</dt><dd>{display(selectedPatient.profile?.symptomsNow)}</dd></div>
      <div><dt>Symptom details</dt><dd>{display(selectedPatient.profile?.symptomsText)}</dd></div>
      <div><dt>Recurring symptoms</dt><dd>{display(selectedPatient.profile?.recurringText || selectedPatient.profile?.recurring)}</dd></div>
      <div><dt>Health history and notes</dt><dd>{display(selectedPatient.profile?.notes)}</dd></div>
    </dl></section>
    <section className="clinic-detail-section"><h3><Users size={17}/>Trusted contacts</h3>
      {patientContacts(selectedPatient.profile).length ? patientContacts(selectedPatient.profile).map((contact, index) => <div className="clinic-contact-row" key={`${String(contact.name)}-${index}`}>
        <span><strong>{display(contact.name)}</strong><small>{display(contact.relationship)}</small></span>
        <span className="clinic-contact-phone">{display(contact.phone)}</span>
        <small>Emergency notification preference: {typeof contact.notifyOnEmergency === 'boolean' ? (contact.notifyOnEmergency ? 'Yes' : 'No') : typeof selectedPatient.profile?.notifyOnEmergency === 'boolean' ? (selectedPatient.profile.notifyOnEmergency ? 'Yes' : 'No') : 'Not provided'}</small>
      </div>) : <p className="clinic-empty-inline">No trusted contacts have been shared.</p>}
    </section>
    {effectiveAlerts.filter((alert) => alert.patient_id === selectedPatient.user_id).length > 0 && <section className="clinic-detail-section"><h3><Siren size={17}/>Emergency history</h3>
      {effectiveAlerts.filter((alert) => alert.patient_id === selectedPatient.user_id).map((alert) => <div className="clinic-history-row" key={alert.id}><span className={tone(alert.status)}>{statusNames[alert.status]}</span><span>{alert.reason || 'No reason provided'}<small>{dateTime(alert.created_at)} · {elapsed(alert.created_at, clock)} elapsed</small></span></div>)}
    </section>}
  </aside>

  if (!user && !demoMode) return <div className="clinic-auth-page">
    <div className="clinic-auth-card">
      <button className="clinic-return" onClick={onPatientApp}><ArrowDown size={15} className="clinic-return-arrow"/>Back to Iranwo</button>
      <div className="clinic-brand"><span><Hospital size={23}/></span><div><strong>Iranwo</strong><small>Clinic workspace</small></div></div>
      <p className="clinic-eyebrow">CLINIC STAFF ACCESS</p>
      <h1>Clinic staff sign in</h1>
      <p className="clinic-auth-intro">This portal is for clinic personnel with an account created and assigned by a clinic administrator. Patient accounts cannot register here.</p>
      {!supabase && <div className="clinic-message clinic-message-error"><AlertTriangle size={17}/>Supabase is not configured. You can preview the dashboard with clearly labeled mock records.</div>}
      {authError && <div className="clinic-message clinic-message-error" role="alert">{authError}</div>}
      {supabase && <form className="clinic-auth-form" onSubmit={(event) => void submitAuth(event)}>
        <label>Email address<input type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)}/></label>
        <label>Password<input type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)}/></label>
        <button className="clinic-button clinic-button-primary clinic-auth-submit" type="submit" disabled={authBusy}>{authBusy ? 'Please wait…' : 'Sign in'}<ChevronRight size={17}/></button>
      </form>}
      <div className="clinic-auth-security"><ShieldCheck size={17}/><span>Clinic administrators create staff accounts and assign clinic membership separately. Signing in without an active assignment and patient consent reveals no patient records.</span></div>
      <button className="clinic-demo-link" onClick={() => { setMockAlerts(demoAlerts); setEvents([]); setDemoMode(true); setSection('overview'); setLoading(false) }}>Preview the dashboard with mock data</button>
    </div>
  </div>

  const nav: { id: Section; label: string; icon: typeof Activity }[] = [
    { id: 'overview', label: 'Overview', icon: Activity },
    { id: 'patients', label: 'Patients', icon: Users },
    { id: 'alerts', label: 'Emergency alerts', icon: Siren },
    { id: 'activity', label: 'Activity history', icon: FileText },
  ]
  return <div className="clinic-app">
    <aside className="clinic-sidebar">
      <button className="clinic-brand clinic-sidebar-brand" onClick={() => setSection('overview')}><span><Hospital size={22}/></span><div><strong>Iranwo</strong><small>Clinic workspace</small></div></button>
      <div className="clinic-sidebar-label">WORKSPACE</div>
      <nav className="clinic-sidebar-nav" aria-label="Clinic dashboard sections">
        {nav.map(({ id, label, icon: Icon }) => <button key={id} onClick={() => { setSection(id); setSelectedPatientId('') }} className={section === id ? 'selected' : ''}><Icon size={18}/><span>{label}</span>{id === 'alerts' && activeAlerts.length > 0 && <b>{activeAlerts.length}</b>}</button>)}
      </nav>
      <div className="clinic-sidebar-bottom">
        <div className="clinic-sidebar-safety"><ShieldCheck size={17}/><span>Records are restricted to clinic staff with patient permission.</span></div>
        <button className="clinic-back-patient" onClick={onPatientApp}><HeartPulse size={17}/>Patient app</button>
        {demoMode ? <button className="clinic-signout" onClick={() => setDemoMode(false)}><LogOut size={17}/>Exit demo</button> : <button className="clinic-signout" onClick={() => void signOut()}><LogOut size={17}/>Sign out</button>}
      </div>
    </aside>
    <main className="clinic-main">
      <header className="clinic-topbar"><div><span className="clinic-topbar-mobile-brand"><Hospital size={19}/>Iranwo</span><p>{staffClinic?.care_clinics?.name ?? (demoMode ? 'Demo Community Clinic' : 'Clinic workspace')}</p></div><div className="clinic-top-actions"><span className="clinic-secure-label"><ShieldCheck size={15}/>{demoMode ? 'Mock data' : 'Secure workspace'}</span><button className={`clinic-sound-toggle ${soundEnabled ? 'is-on' : ''}`} onClick={() => { setSoundEnabled((enabled) => !enabled); if (!soundEnabled) playAlertTone() }} title={soundEnabled ? 'Mute new alert sound' : 'Enable new alert sound'}>{soundEnabled ? <Volume2 size={17}/> : <VolumeX size={17}/>}<span>{soundEnabled ? 'Sound on' : 'Sound off'}</span></button><button className="clinic-refresh" onClick={() => void loadDashboard()} disabled={loading}><Wifi size={16}/><span>Refresh</span></button></div></header>
      {demoMode && <div className="clinic-demo-banner"><AlertTriangle size={17}/><span><strong>DEMO MODE —</strong> every patient, alert, contact, and response below is fabricated for presentation. No real patient record is shown.</span></div>}
      {error && !demoMode && <div className="clinic-message clinic-message-error" role="alert"><AlertTriangle size={17}/>{error}<button onClick={() => void loadDashboard()}>Retry</button></div>}
      {loading && !demoMode ? <div className="clinic-loading"><span className="clinic-spinner"/><strong>Loading authorized clinic records…</strong><small>Only records shared with this clinic will be available.</small></div> : !staffClinic && !demoMode && user ? <section className="clinic-access-pending"><ShieldCheck size={32}/><h1>Clinic access not assigned</h1><p>{error || 'A clinic administrator must activate your staff membership before patient records can be viewed.'}</p><p>Signing in does not grant clinic membership. No patient information is available to this account.</p><button className="clinic-button clinic-button-secondary" onClick={() => void signOut()}>Sign out</button></section> : <>
        <div className="clinic-page-heading"><div><p className="clinic-eyebrow">{section === 'alerts' ? 'URGENT RESPONSE WORKSPACE' : section === 'patients' ? 'AUTHORIZED PATIENT DIRECTORY' : section === 'activity' ? 'AUDIT TRAIL' : 'CARE OPERATIONS'}</p><h1>{nav.find((item) => item.id === section)?.label}</h1><p>{section === 'alerts' ? 'Review incoming patient alerts and record clinic response actions.' : section === 'patients' ? 'Search patient records explicitly shared with this clinic.' : section === 'activity' ? 'Response history from actual recorded alert events.' : 'Patient and emergency activity from records currently available to this clinic.'}</p></div><div className="clinic-heading-status"><span className="clinic-live-indicator"/>{demoMode ? 'Simulation' : 'Access controlled'}</div></div>
        {section === 'overview' && <section className="clinic-overview">
          <div className="clinic-stat-grid">
            <article className="clinic-stat-card"><span className="clinic-stat-icon"><Users size={19}/></span><span className="clinic-stat-label">Patients shared</span><strong>{effectivePatients.length}</strong><small>Visible to this clinic</small></article>
            <article className="clinic-stat-card"><span className="clinic-stat-icon clinic-stat-icon-green"><ArrowUp size={19}/></span><span className="clinic-stat-label">New registrations</span><strong>{newRegistrations}</strong><small>Last 30 days · available records</small></article>
            <article className={`clinic-stat-card ${activeAlerts.length ? 'clinic-stat-emergency' : ''}`}><span className="clinic-stat-icon clinic-stat-icon-red"><Siren size={19}/></span><span className="clinic-stat-label">Active emergencies</span><strong>{activeAlerts.length}</strong><small>Unresolved patient alerts</small></article>
            <article className="clinic-stat-card"><span className="clinic-stat-icon clinic-stat-icon-amber"><Clock3 size={19}/></span><span className="clinic-stat-label">Acknowledged / responding</span><strong>{unresolvedAcknowledged.length}</strong><small>Still unresolved</small></article>
          </div>
          <div className="clinic-overview-grid">
            <section className="clinic-content-card clinic-overview-alerts"><div className="clinic-card-heading"><div><h2><Siren size={18}/>Emergency monitoring</h2><p>Incoming and unresolved alerts</p></div><button className="clinic-text-action" onClick={() => setSection('alerts')}>View all <ChevronRight size={15}/></button></div>
              {activeAlerts.length ? <div className="clinic-alert-list">{activeAlerts.slice(0, 3).map(alertCard)}</div> : <div className="clinic-empty"><CheckCircle2 size={24}/><strong>No active emergency alerts</strong><span>New alerts will appear here when a patient shares one with your clinic.</span></div>}
            </section>
            <section className="clinic-content-card"><div className="clinic-card-heading"><div><h2><Activity size={18}/>Recent activity</h2><p>Profile updates and recorded responses</p></div><button className="clinic-text-action" onClick={() => setSection('activity')}>History <ChevronRight size={15}/></button></div>
              {recentActivities.length ? <div className="clinic-activity-list">{recentActivities.slice(0, 5).map((activity) => <div className="clinic-activity-row" key={activity.id}><span className="clinic-activity-icon"><CheckCircle2 size={15}/></span><div><strong>{activity.title}</strong><small>{activity.detail}</small></div><time>{dateTime(activity.created_at)}</time></div>)}</div> : <div className="clinic-empty clinic-empty-compact"><Activity size={22}/><strong>No recent patient activity</strong><span>Activity appears when a patient shares a profile or staff records a response.</span></div>}
            </section>
          </div>
          <section className="clinic-metrics-row">
            <div><span>Average first acknowledgement</span><strong>{averageAcknowledgement}</strong><small>{acknowledgementDurations.length ? `From ${acknowledgementDurations.length} recorded alert${acknowledgementDurations.length === 1 ? '' : 's'}` : 'No acknowledgement records available'}</small></div>
            <div><span>Alerts resolved</span><strong>{resolvedAlertCount}</strong><small>{effectiveAlerts.length ? `Of ${effectiveAlerts.length} recorded alert${effectiveAlerts.length === 1 ? '' : 's'}` : 'No emergency alert records available'}</small></div>
          </section>
          <section className="clinic-content-card clinic-recent-patients"><div className="clinic-card-heading"><div><h2><Users size={18}/>Recent patients</h2><p>Most recently registered shared profiles</p></div><button className="clinic-text-action" onClick={() => setSection('patients')}>Patient directory <ChevronRight size={15}/></button></div>
            <div className="clinic-table-wrap"><table className="clinic-table"><thead><tr><th>Patient</th><th>Age</th><th>Sex</th><th>Registered</th><th>Emergency</th><th>Account</th><th/></tr></thead><tbody>{effectivePatients.slice(0, 5).map(patientRow)}</tbody></table></div>
          </section>
        </section>}
        {section === 'patients' && <section className="clinic-content-card clinic-patients-page">
          <div className="clinic-directory-tools"><label className="clinic-search"><Search size={17}/><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name or patient ID"/></label><select value={patientFilter} onChange={(event) => setPatientFilter(event.target.value)} aria-label="Filter patient directory"><option value="all">All shared patients</option><option value="alerts">Active emergency alerts</option><option value="incomplete">Setup incomplete</option></select></div>
          {loading && !demoMode ? <div className="clinic-empty"><span className="clinic-spinner"/><strong>Loading authorized patients…</strong></div> : filteredPatients.length ? <div className="clinic-table-wrap"><table className="clinic-table"><thead><tr><th>Patient</th><th>Age</th><th>Sex</th><th>Registered</th><th>Emergency</th><th>Account</th><th/></tr></thead><tbody>{filteredPatients.map(patientRow)}</tbody></table></div> : <div className="clinic-empty"><Users size={25}/><strong>No matching patient records</strong><span>Only patient profiles with an active clinic-sharing grant appear here. Local browser profiles are not visible to clinic staff.</span></div>}
          <p className="clinic-data-note"><ShieldCheck size={15}/>Patient records are returned by Supabase Row Level Security only when this clinic has an active patient permission grant.</p>
        </section>}
        {section === 'alerts' && <section className="clinic-alerts-page">
          <div className="clinic-alerts-summary"><div><Bell size={18}/><strong>{activeAlerts.length} active</strong><span>New: {effectiveAlerts.filter((alert) => alert.status === 'new').length}</span><span>Unresolved acknowledged: {unresolvedAcknowledged.length}</span></div><p>Enable sound to hear a short tone when a new alert appears. This does not contact emergency services.</p></div>
          {actionError && <div className="clinic-message clinic-message-error" role="alert">{actionError}</div>}
          {effectiveAlerts.length ? <div className="clinic-alert-list clinic-alerts-full">{effectiveAlerts.map(alertCard)}</div> : <div className="clinic-content-card clinic-empty"><CheckCircle2 size={26}/><strong>No emergency alerts recorded</strong><span>Alerts will be listed once patients explicitly share them with this clinic.</span></div>}
          <p className="clinic-data-note"><AlertTriangle size={15}/>No ambulance, emergency service, or trusted contact is contacted by this dashboard. Follow your clinic's verified emergency protocol.</p>
        </section>}
        {section === 'activity' && <section className="clinic-content-card clinic-activity-page">
          <div className="clinic-card-heading"><div><h2><FileText size={18}/>Patient and response activity</h2><p>Profile timestamps and actions actually recorded for this clinic</p></div></div>
          {recentActivities.length ? <div className="clinic-activity-list clinic-activity-full">{recentActivities.map((activity) => <div className="clinic-activity-row" key={activity.id}><span className="clinic-activity-icon"><CheckCircle2 size={15}/></span><div><strong>{activity.title}</strong><small>{activity.detail}</small></div><time>{dateTime(activity.created_at)}</time></div>)}</div> : <div className="clinic-empty"><Activity size={25}/><strong>No patient or response activity available</strong><span>Response statistics are not estimated when no actual response records exist.</span></div>}
          <p className="clinic-data-note"><Clock3 size={15}/>Response time statistics are based on recorded acknowledgement events only. Profile activity is derived from cloud profile timestamps.</p>
        </section>}
      </>}
    </main>
    {patientDetail}
  </div>
}
