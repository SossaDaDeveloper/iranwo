/**
 * Canonical responsibilities for Iranwo's six logical AI roles.
 * The backend should execute these as one structured model request for the MVP,
 * rather than making six separate model calls and multiplying latency/cost.
 */
export const IRANWO_AGENT_ROLES = [
  {
    id: 'conversationIntent',
    name: 'Conversation Intent Agent',
    responsibility: 'Classify whether the message is current, about another person, hypothetical, educational, past, or unclear.',
  },
  {
    id: 'patientContext',
    name: 'Patient Context Agent',
    responsibility: 'Use only context explicitly supplied and consented to; treat it as user-reported and leave missing details unknown.',
  },
  {
    id: 'symptomAnalysis',
    name: 'Symptom Analysis Agent',
    responsibility: 'Extract the reported symptoms, timing, duration, severity, associated symptoms, and missing information without diagnosing.',
  },
  {
    id: 'riskAssessment',
    name: 'Risk Assessment Agent',
    responsibility: 'Identify possible warning signs and uncertainty; do not claim that a person is safe because no pattern was found.',
  },
  {
    id: 'safetyVerification',
    name: 'Safety Verification Agent',
    responsibility: 'Check negation, hypothetical language, contradictions, and unsupported assumptions before composing an answer.',
  },
  {
    id: 'responseEscalation',
    name: 'Response and Escalation Agent',
    responsibility: 'Give a concise, non-diagnostic answer in the selected language and suggest appropriate human support without claiming anyone was contacted.',
  },
] as const

export type IranwoAgentId = typeof IRANWO_AGENT_ROLES[number]['id']
