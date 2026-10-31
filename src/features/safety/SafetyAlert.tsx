import type { SafetyAssessment } from '../../../features/safety/safetyEngine'
import './SafetyAlert.css'

type Props = {
  assessment: SafetyAssessment
  onConfirmCurrent: () => void
  onNotCurrent: () => void
  onOpenEmergency: () => void
}

export default function SafetyAlert({ assessment, onConfirmCurrent, onNotCurrent, onOpenEmergency }: Props) {
  const emergency = assessment.level === 'emergency'
  const clarify = assessment.level === 'clarify'

  return (
    <section
      className={`chat-safety-alert ${emergency ? 'is-emergency' : clarify ? 'needs-clarification' : 'is-urgent'}`}
      role={emergency ? 'alert' : 'status'}
      aria-live="assertive"
    >
      <div className="chat-safety-alert-heading">
        <strong>{emergency ? 'Possible emergency warning sign' : clarify ? 'Can I check something?' : 'Prompt medical attention may be needed'}</strong>
        <span>{assessment.title}</span>
      </div>
      <p>{assessment.userMessage}</p>
      {clarify ? (
        <div className="chat-safety-alert-actions">
          <button type="button" onClick={onConfirmCurrent}>Yes, this is happening now</button>
          <button type="button" className="secondary" onClick={onNotCurrent}>No, I am asking generally</button>
        </div>
      ) : (
        <button type="button" className="chat-safety-alert-primary" onClick={onOpenEmergency}>Open emergency help options</button>
      )}
      <small>{assessment.note} A missing warning-sign match does not mean someone is safe.</small>
    </section>
  )
}
