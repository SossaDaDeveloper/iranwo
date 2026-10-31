import { useCallback, useEffect, useState, type FormEvent } from 'react'
import type { User } from '@supabase/supabase-js'
import { Hospital, ShieldCheck, Trash2 } from 'lucide-react'
import { supabase } from '../../supabase'

type ClinicGrant = {
  clinic_id: string
  granted_at: string
  revoked_at: string | null
  care_clinics: { name: string } | null
}
type ClinicGrantRow = Omit<ClinicGrant, 'care_clinics'> & { clinic_name: string | null }

export default function PatientClinicSharing({ user }: { user: User | null }) {
  const [grants, setGrants] = useState<ClinicGrant[]>([])
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const loadGrants = useCallback(async () => {
    if (!supabase || !user) return
    setLoading(true)
    setError('')
    const { data, error: loadError } = await supabase.rpc('get_my_clinic_grants')
    if (loadError) {
      setError(`Could not load clinic-sharing settings: ${loadError.message}`)
      setLoading(false)
      return
    }
    const rows = (data ?? []) as ClinicGrantRow[]
    setGrants(rows.map(({ clinic_name, ...grant }) => ({
      ...grant,
      care_clinics: clinic_name ? { name: clinic_name } : null,
    })))
    setLoading(false)
  }, [user])

  useEffect(() => { void loadGrants() }, [loadGrants])

  const grantAccess = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!supabase || !user || !code.trim()) return
    setSaving(true)
    setError('')
    setMessage('')
    const { data: matches, error: findError } = await supabase.rpc('find_clinic_by_access_code', {
      p_access_code: code.trim(),
    })
    if (findError) {
      setError(`Could not verify that clinic code: ${findError.message}`)
      setSaving(false)
      return
    }
    const clinic = matches?.[0]
    if (!clinic) {
      setError('No clinic matches that access code. Check the code with the clinic and try again.')
      setSaving(false)
      return
    }
    const { error: grantError } = await supabase
      .from('patient_clinic_access')
      .upsert({ patient_id: user.id, clinic_id: clinic.id, revoked_at: null }, { onConflict: 'patient_id,clinic_id' })
    if (grantError) setError(`Could not share this profile with the clinic: ${grantError.message}`)
    else {
      setCode('')
      setMessage(`Your profile is now shared with ${clinic.name}. You can revoke access at any time.`)
      await loadGrants()
    }
    setSaving(false)
  }

  const revokeAccess = async (grant: ClinicGrant) => {
    if (!supabase || !user) return
    setError('')
    setMessage('')
    const { error: revokeError } = await supabase
      .from('patient_clinic_access')
      .update({ revoked_at: new Date().toISOString() })
      .eq('patient_id', user.id)
      .eq('clinic_id', grant.clinic_id)
    if (revokeError) setError(`Could not revoke clinic access: ${revokeError.message}`)
    else {
      setMessage(`Access for ${grant.care_clinics?.name ?? 'the clinic'} has been revoked.`)
      await loadGrants()
    }
  }

  return <section className="patient-clinic-sharing" aria-labelledby="patient-clinic-sharing-heading">
    <div className="patient-clinic-sharing-title"><span><Hospital size={19}/></span><div><h2 id="patient-clinic-sharing-heading">Share with a clinic</h2><p>You control which clinic can view your Iranwo health profile.</p></div></div>
    {!user ? <div className="patient-clinic-sharing-note"><ShieldCheck size={16}/>Sign in to your Iranwo account to grant or revoke clinic access. Device-only information is not visible to clinics.</div> : <>
      <form className="patient-clinic-sharing-form" onSubmit={(event) => void grantAccess(event)}>
        <label htmlFor="clinic-access-code">Clinic access code</label>
        <div><input id="clinic-access-code" value={code} onChange={(event) => setCode(event.target.value)} placeholder="Enter code provided by your clinic" autoComplete="off"/><button type="submit" disabled={saving || !code.trim()}>{saving ? 'Saving…' : 'Share profile'}</button></div>
      </form>
      {error && <p className="patient-clinic-sharing-error" role="alert">{error}</p>}
      {message && <p className="patient-clinic-sharing-message" role="status">{message}</p>}
      <div className="patient-clinic-grants">
        <h3>Clinic access permissions</h3>
        {loading ? <p>Loading permissions…</p> : grants.length ? grants.map((grant) => <div className="patient-clinic-grant" key={grant.clinic_id}>
          <span><strong>{grant.care_clinics?.name ?? 'Iranwo clinic'}</strong><small>{grant.revoked_at ? 'Access revoked' : `Access granted ${new Date(grant.granted_at).toLocaleDateString()}`}</small></span>
          {grant.revoked_at ? <button onClick={() => document.getElementById('clinic-access-code')?.focus()}>Re-enter code to restore</button> : <button className="patient-clinic-revoke" onClick={() => void revokeAccess(grant)} aria-label={`Revoke access for ${grant.care_clinics?.name ?? 'clinic'}`}><Trash2 size={15}/>Revoke</button>}
        </div>) : <p>No clinic has access to your profile.</p>}
      </div>
      <p className="patient-clinic-sharing-note"><ShieldCheck size={16}/>A clinic can access the profile data currently synced to Supabase. Data saved only in this browser is not available to clinic staff.</p>
    </>}
  </section>
}
