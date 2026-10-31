import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { AlertTriangle, CheckCircle2, Send, ShieldCheck, UserRound, Building2, Phone } from 'lucide-react'
import { createPatientAccount, signInPatient, signOutPatient } from '../auth/auth.service'
import { getSupabaseClient, isSupabaseConfigured } from '../../lib/supabase'
import {
  getEmergencyRequest,
  getMyEmergencyRequests,
  getVerifiedClinics,
  subscribeToEmergencyRequest,
  submitEmergencyRequest,
  updateEmergencyRequestStatus,
  type EmergencyRequest,
  type EmergencyRequestStatus,
  type EmergencyUrgency,
  type VerifiedClinic,
} from './emergencyRequests'
import './EmergencyRequestPanel.css'

type PatientProfileForRequest = {
  name: string
  age: string
  sex: string
  language: string
  country: string
  phoneE164: string
  conditions: string[]
  customConditions?: string[]
  notes: string
}

type Props = {
  profile: PatientProfileForRequest
  reportedText: string
  urgency: EmergencyUrgency
  source: 'safety_engine' | 'manual_sos'
  matchedRuleCodes: string[]
}

const statusLabel: Record<EmergencyRequestStatus, string> = {
  submitted: 'Submitted to Iranwo',
  acknowledged: 'Clinic acknowledged the request',
  accepted: 'Accepted by clinic staff',
  in_progress: 'Clinic marked care as in progress',
  resolved: 'Clinic marked the request resolved',
  unable_to_respond: 'Clinic reported it cannot respond',
  cancelled: 'Request cancelled',
}

function getLocation(): Promise<{ latitude: number; longitude: number; accuracy: number | null }> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('This browser does not support location sharing. You can turn off location sharing and submit without it.'))
      return
    }
    navigator.geolocation.getCurrentPosition(
      position => resolve({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: Number.isFinite(position.coords.accuracy) ? position.coords.accuracy : null,
      }),
      () => reject(new Error('Location permission was not granted or the location could not be read. Turn off location sharing to continue without it.')),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 },
    )
  })
}

export default function EmergencyRequestPanel({ profile, reportedText, urgency, source, matchedRuleCodes }: Props) {
  const [clinics, setClinics] = useState<VerifiedClinic[]>([])
  const [clinicId, setClinicId] = useState('')
  const [loadingClinics, setLoadingClinics] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin')
  const [authBusy, setAuthBusy] = useState(false)
  const [authNotice, setAuthNotice] = useState('')
  const [authError, setAuthError] = useState('')
  const [requestText, setRequestText] = useState(reportedText)
  const [confirmRequest, setConfirmRequest] = useState(false)
  const [shareContactDetails, setShareContactDetails] = useState(false)
  const [shareHealthContext, setShareHealthContext] = useState(false)
  const [shareLocation, setShareLocation] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [submittedRequest, setSubmittedRequest] = useState<EmergencyRequest | null>(null)
  const [myRequests, setMyRequests] = useState<EmergencyRequest[]>([])
  const [requestId, setRequestId] = useState('')
  const selectedClinic = clinics.find(clinic => clinic.id === clinicId) ?? null

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setAuthError('Supabase is not configured yet. Complete the backend setup before submitting clinic requests.')
      setLoadingClinics(false)
      return
    }
    let active = true
    const client = getSupabaseClient()
    void client.auth.getUser().then(({ data: auth, error }) => {
      if (error) throw error
      if (active) setUserId(auth.user?.id ?? null)
    }).catch(loadError => {
      if (active) setAuthError(loadError instanceof Error ? loadError.message : 'Unable to check your session.')
    })
    const { data } = client.auth.onAuthStateChange((_event, session) => {
      window.setTimeout(() => { if (active) setUserId(session?.user.id ?? null) }, 0)
    })
    return () => { active = false; data.subscription.unsubscribe() }
  }, [])

  useEffect(() => {
    if (!userId || !isSupabaseConfigured()) {
      setClinics([])
      setLoadingClinics(false)
      return
    }
    let active = true
    setLoadingClinics(true)
    void getVerifiedClinics().then(clinicRows => {
      if (!active) return
      setClinics(clinicRows)
      setClinicId(current => current || clinicRows[0]?.id || '')
    }).catch(loadError => {
      if (active) setSubmitError(loadError instanceof Error ? loadError.message : 'Unable to load verified clinics.')
    }).finally(() => { if (active) setLoadingClinics(false) })
    return () => { active = false }
  }, [userId])

  useEffect(() => {
    setRequestText(reportedText)
    setSubmittedRequest(null)
    setRequestId('')
  }, [reportedText, matchedRuleCodes.join('|')])

  useEffect(() => {
    if (!userId || !isSupabaseConfigured()) {
      setMyRequests([])
      setSubmittedRequest(null)
      setRequestId('')
      return
    }
    let active = true
    const refreshRequests = async () => {
      try {
        const rows = await getMyEmergencyRequests()
        if (active) setMyRequests(rows)
        const latest = rows[0]
        if (latest && !requestId) {
          // Keep the latest request visible after a reload without changing its status.
          setSubmittedRequest(latest)
        }
      } catch (loadError) {
        if (active) setSubmitError(loadError instanceof Error ? loadError.message : 'Unable to load your recent requests.')
      }
    }
    void refreshRequests()
    const client = getSupabaseClient()
    const channel = client.channel(`patient-emergency-requests-${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'emergency_requests', filter: `patient_id=eq.${userId}` }, () => {
        void refreshRequests()
      })
      .subscribe()
    return () => {
      active = false
      void client.removeChannel(channel)
    }
  }, [userId, requestId])

  useEffect(() => {
    if (!requestId) return
    let active = true
    const refresh = async () => {
      try {
        const request = await getEmergencyRequest(requestId)
        if (active) setSubmittedRequest(request)
      } catch (loadError) {
        if (active) setSubmitError(loadError instanceof Error ? loadError.message : 'Unable to refresh request status.')
      }
    }
    void refresh()
    const unsubscribe = subscribeToEmergencyRequest(requestId, () => { void refresh() })
    return () => { active = false; unsubscribe() }
  }, [requestId])

  const authenticate = async (event: FormEvent) => {
    event.preventDefault()
    setAuthBusy(true)
    setAuthError('')
    setAuthNotice('')
    try {
      if (authMode === 'signup') {
        const result = await createPatientAccount({ email, password })
        if (!result.session) {
          setAuthNotice('Account created. Check your email for the confirmation link, then return here and sign in.')
          setAuthMode('signin')
        } else {
          setUserId(result.user?.id ?? null)
          setAuthNotice('Your account is ready. Review the sharing choices below before sending a request.')
        }
      } else {
        const result = await signInPatient({ email, password })
        setUserId(result.user.id)
        setAuthNotice('You are signed in. Review the sharing choices below before sending a request.')
      }
      setPassword('')
    } catch (authFailure) {
      setAuthError(authFailure instanceof Error ? authFailure.message : 'Unable to authenticate.')
    } finally {
      setAuthBusy(false)
    }
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setSubmitError('')
    if (!userId) {
      setSubmitError('Sign in before sending a clinic request.')
      return
    }
    if (!profile.name.trim() || !profile.phoneE164.trim()) {
      setSubmitError('Add your full name and phone number in Profile & settings before sending a clinic request.')
      return
    }
    if (!clinicId) {
      setSubmitError('No verified clinic is currently accepting requests through Iranwo.')
      return
    }
    if (!confirmRequest || !shareContactDetails) {
      setSubmitError('Confirm the request and agree to share your name and phone number with the selected clinic.')
      return
    }
    if (!requestText.trim()) {
      setSubmitError('Describe what is happening before sending the request.')
      return
    }

    setSubmitting(true)
    try {
      // The account/profile upsert occurs only after the user checks the required request/contact consent.
      const client = getSupabaseClient()
      const { error: profileError } = await client.from('profiles').upsert({
        id: userId,
        full_name: profile.name.trim(),
        phone_number: profile.phoneE164.trim(),
        country_code: profile.country,
        preferred_language: profile.language as 'en' | 'yo' | 'pcm' | 'ha' | 'ig',
        onboarding_completed: true,
      })
      if (profileError) throw profileError

      const location = shareLocation ? await getLocation() : null
      const context = shareHealthContext ? {
        age: profile.age ? Number(profile.age) : null,
        sex: profile.sex || null,
        conditions: profile.conditions,
        customConditions: profile.customConditions ?? [],
        notes: profile.notes,
      } : null

      const result = await submitEmergencyRequest({
        idempotencyKey: crypto.randomUUID(),
        clinicId,
        urgency,
        source,
        reportedText: requestText.trim(),
        matchedRuleCodes,
        confirmRequest: true,
        shareContactDetails: true,
        shareHealthContext,
        healthContext: context,
        shareLocation,
        location,
      })
      setRequestId(result.requestId)
      const latestRequest = await getEmergencyRequest(result.requestId)
      if (latestRequest) setSubmittedRequest(latestRequest)
      setAuthNotice(`Your request was submitted to ${result.clinicName}. It has not yet been accepted by a staff member.`)
      setConfirmRequest(false)
    } catch (failure) {
      setSubmitError(failure instanceof Error ? failure.message : 'Unable to submit your request.')
    } finally {
      setSubmitting(false)
    }
  }

  const cancelRequest = async () => {
    if (!requestId || !submittedRequest || !['submitted', 'acknowledged'].includes(submittedRequest.status)) return
    if (!window.confirm('Cancel this clinic request?')) return
    try {
      await updateEmergencyRequestStatus(requestId, 'cancelled')
      const request = await getEmergencyRequest(requestId)
      setSubmittedRequest(request)
    } catch (failure) {
      setSubmitError(failure instanceof Error ? failure.message : 'Unable to cancel this request.')
    }
  }

  return <section className="iranwo-request-panel" aria-labelledby="iranwo-request-title">
    <div className="iranwo-request-heading"><div className="request-heading-icon"><Building2 size={20}/></div><div><p className="request-eyebrow">CLINIC SUPPORT</p><h2 id="iranwo-request-title">Send a request to a clinic</h2><p>Choose a verified facility to receive your request. This does not replace calling emergency services.</p></div></div>

    {!userId ? <div className="request-auth-box">
      <div className="request-auth-tabs"><button type="button" className={authMode === 'signin' ? 'active' : ''} onClick={() => setAuthMode('signin')}>Sign in</button><button type="button" className={authMode === 'signup' ? 'active' : ''} onClick={() => setAuthMode('signup')}>Create account</button></div>
      <p>Clinic requests require an Iranwo account so the request can be associated with you and its status returned securely.</p>
      <form onSubmit={authenticate} className="request-auth-form">
        <label>Email<input type="email" autoComplete="email" required value={email} onChange={event => setEmail(event.target.value)}/></label>
        <label>Password<input type="password" autoComplete={authMode === 'signup' ? 'new-password' : 'current-password'} minLength={8} required value={password} onChange={event => setPassword(event.target.value)}/></label>
        <button type="submit" disabled={authBusy}>{authBusy ? 'Please wait…' : authMode === 'signup' ? 'Create account' : 'Sign in'}</button>
      </form>
      {authError && <p className="request-error" role="alert">{authError}</p>}
      {authNotice && <p className="request-success" role="status">{authNotice}</p>}
    </div> : <>
      <div className="request-signed-in"><UserRound size={16}/> Signed in to Iranwo <button type="button" onClick={() => void signOutPatient()}>Sign out</button></div>
      {submittedRequest && <div className="request-submitted-card" role="status">
        <CheckCircle2 size={24}/><div><strong>{statusLabel[submittedRequest.status]}</strong><p>{submittedRequest.status === 'submitted' ? 'The request is in Iranwo’s system. Wait for an update, but do not delay urgent care or an emergency call.' : 'Status updates are shown here when the clinic records them.'}</p><small>Request ID: {submittedRequest.id.slice(0, 8).toUpperCase()}</small></div>
        {['submitted', 'acknowledged'].includes(submittedRequest.status) && requestId === submittedRequest.id && <button type="button" className="request-cancel-button" onClick={() => void cancelRequest()}>Cancel request</button>}
      </div>}
      {myRequests.length > 0 && <div className="request-history"><strong>Your recent clinic requests</strong>{myRequests.slice(0, 3).map(item => <div className="request-history-row" key={item.id}><span>{item.urgency === 'emergency' ? 'Emergency' : 'Urgent'} · {item.id.slice(0, 8).toUpperCase()}</span><b>{statusLabel[item.status]}</b></div>)}</div>}
      {loadingClinics ? <p className="request-muted">Loading verified clinics…</p> : clinics.length === 0 ? <div className="request-no-clinics"><AlertTriangle size={20}/><p>No verified clinic is currently accepting requests through Iranwo. Use the emergency call option above if you need urgent help. We do not display fictional clinic listings here.</p></div> : <form onSubmit={handleSubmit} className="request-share-form">
        <label className="request-field">Choose a verified clinic<select value={clinicId} onChange={event => setClinicId(event.target.value)} required>{clinics.map(clinic => <option key={clinic.id} value={clinic.id}>{clinic.name} — {clinic.address}</option>)}</select></label>
        {selectedClinic?.phone_number && <a className="request-clinic-call" href={`tel:${selectedClinic.phone_number.replace(/[^\d+]/g, '')}`}><Phone size={15}/> Call {selectedClinic.name} directly: {selectedClinic.phone_number}</a>}
        <label className="request-field">What is happening?<textarea rows={3} maxLength={2000} value={requestText} onChange={event => setRequestText(event.target.value)} required/><small>{requestText.length}/2000 characters</small></label>
        <div className="request-data-consents">
          <label className="request-consent required"><input type="checkbox" checked={shareContactDetails} onChange={event => setShareContactDetails(event.target.checked)}/><span><strong>Share my name and phone number with this clinic.</strong><small>This is required so staff can identify the request and contact you. Iranwo stores these details with your account to manage the request.</small></span></label>
          <label className="request-consent"><input type="checkbox" checked={shareHealthContext} onChange={event => setShareHealthContext(event.target.checked)}/><span><strong>Share my health context for this request (optional).</strong><small>Shares your age, reported sex, existing conditions and notes from this device. It is attached to this request only.</small></span></label>
          <label className="request-consent"><input type="checkbox" checked={shareLocation} onChange={event => setShareLocation(event.target.checked)}/><span><strong>Share my current device location (optional).</strong><small>Your browser will ask for location permission. Coordinates are attached to this request only.</small></span></label>
          <label className="request-consent required"><input type="checkbox" checked={confirmRequest} onChange={event => setConfirmRequest(event.target.checked)}/><span><strong>I want Iranwo to send my description and selected information to this clinic.</strong><small>This includes the symptom description and safety-warning categories detected by Iranwo. Submitting records this request-specific consent and policy version; it does not mean clinic staff have seen or accepted the request.</small></span></label>
        </div>
        {submitError && <p className="request-error" role="alert">{submitError}</p>}
        <button type="submit" className="request-submit-button" disabled={submitting || loadingClinics || clinics.length === 0}>{submitting ? 'Submitting request…' : 'Send request to clinic'} <Send size={17}/></button>
        {authNotice && <p className="request-success" role="status">{authNotice}</p>}
      </form>}
    </>}
    {submitError && userId && <p className="request-error" role="alert">{submitError}</p>}
    <p className="request-footnote"><ShieldCheck size={15}/> No automatic ambulance dispatch or external SMS has been implemented. If this may be an emergency, call your local emergency number now. Do not wait for a clinic dashboard response.</p>
  </section>
}

