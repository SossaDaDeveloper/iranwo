export type EmergencyDispatchResult = {
  status: 'accepted' | 'not-configured' | 'failed'
  message: string
  requestId?: string
}

export type EmergencyRequestPayload = {
  startedAt: number
  selfReportedReason?: string
  /** Included only when the user explicitly enabled trusted-contact alerts in Settings. */
  trustedContacts?: Array<{ name: string; relationship: string; phone: string }>
}

/**
 * Optional integration point for a real emergency dispatch backend.
 * Configure VITE_IRANWO_API_BASE_URL only after a real, monitored receiving service exists.
 * Expected endpoint: POST /api/emergency-requests
 * Expected response: { status: 'accepted', requestId: '...' }.
 * If the backend does not support trusted-contact alerts, it must ignore that field and must not
 * report that anyone was notified. An accepted request is not proof that a clinician responded.
 */
export async function requestPractitionerHelp(payload: EmergencyRequestPayload): Promise<EmergencyDispatchResult> {
  const baseUrl = import.meta.env.VITE_IRANWO_API_BASE_URL?.trim()
  if (!baseUrl) {
    return {
      status: 'not-configured',
      message: 'No practitioner service is connected. No request was sent. Please use the call option or contact a trusted person directly.',
    }
  }

  try {
    const response = await fetch(`${baseUrl.replace(/\/$/, '')}/api/emergency-requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!response.ok) {
      return { status: 'failed', message: 'The service did not accept this request. No confirmed practitioner response is available; use the call option now.' }
    }
    const result = await response.json() as { status?: string; requestId?: string }
    if (result.status !== 'accepted') {
      return { status: 'failed', message: 'The service did not confirm the request. Please call for help directly.' }
    }
    return {
      status: 'accepted',
      message: 'The connected service accepted the request. This does not guarantee that a practitioner has responded; follow the service instructions and use the call option if urgent.',
      requestId: result.requestId,
    }
  } catch {
    return { status: 'failed', message: 'Could not reach the practitioner service. No confirmation was received; please use the call option now.' }
  }
}
