import { getSupabaseClient } from '../../lib/supabase'

export type EmergencyUrgency = 'emergency' | 'urgent'
export type EmergencySource = 'safety_engine' | 'manual_sos'
export type EmergencyRequestStatus =
  | 'submitted'
  | 'acknowledged'
  | 'accepted'
  | 'in_progress'
  | 'resolved'
  | 'unable_to_respond'
  | 'cancelled'

export type VerifiedClinic = {
  id: string
  name: string
  facility_type: string
  address: string
  phone_number: string | null
}

export type EmergencyRequest = {
  id: string
  patient_id: string
  clinic_id: string
  status: EmergencyRequestStatus
  urgency: EmergencyUrgency
  source: EmergencySource
  reported_text: string
  matched_rule_codes: string[]
  share_contact_details: boolean
  patient_name_snapshot: string | null
  patient_phone_snapshot: string | null
  share_health_context: boolean
  health_context_snapshot: {
    age_years?: number | null
    sex?: string | null
    conditions?: string[]
    custom_conditions?: string[]
    health_notes?: string | null
  } | null
  share_location: boolean
  latitude: number | null
  longitude: number | null
  location_accuracy_m: number | null
  assigned_staff_id: string | null
  created_at: string
  updated_at: string
  acknowledged_at: string | null
  accepted_at: string | null
  resolved_at: string | null
  closed_at: string | null
}

export type SubmitEmergencyRequestInput = {
  idempotencyKey: string
  clinicId: string
  urgency: EmergencyUrgency
  source: EmergencySource
  reportedText: string
  matchedRuleCodes: string[]
  confirmRequest: boolean
  shareContactDetails: boolean
  shareHealthContext: boolean
  healthContext?: {
    age?: number | null
    sex?: string | null
    conditions?: string[]
    customConditions?: string[]
    notes?: string
  } | null
  shareLocation: boolean
  location?: { latitude: number; longitude: number; accuracy?: number | null } | null
}

export async function getVerifiedClinics(): Promise<VerifiedClinic[]> {
  const { data, error } = await getSupabaseClient()
    .from('clinics')
    .select('id, name, facility_type, address, phone_number')
    .eq('verification_status', 'verified')
    .eq('is_active', true)
    .eq('accepting_requests', true)
    .order('name')

  if (error) throw error
  return (data ?? []) as VerifiedClinic[]
}

export async function submitEmergencyRequest(input: SubmitEmergencyRequestInput): Promise<{ requestId: string; status: 'submitted'; clinicName: string }> {
  if (!input.confirmRequest) throw new Error('Confirm that you want to send this request to the selected clinic.')
  if (!input.shareContactDetails) throw new Error('You must agree to share your name and phone number so the clinic can respond.')
  if (!input.shareHealthContext && input.healthContext) throw new Error('Health context cannot be supplied without consent.')
  if (!input.shareLocation && input.location) throw new Error('Location cannot be supplied without consent.')

  const client = getSupabaseClient()
  const { data: authData, error: authError } = await client.auth.getUser()
  if (authError) throw authError
  if (!authData.user) throw new Error('Sign in before sending an emergency request.')

  const { data, error } = await client.functions.invoke('create-emergency-request', { body: input })
  if (error) {
    const context = (error as unknown as { context?: { json?: () => Promise<{ error?: string }> } }).context
    if (context?.json) {
      try {
        const payload = await context.json()
        throw new Error(payload.error || error.message)
      } catch (nestedError) {
        if (nestedError instanceof Error && nestedError.message !== error.message) throw nestedError
      }
    }
    throw error
  }
  if (!data?.requestId) throw new Error('The server did not return an emergency request identifier.')
  return data as { requestId: string; status: 'submitted'; clinicName: string }
}

export async function getEmergencyRequest(requestId: string): Promise<EmergencyRequest | null> {
  const { data, error } = await getSupabaseClient()
    .from('emergency_requests')
    .select('*')
    .eq('id', requestId)
    .maybeSingle()
  if (error) throw error
  return data as EmergencyRequest | null
}

export async function getMyEmergencyRequests(): Promise<EmergencyRequest[]> {
  const { data, error } = await getSupabaseClient()
    .from('emergency_requests')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(20)
  if (error) throw error
  return (data ?? []) as EmergencyRequest[]
}

export async function updateEmergencyRequestStatus(requestId: string, nextStatus: EmergencyRequestStatus): Promise<void> {
  const { error } = await getSupabaseClient().functions.invoke('update-emergency-request-status', {
    body: { requestId, nextStatus },
  })
  if (error) throw error
}

export function subscribeToEmergencyRequest(requestId: string, onChange: () => void): () => void {
  const client = getSupabaseClient()
  const channel = client
    .channel(`patient-emergency-request-${requestId}`)
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'emergency_requests',
      filter: `id=eq.${requestId}`,
    }, onChange)
    .subscribe()

  return () => { void client.removeChannel(channel) }
}
