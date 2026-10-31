import { useCallback, useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Activity, AlertTriangle, ArrowUpRight, Check, Clock3, LogIn, LogOut, MapPin, Phone, RefreshCw, ShieldCheck, Stethoscope } from 'lucide-react'
import { getSupabaseClient, isSupabaseConfigured } from '../../lib/supabase'
import { updateEmergencyRequestStatus, type EmergencyRequest, type EmergencyRequestStatus } from '../emergency/emergencyRequests'
import './ClinicDashboard.css'

type Membership = { clinic_id: string; role: 'admin' | 'clinician' | 'dispatcher'; membership_status: 'pending' | 'active' | 'suspended' }
type Clinic = { id: string; name: string; address: string; phone_number: string | null }

const statusLabels: Record<EmergencyRequestStatus, string> = {
  submitted: 'New request',
  acknowledged: 'Acknowledged',
  accepted: 'Accepted by staff',
  in_progress: 'In progress',
  resolved: 'Resolved',
  unable_to_respond: 'Unable to respond',
  cancelled: 'Cancelled by patient',
}

const formatTime = (value: string) => new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium', timeStyle: 'short',
}).format(new Date(value))

export default function ClinicDashboard() {
  if (!isSupabaseConfigured()) {
    return <main className="clinic-portal-shell"><section className="clinic-login-card"><h1>Backend not configured</h1><p className="clinic-muted">Add VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY to your environment, then restart the app.</p></section></main>
  }
  return <ConfiguredClinicDashboard />
}

function ConfiguredClinicDashboard() {
  const supabase = getSupabaseClient()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [userId, setUserId] = useState<string | null>(null)
  const [memberships, setMemberships] = useState<Membership[]>([])
  const [clinics, setClinics] = useState<Clinic[]>([])
  const [requests, setRequests] = useState<EmergencyRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [signingIn, setSigningIn] = useState(false)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [filter, setFilter] = useState<'open' | 'all'>('open')

  const activeMemberships = useMemo(() => memberships.filter(item => item.membership_status === 'active'), [memberships])
  const clinicIds = useMemo(() => activeMemberships.map(item => item.clinic_id), [activeMemberships])
  const staffRole = activeMemberships.some(item => item.role === 'admin')
    ? 'admin'
    : activeMemberships.some(item => item.role === 'clinician') ? 'clinician' : 'dispatcher'

  const loadDashboard = useCallback(async () => {
    setError('')
    const { data: authData, error: authError } = await supabase.auth.getUser()
    if (authError) throw authError
    const user = authData.user
    setUserId(user?.id ?? null)
    if (!user) {
      setMemberships([])
      setClinics([])
      setRequests([])
      setLoading(false)
      return
    }

    const { data: membershipData, error: membershipError } = await supabase
      .from('clinic_staff')
      .select('clinic_id, role, membership_status')
      .eq('user_id', user.id)
    if (membershipError) throw membershipError

    const membershipsFound = (membershipData ?? []) as Membership[]
    setMemberships(membershipsFound)
    const activeIds = membershipsFound.filter(item => item.membership_status === 'active').map(item => item.clinic_id)

    if (activeIds.length === 0) {
      setClinics([])
      setRequests([])
      setLoading(false)
      return
    }

    const [{ data: clinicData, error: clinicError }, { data: requestData, error: requestError }] = await Promise.all([
      supabase.from('clinics').select('id, name, address, phone_number').in('id', activeIds),
      supabase.from('emergency_requests').select('*').in('clinic_id', activeIds).order('created_at', { ascending: false }).limit(100),
    ])
    if (clinicError) throw clinicError
    if (requestError) throw requestError
    setClinics((clinicData ?? []) as Clinic[])
    setRequests((requestData ?? []) as EmergencyRequest[])
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    let mounted = true
    const start = async () => {
      try {
        await loadDashboard()
      } catch (loadError) {
        if (mounted) setError(loadError instanceof Error ? loadError.message : 'Unable to load the clinic dashboard.')
      } finally {
        if (mounted) setLoading(false)
      }
    }
    void start()
    const { data } = supabase.auth.onAuthStateChange(() => {
      window.setTimeout(() => { if (mounted) void loadDashboard().catch(loadError => setError(loadError instanceof Error ? loadError.message : 'Unable to refresh session.')) }, 0)
    })
    return () => {
      mounted = false
      data.subscription.unsubscribe()
    }
  }, [loadDashboard, supabase])

  useEffect(() => {
    if (clinicIds.length === 0) return
    const channel = supabase
      .channel(`clinic-dashboard-${clinicIds.join('-')}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'emergency_requests' }, () => {
        // Re-fetch as the source of truth; Realtime events are notifications, not guaranteed dispatch.
        void loadDashboard().catch(loadError => setError(loadError instanceof Error ? loadError.message : 'Unable to refresh requests.'))
      })
      .subscribe()
    return () => { void supabase.removeChannel(channel) }
  }, [clinicIds, loadDashboard, supabase])

  const handleSignIn = async (event: FormEvent) => {
    event.preventDefault()
    setSigningIn(true)
    setError('')
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password })
      if (signInError) throw signInError
      setPassword('')
      await loadDashboard()
    } catch (signInError) {
      setError(signInError instanceof Error ? signInError.message : 'Unable to sign in.')
    } finally {
      setSigningIn(false)
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    setUserId(null)
    setMemberships([])
    setClinics([])
    setRequests([])
  }

  const changeStatus = async (requestId: string, nextStatus: EmergencyRequestStatus) => {
    setUpdatingId(requestId)
    setError('')
    setNotice('')
    try {
      await updateEmergencyRequestStatus(requestId, nextStatus)
      setNotice(`Request updated: ${statusLabels[nextStatus]}.`)
      await loadDashboard()
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'Unable to update request status.')
    } finally {
      setUpdatingId(null)
    }
  }

  const clinicById = useMemo(() => new Map(clinics.map(clinic => [clinic.id, clinic])), [clinics])
  const visibleRequests = requests.filter(request => filter === 'all' || !['resolved', 'unable_to_respond', 'cancelled'].includes(request.status))

  if (!userId && !loading) {
    return <main className="clinic-portal-shell">
      <section className="clinic-login-card">
        <div className="clinic-brand"><span><Stethoscope size={22}/></span><div><strong>iranwo.</strong><small>Clinic response portal</small></div></div>
        <h1>Staff sign in</h1>
        <p className="clinic-muted">Access is limited to staff accounts provisioned by the Iranwo platform administrator. There is no public staff registration.</p>
        <form onSubmit={handleSignIn} className="clinic-login-form">
          <label>Email address<input type="email" autoComplete="username" required value={email} onChange={event => setEmail(event.target.value)}/></label>
          <label>Password<input type="password" autoComplete="current-password" required minLength={8} value={password} onChange={event => setPassword(event.target.value)}/></label>
          {error && <p className="clinic-error" role="alert">{error}</p>}
          <button type="submit" disabled={signingIn}>{signingIn ? 'Signing in…' : 'Sign in'} <LogIn size={17}/></button>
        </form>
        <p className="clinic-security-note"><ShieldCheck size={16}/> Patient health details are shown only when the patient shared them for that request.</p>
      </section>
    </main>
  }

  return <main className="clinic-portal-shell">
    <header className="clinic-dashboard-header">
      <div className="clinic-brand"><span><Stethoscope size={22}/></span><div><strong>iranwo.</strong><small>Clinic response portal</small></div></div>
      <div className="clinic-header-actions">
        <span className="clinic-role-chip">{staffRole}</span>
        <button onClick={() => void loadDashboard()} title="Refresh requests"><RefreshCw size={17}/> Refresh</button>
        <button onClick={() => void handleSignOut()} title="Sign out"><LogOut size={17}/> Sign out</button>
      </div>
    </header>

    <section className="clinic-dashboard-content">
      <div className="clinic-dashboard-title">
        <div><p className="clinic-eyebrow">RESPONSE WORKSPACE</p><h1>Emergency requests</h1><p className="clinic-muted">Only requests sent to your verified clinic memberships appear here.</p></div>
        <div className="clinic-live-indicator"><span/> Live updates enabled</div>
      </div>

      {error && <div className="clinic-alert clinic-alert-error" role="alert"><AlertTriangle size={18}/>{error}</div>}
      {notice && <div className="clinic-alert clinic-alert-success" role="status"><Check size={18}/>{notice}</div>}

      {memberships.length === 0 && !loading ? <div className="clinic-empty-state"><ShieldCheck size={30}/><h2>No clinic access has been assigned</h2><p>Your account is signed in, but it is not linked to an active verified clinic. Ask the Iranwo platform administrator to verify your staff identity and provision your clinic membership.</p></div> : null}
      {memberships.some(item => item.membership_status === 'pending') && activeMemberships.length === 0 && <div className="clinic-alert"><Clock3 size={18}/> Your clinic membership is pending administrator activation.</div>}

      <div className="clinic-metrics">
        <article><span className="metric-icon metric-red"><AlertTriangle size={18}/></span><div><strong>{requests.filter(item => ['submitted', 'acknowledged'].includes(item.status) && item.urgency === 'emergency').length}</strong><small>Emergency awaiting action</small></div></article>
        <article><span className="metric-icon metric-amber"><Clock3 size={18}/></span><div><strong>{requests.filter(item => ['submitted', 'acknowledged'].includes(item.status)).length}</strong><small>Awaiting acceptance</small></div></article>
        <article><span className="metric-icon metric-green"><Activity size={18}/></span><div><strong>{requests.filter(item => ['accepted', 'in_progress'].includes(item.status)).length}</strong><small>Accepted / in progress</small></div></article>
      </div>

      <div className="clinic-request-toolbar">
        <div><h2>Request queue</h2><p>{requests.length} recent request{requests.length === 1 ? '' : 's'}</p></div>
        <div className="clinic-filter-tabs"><button className={filter === 'open' ? 'active' : ''} onClick={() => setFilter('open')}>Open</button><button className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>All</button></div>
      </div>

      {loading ? <div className="clinic-loading">Loading clinic requests…</div> : visibleRequests.length === 0 ? <div className="clinic-empty-state"><Check size={26}/><h2>No requests in this view</h2><p>New patient-submitted requests will appear here when your clinic is verified and accepting requests.</p></div> : <div className="clinic-request-list">
        {visibleRequests.map(request => {
          const clinic = clinicById.get(request.clinic_id)
          const canAcknowledge = ['submitted'].includes(request.status)
          const requestRole = activeMemberships.find(item => item.clinic_id === request.clinic_id)?.role ?? 'dispatcher'
          const canAccept = ['submitted', 'acknowledged'].includes(request.status) && requestRole !== 'dispatcher'
          const isAssignedToOther = Boolean(request.assigned_staff_id && request.assigned_staff_id !== userId && requestRole !== 'admin')
          const canProgress = ['accepted'].includes(request.status) && (!isAssignedToOther)
          const canResolve = ['accepted', 'in_progress'].includes(request.status) && (!isAssignedToOther) && requestRole !== 'dispatcher'
          const closed = ['resolved', 'unable_to_respond', 'cancelled'].includes(request.status)
          return <article className={`clinic-request-card urgency-${request.urgency}`} key={request.id}>
            <div className="clinic-request-topline">
              <span className={`clinic-urgency ${request.urgency}`}>{request.urgency === 'emergency' ? 'Emergency' : 'Urgent'}</span>
              <span className={`clinic-status status-${request.status}`}>{statusLabels[request.status]}</span>
              <time>{formatTime(request.created_at)}</time>
            </div>
            <div className="clinic-request-heading"><div><h3>{request.share_contact_details ? request.patient_name_snapshot : 'Patient identity withheld'}</h3><p>{clinic?.name ?? 'Your clinic'} · Request {request.id.slice(0, 8).toUpperCase()}</p></div></div>
            <div className="clinic-reported-text">{request.reported_text}</div>

            {request.share_contact_details && request.patient_phone_snapshot && <div className="clinic-request-contact"><Phone size={16}/><a href={`tel:${request.patient_phone_snapshot}`}>{request.patient_phone_snapshot}</a><span>Shared for this request</span></div>}
            {request.share_health_context && request.health_context_snapshot && <details className="clinic-context-details"><summary>Patient context shared for this request</summary><div className="clinic-context-grid">
              {request.health_context_snapshot.age_years != null && <span><small>Age</small><strong>{request.health_context_snapshot.age_years}</strong></span>}
              {request.health_context_snapshot.sex && <span><small>Sex</small><strong>{request.health_context_snapshot.sex}</strong></span>}
              {request.health_context_snapshot.conditions?.length ? <span className="full"><small>Existing conditions</small><strong>{request.health_context_snapshot.conditions.join(', ')}</strong></span> : null}
              {request.health_context_snapshot.custom_conditions?.length ? <span className="full"><small>Other conditions</small><strong>{request.health_context_snapshot.custom_conditions.join(', ')}</strong></span> : null}
              {request.health_context_snapshot.health_notes && <span className="full"><small>Additional notes</small><strong>{request.health_context_snapshot.health_notes}</strong></span>}
            </div></details>}
            {request.share_location && request.latitude != null && request.longitude != null && <a className="clinic-location-link" href={`https://www.google.com/maps?q=${request.latitude},${request.longitude}`} target="_blank" rel="noreferrer"><MapPin size={16}/> Open shared location <ArrowUpRight size={14}/></a>}
            <div className="clinic-request-footer"><span className="clinic-response-note">{request.assigned_staff_id ? 'Assigned to a staff member' : 'Not yet assigned'}</span>
              {!closed && <div className="clinic-actions">
                {canAcknowledge && <button disabled={updatingId === request.id} onClick={() => void changeStatus(request.id, 'acknowledged')}>Acknowledge</button>}
                {canAccept && !isAssignedToOther && <button className="primary" disabled={updatingId === request.id} onClick={() => void changeStatus(request.id, 'accepted')}>Accept request</button>}
                {canProgress && <button className="primary" disabled={updatingId === request.id} onClick={() => void changeStatus(request.id, 'in_progress')}>Start care</button>}
                {canResolve && <button disabled={updatingId === request.id} onClick={() => void changeStatus(request.id, 'resolved')}>Mark resolved</button>}
                {['submitted', 'acknowledged'].includes(request.status) && <button className="quiet-danger" disabled={updatingId === request.id} onClick={() => void changeStatus(request.id, 'unable_to_respond')}>Unable to respond</button>}
              </div>}
            </div>
          </article>
        })}
      </div>}
      <p className="clinic-footnote"><ShieldCheck size={15}/> A request marked “submitted” has reached the system, not necessarily a staff member. Only “accepted by staff” confirms that an authorized staff account accepted responsibility in this dashboard. Realtime can reconnect or miss events; refresh the queue for the current database state.</p>
    </section>
  </main>
}
