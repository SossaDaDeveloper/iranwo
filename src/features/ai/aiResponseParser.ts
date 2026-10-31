import type { AgentAssessments, IranwoAIResponse, IntentCategory, RiskLevel } from './agent.types'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function requiredRecord(value: unknown, field: string): Record<string, unknown> {
  if (!isRecord(value)) throw new Error(`Invalid AI response: ${field} is missing.`)
  return value
}

function requiredString(value: unknown, field: string, max = 1200): string {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`Invalid AI response: ${field} is missing.`)
  return value.trim().slice(0, max)
}

function optionalString(value: unknown, field: string, max = 400): string | null {
  if (value === null || value === undefined || value === '') return null
  if (typeof value !== 'string') throw new Error(`Invalid AI response: ${field} must be text or null.`)
  return value.trim().slice(0, max) || null
}

function stringArray(value: unknown, field: string, maxItems = 12): string[] {
  if (!Array.isArray(value)) throw new Error(`Invalid AI response: ${field} must be an array.`)
  return value.slice(0, maxItems).map((item, index) => requiredString(item, `${field}[${index}]`, 240))
}

function enumValue<T extends string>(value: unknown, allowed: readonly T[], field: string): T {
  if (typeof value !== 'string' || !allowed.includes(value as T)) {
    throw new Error(`Invalid AI response: ${field} has an unsupported value.`)
  }
  return value as T
}

function bool(value: unknown, field: string): boolean {
  if (typeof value !== 'boolean') throw new Error(`Invalid AI response: ${field} must be true or false.`)
  return value
}

/** Validate and constrain untrusted JSON returned by the AI backend. */
export function parseIranwoAIResponse(input: unknown, profileContextIncluded = false): IranwoAIResponse {
  if (!isRecord(input)) throw new Error('Invalid AI response: expected a JSON object.')
  if (input.schemaVersion !== '1.0') throw new Error('Invalid AI response: unsupported schema version.')

  const agents = input.agents
  if (!isRecord(agents)) throw new Error('Invalid AI response: specialist assessments are missing.')
  const intent = requiredRecord(agents.conversationIntent, 'conversationIntent')
  const context = requiredRecord(agents.patientContext, 'patientContext')
  const symptoms = requiredRecord(agents.symptomAnalysis, 'symptomAnalysis')
  const risk = requiredRecord(agents.riskAssessment, 'riskAssessment')
  const safety = requiredRecord(agents.safetyVerification, 'safetyVerification')
  const escalation = requiredRecord(agents.responseEscalation, 'responseEscalation')

  const contextWasUsed = bool(context.contextUsed, 'patientContext.contextUsed')
  const contextFieldsUsed = stringArray(context.fieldsUsed, 'patientContext.fieldsUsed', 8)
  const allowedContextFields = new Set(['age', 'sex', 'conditions', 'notes'])
  if (!profileContextIncluded && (contextWasUsed || contextFieldsUsed.length > 0)) {
    throw new Error('Invalid AI response: profile context was not included in this request.')
  }
  if (contextFieldsUsed.some(field => !allowedContextFields.has(field))) {
    throw new Error('Invalid AI response: the model referenced an unsupported profile field.')
  }
  if (contextWasUsed !== (contextFieldsUsed.length > 0)) {
    throw new Error('Invalid AI response: patient context usage does not match fields used.')
  }

  const parsedAgents: AgentAssessments = {
    conversationIntent: {
      category: enumValue(intent.category, ['current_personal', 'current_other_person', 'hypothetical', 'educational', 'past_or_resolved', 'unclear'] as const, 'conversationIntent.category') as IntentCategory,
      subject: enumValue(intent.subject, ['user', 'other_person', 'general', 'unknown'] as const, 'conversationIntent.subject'),
      timeContext: enumValue(intent.timeContext, ['current', 'past', 'hypothetical', 'unknown'] as const, 'conversationIntent.timeContext'),
      summary: requiredString(intent.summary, 'conversationIntent.summary', 400),
    },
    patientContext: {
      contextUsed: contextWasUsed,
      fieldsUsed: contextFieldsUsed,
      summary: requiredString(context.summary, 'patientContext.summary', 400),
      unknowns: stringArray(context.unknowns, 'patientContext.unknowns', 8),
    },
    symptomAnalysis: {
      symptoms: stringArray(symptoms.symptoms, 'symptomAnalysis.symptoms'),
      onset: optionalString(symptoms.onset, 'symptomAnalysis.onset'),
      duration: optionalString(symptoms.duration, 'symptomAnalysis.duration'),
      severity: optionalString(symptoms.severity, 'symptomAnalysis.severity'),
      associatedSymptoms: stringArray(symptoms.associatedSymptoms, 'symptomAnalysis.associatedSymptoms'),
      missingInformation: stringArray(symptoms.missingInformation, 'symptomAnalysis.missingInformation'),
    },
    riskAssessment: {
      level: enumValue(risk.level, ['routine', 'urgent', 'emergency', 'uncertain'] as const, 'riskAssessment.level') as RiskLevel,
      warningSigns: stringArray(risk.warningSigns, 'riskAssessment.warningSigns'),
      limitations: requiredString(risk.limitations, 'riskAssessment.limitations', 500),
    },
    safetyVerification: {
      checkedNegation: bool(safety.checkedNegation, 'safetyVerification.checkedNegation'),
      checkedHypotheticalContext: bool(safety.checkedHypotheticalContext, 'safetyVerification.checkedHypotheticalContext'),
      contradictions: stringArray(safety.contradictions, 'safetyVerification.contradictions'),
      assumptionsAvoided: stringArray(safety.assumptionsAvoided, 'safetyVerification.assumptionsAvoided'),
    },
    responseEscalation: {
      responseType: enumValue(escalation.responseType, ['education', 'clarification', 'general_guidance', 'professional_care', 'emergency_guidance'] as const, 'responseEscalation.responseType'),
      humanSupportRecommended: bool(escalation.humanSupportRecommended, 'responseEscalation.humanSupportRecommended'),
      actionSummary: requiredString(escalation.actionSummary, 'responseEscalation.actionSummary', 500),
      followUpQuestion: optionalString(escalation.followUpQuestion, 'responseEscalation.followUpQuestion'),
    },
  }

  return {
    schemaVersion: '1.0',
    requestId: requiredString(input.requestId, 'requestId', 160),
    assistantMessage: requiredString(input.assistantMessage, 'assistantMessage', 2400),
    agents: parsedAgents,
  }
}
