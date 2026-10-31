import { assessSafetyMessage, type SafetyAssessment } from '../../../features/safety/safetyEngine'
import { AIServiceError, isCloudAIConfigured, requestIranwoAI } from './aiGateway'
import type { ChatTurn, IranwoAIResponse, IranwoLanguage, PatientProfileContext } from './agent.types'

export type AssistantTurnResult =
  | { kind: 'safety'; assessment: SafetyAssessment }
  | { kind: 'ai'; response: IranwoAIResponse }
  | { kind: 'demo'; text: string }
  | { kind: 'consent_required' }
  | { kind: 'unsupported_language' }
  | { kind: 'error'; message: string }

type Input = {
  message: string
  history: ChatTurn[]
  language: IranwoLanguage
  consentAccepted: boolean
  profileContext?: PatientProfileContext
}

function demoReply(language: IranwoLanguage): string {
  if (language === 'pcm') {
    return "Iranwo's AI service never connect yet, so I no fit analyze symptoms or give personal health advice. This na demo mode. If the matter urgent, open Emergency Help or contact a qualified health professional."
  }
  return "Iranwo's AI service is not connected yet, so I cannot analyze symptoms or provide a personalized response. This is demo mode. For personal health concerns, speak with a qualified healthcare professional. If someone may be in immediate danger, open Emergency Help now."
}

/** Local warning-sign screening always runs before any network request. */
export async function runAssistantTurn(input: Input): Promise<AssistantTurnResult> {
  const assessment = assessSafetyMessage(input.message, { language: input.language })
  if (assessment.level !== 'no_detected_red_flag') {
    return { kind: 'safety', assessment }
  }

  if (!isCloudAIConfigured()) {
    return { kind: 'demo', text: demoReply(input.language) }
  }
  if (input.language !== 'en') return { kind: 'unsupported_language' }
  if (!input.consentAccepted) return { kind: 'consent_required' }

  try {
    const response = await requestIranwoAI({
      message: input.message,
      history: input.history,
      language: input.language,
      profileContext: input.profileContext,
    }, new Date().toISOString())
    return { kind: 'ai', response }
  } catch (error) {
    return {
      kind: 'error',
      message: error instanceof AIServiceError ? error.message : 'Something went wrong while contacting Iranwo AI. Please try again.',
    }
  }
}
