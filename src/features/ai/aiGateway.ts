import { parseIranwoAIResponse } from './aiResponseParser'
import type { IranwoAIRequest, IranwoAIResponse } from './agent.types'

export const AI_CONSENT_POLICY_VERSION = 'iranwo-ai-processing-v1'
const REQUEST_TIMEOUT_MS = 50_000
const MAX_MESSAGE_LENGTH = 2_000
const MAX_HISTORY_TURNS = 8

const configuredEndpoint = import.meta.env.VITE_IRANWO_AI_ENDPOINT?.trim() || (import.meta.env.DEV ? '/api/ai/assistant' : '')

export function isCloudAIConfigured(): boolean {
  return configuredEndpoint.length > 0
}

export class AIServiceError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message)
    this.name = 'AIServiceError'
  }
}

/**
 * Sends only the current message, the last eight chat turns, and the language.
 * Profile details, phone numbers, contacts, and saved health history are not sent.
 * The API key/model credentials must remain on the server, never in Vite env vars.
 */
export async function requestIranwoAI(
  input: Pick<IranwoAIRequest, 'message' | 'history' | 'language' | 'profileContext'>,
  acceptedAt: string,
): Promise<IranwoAIResponse> {
  if (!configuredEndpoint) throw new AIServiceError('The AI endpoint is not configured yet.', 'NOT_CONFIGURED')
  if (!input.message.trim() || input.message.length > MAX_MESSAGE_LENGTH) {
    throw new AIServiceError(`Please keep your message under ${MAX_MESSAGE_LENGTH} characters.`, 'INVALID_INPUT')
  }

  const body: IranwoAIRequest = {
    schemaVersion: '1.0',
    message: input.message.trim(),
    history: input.history.slice(-MAX_HISTORY_TURNS).map(turn => ({
      role: turn.role,
      text: turn.text.slice(0, MAX_MESSAGE_LENGTH),
    })),
    language: input.language,
    includeProfileContext: Boolean(input.profileContext),
    ...(input.profileContext ? {
      profileContext: {
        age: Number.isFinite(input.profileContext.age) ? input.profileContext.age : null,
        sex: input.profileContext.sex?.slice(0, 40) ?? null,
        conditions: input.profileContext.conditions.slice(0, 12).map(value => value.slice(0, 80)),
        notes: input.profileContext.notes?.slice(0, 600) ?? null,
      },
    } : {}),
    consent: {
      accepted: true,
      policyVersion: AI_CONSENT_POLICY_VERSION,
      acceptedAt,
    },
  }

  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  try {
    const response = await fetch(configuredEndpoint, {
      method: 'POST',
      credentials: 'include',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    })

    if (!response.ok) {
      let providerMessage = ''
      try {
        const errorPayload = await response.json() as { error?: unknown }
        if (typeof errorPayload.error === 'string') providerMessage = errorPayload.error.slice(0, 300)
      } catch { /* use the status-specific fallback below */ }
      if (response.status === 401 || response.status === 403) {
        throw new AIServiceError(providerMessage || 'The AI service did not authorize this request. Check consent and local access.', 'UNAUTHORIZED')
      }
      if (response.status === 429) throw new AIServiceError(providerMessage || 'The model provider rate limit was reached. Please wait and try again.', 'RATE_LIMITED')
      if (response.status >= 500) throw new AIServiceError(providerMessage || 'The AI service is temporarily unavailable. Please try again later.', 'SERVER_ERROR')
      throw new AIServiceError(providerMessage || `The AI service rejected the request (${response.status}).`, 'REQUEST_REJECTED')
    }

    let payload: unknown
    try {
      payload = await response.json()
    } catch {
      throw new AIServiceError('The AI service returned an unreadable response.', 'INVALID_JSON')
    }
    return parseIranwoAIResponse(payload, Boolean(input.profileContext))
  } catch (error) {
    if (error instanceof AIServiceError) throw error
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new AIServiceError('The AI service took too long to respond. Please try again.', 'TIMEOUT')
    }
    throw new AIServiceError('Could not reach the AI service. Check your connection and try again.', 'NETWORK_ERROR')
  } finally {
    window.clearTimeout(timeout)
  }
}
