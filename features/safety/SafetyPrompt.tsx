import { useMemo, useState } from 'react'
import { AlertTriangle, Building2, Phone, MessageCircle, Users, ShieldCheck, ArrowUpRight } from 'lucide-react'
import type { SafetyAssessment } from './safetyEngine'
import './SafetyPrompt.css'

export type SafetyTrustedContact = {
  id: string
  name: string
  relationship?: string
  phoneE164: string
}

type Props = {
  assessment: SafetyAssessment
  trustedContacts: SafetyTrustedContact[]
  emergencyNumber?: string
  clinicName: string
  clinicPhone?: string
  onConfirmCurrent: () => void
  onNotCurrent: () => void
  onOpenClinicRequest: () => void
}

function normalizePhone(phone: string): string {
  return phone.replace(/[^\d+]/g, '')
}

export default function SafetyPrompt({
  assessment,
  trustedContacts,
  emergencyNumber = '',
  clinicName,
  clinicPhone = '',
  onConfirmCurrent,
  onNotCurrent,
  onOpenClinicRequest,
}: Props) {
  const usableContacts = useMemo(
    () => trustedContacts.filter(contact => normalizePhone(contact.phoneE164).length >= 7),
    [trustedContacts],
  )
  const [selectedContactId, setSelectedContactId] = useState(usableContacts[0]?.id ?? '')
  const selectedContact = usableContacts.find(contact => contact.id === selectedContactId) ?? usableContacts[0]

  if (assessment.level === 'clarify') {
    return (
      <section className="iranwo-safety-prompt safety-prompt-clarify" aria-live="polite">
        <div className="safety-prompt-heading">
          <span className="safety-prompt-icon"><AlertTriangle size={18} /></span>
          <div>
            <strong>Can I check something?</strong>
            <small>{assessment.title}</small>
          </div>
        </div>
        <p>Is this happening to you or someone near you right now?</p>
        <div className="safety-prompt-actions safety-clarify-actions">
          <button type="button" className="safety-action safety-action-primary" onClick={onConfirmCurrent}>Yes, this is happening now</button>
          <button type="button" className="safety-action safety-action-secondary" onClick={onNotCurrent}>No, I'm asking generally</button>
        </div>
        <small className="safety-prompt-footnote">If someone is in immediate danger, contact emergency services now.</small>
      </section>
    )
  }

  if (!assessment.shouldOfferContactOptions) return null

  const cleanClinicPhone = normalizePhone(clinicPhone)
  const cleanEmergencyNumber = normalizePhone(emergencyNumber)
  const cleanTrustedPhone = selectedContact ? normalizePhone(selectedContact.phoneE164) : ''
  const smsBody = encodeURIComponent('I may need urgent health assistance. Please call me or come and help me now.')

  return (
    <section className={`iranwo-safety-prompt ${assessment.level === 'emergency' ? 'safety-prompt-emergency' : 'safety-prompt-urgent'}`} aria-live="polite">
      <div className="safety-prompt-heading">
        <span className="safety-prompt-icon"><AlertTriangle size={18} /></span>
        <div>
          <strong>{assessment.level === 'emergency' ? 'Let’s get you help' : 'Let’s arrange medical advice'}</strong>
          <small>{assessment.title}</small>
        </div>
      </div>

      <p className="safety-prompt-instruction">Choose who you would like to contact. Iranwo will not call or share your information without your action.</p>

      <div className="safety-contact-options">
        {assessment.level === 'emergency' && cleanEmergencyNumber && (
          <a className="safety-action safety-action-emergency" href={`tel:${cleanEmergencyNumber}`}>
            <Phone size={17} />
            <span><strong>Call emergency services</strong><small>{cleanEmergencyNumber} · opens your phone dialer</small></span>
            <ArrowUpRight size={17} />
          </a>
        )}

        {cleanClinicPhone ? (
          <a className="safety-action safety-action-clinic" href={`tel:${cleanClinicPhone}`}>
            <Building2 size={18} />
            <span><strong>Call {clinicName}</strong><small>{cleanClinicPhone} · opens your phone dialer</small></span>
            <ArrowUpRight size={17} />
          </a>
        ) : (
          <div className="safety-contact-unavailable">
            <Building2 size={18} />
            <span><strong>Clinic calling is not configured</strong><small>Add VITE_IRANWO_CLINIC_PHONE to your local environment settings.</small></span>
          </div>
        )}

        {usableContacts.length > 0 ? (
          <div className="safety-trusted-contact">
            <div className="safety-trusted-heading"><Users size={17} /><strong>Contact someone you trust</strong></div>
            {usableContacts.length > 1 && (
              <select value={selectedContact?.id ?? ''} onChange={event => setSelectedContactId(event.target.value)} aria-label="Choose a trusted person">
                {usableContacts.map(contact => (
                  <option key={contact.id} value={contact.id}>{contact.name}{contact.relationship ? ` · ${contact.relationship}` : ''}</option>
                ))}
              </select>
            )}
            {selectedContact && (
              <div className="safety-trusted-actions">
                <a className="safety-action safety-action-trusted" href={`tel:${cleanTrustedPhone}`}>
                  <Phone size={17} /><span><strong>Call {selectedContact.name}</strong><small>{cleanTrustedPhone}</small></span><ArrowUpRight size={17} />
                </a>
                <a className="safety-action safety-action-message" href={`sms:${cleanTrustedPhone}?body=${smsBody}`}>
                  <MessageCircle size={17} /><span><strong>Prepare a text message</strong><small>You can review it before sending</small></span><ArrowUpRight size={17} />
                </a>
              </div>
            )}
          </div>
        ) : (
          <div className="safety-contact-unavailable">
            <Users size={18} />
            <span><strong>No trusted person added</strong><small>Add a trusted contact in Profile & settings to use this option.</small></span>
          </div>
        )}
      </div>

      <button type="button" className="safety-action safety-action-dashboard" onClick={onOpenClinicRequest}>
        <Building2 size={17} />
        <span><strong>Send a request to the clinic dashboard</strong><small>You will review the details and sharing permissions before sending.</small></span>
      </button>

      <p className="safety-prompt-footnote"><ShieldCheck size={14} /> Calls open your device dialer. Texts are not sent until you confirm. A dashboard request is not proof that a clinician has seen or accepted it. Do not wait for a dashboard response if this may be an emergency.</p>
    </section>
  )
}
