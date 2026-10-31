export type IranwoLanguage = 'en' | 'yo' | 'pcm' | 'ha' | 'ig'
export type ConversationRole = 'user' | 'assistant'

export type IntentCategory =
  | 'current_personal'
  | 'current_other_person'
  | 'hypothetical'
  | 'educational'
  | 'past_or_resolved'
  | 'unclear'

export type RiskLevel = 'routine' | 'urgent' | 'emergency' | 'uncertain'

/**
 * The six roles are specialist responsibilities in one structured model run.
 * They are not six independent models and must not expose hidden chain-of-thought.
 */
export interface AgentAssessments {
  conversationIntent: {
    category: IntentCategory
    subject: 'user' | 'other_person' | 'general' | 'unknown'
    timeContext: 'current' | 'past' | 'hypothetical' | 'unknown'
    summary: string
  }
  patientContext: {
    contextUsed: boolean
    fieldsUsed: string[]
    summary: string
    unknowns: string[]
  }
  symptomAnalysis: {
    symptoms: string[]
    onset: string | null
    duration: string | null
    severity: string | null
    associatedSymptoms: string[]
    missingInformation: string[]
  }
  riskAssessment: {
    level: RiskLevel
    warningSigns: string[]
    limitations: string
  }
  safetyVerification: {
    checkedNegation: boolean
    checkedHypotheticalContext: boolean
    contradictions: string[]
    assumptionsAvoided: string[]
  }
  responseEscalation: {
    responseType: 'education' | 'clarification' | 'general_guidance' | 'professional_care' | 'emergency_guidance'
    humanSupportRecommended: boolean
    actionSummary: string
    followUpQuestion: string | null
  }
}

export interface PatientProfileContext {
  age: number | null
  sex: string | null
  conditions: string[]
  notes: string | null
}

export interface IranwoAIResponse {
  schemaVersion: '1.0'
  requestId: string
  assistantMessage: string
  agents: AgentAssessments
}

export interface ChatTurn {
  role: ConversationRole
  text: string
}

export interface IranwoAIRequest {
  schemaVersion: '1.0'
  message: string
  history: ChatTurn[]
  language: IranwoLanguage
  /** Profile fields are included only after the user separately opts in. */
  includeProfileContext: boolean
  profileContext?: PatientProfileContext
  consent: {
    accepted: true
    policyVersion: string
    acceptedAt: string
  }
}
