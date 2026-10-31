import { randomUUID } from 'node:crypto'
import { GEMMA_SYSTEM_PROMPT } from '../../src/features/ai/gemmaSystemPrompt'

type AnyRecord = Record<string, any>

function sendJson(res: any, status: number, payload: unknown) {
  return res.status(status).setHeader('Cache-Control', 'no-store').json(payload)
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return sendJson(res, 405, { error: 'Method not allowed.' })
  }

  const apiKey = process.env.OPENROUTER_API_KEY?.trim()
  if (!apiKey) {
    return sendJson(res, 503, { error: 'The AI service is not configured on the server. Add OPENROUTER_API_KEY in Vercel project settings.' })
  }

  const input = (req.body && typeof req.body === 'object' ? req.body : {}) as AnyRecord

  if (input.schemaVersion !== '1.0' || typeof input.message !== 'string' || !input.message.trim() || input.message.length > 2000) {
    return sendJson(res, 400, { error: 'Invalid request. Check schemaVersion and message length (1–2000 characters).' })
  }
  if (input.language !== 'en') {
    return sendJson(res, 400, { error: 'The prototype AI connection currently supports English only.' })
  }
  if (!input.consent || input.consent.accepted !== true) {
    return sendJson(res, 403, { error: 'Conversation-processing consent is required.' })
  }

  const history = Array.isArray(input.history)
    ? input.history.slice(-8)
        .filter((turn: any) =>
          turn && (turn.role === 'user' || turn.role === 'assistant') && typeof turn.text === 'string')
        .map((turn: any) => ({ role: turn.role, content: turn.text.slice(0, 2000) }))
    : []

  let profileContext: {
    age: number | null
    sex: string | null
    conditions: string[]
    notes: string | null
  } | null = null

  if (input.includeProfileContext === true) {
    if (!input.profileContext || typeof input.profileContext !== 'object') {
      return sendJson(res, 400, { error: 'Profile context was marked as included but no profile fields were supplied.' })
    }

    const profile = input.profileContext as AnyRecord
    const age = typeof profile.age === 'number' && Number.isInteger(profile.age) && profile.age >= 18 && profile.age <= 120
      ? profile.age
      : null
    const sex = typeof profile.sex === 'string' ? profile.sex.slice(0, 40) : null
    const conditions = Array.isArray(profile.conditions)
      ? profile.conditions
          .filter((value: unknown): value is string => typeof value === 'string')
          .slice(0, 12)
          .map((value: string) => value.slice(0, 80))
      : []
    const notes = typeof profile.notes === 'string' ? profile.notes.slice(0, 600) : null
    profileContext = { age, sex, conditions, notes }
  }

  const profileText = profileContext
    ? JSON.stringify(profileContext)
    : 'Not provided. Do not infer profile information.'

  const messages = [
    { role: 'system', content: GEMMA_SYSTEM_PROMPT },
    ...history,
    {
      role: 'user',
      content: `USER PROFILE CONTEXT (only use if relevant; these are user-reported, not verified):\n${profileText}\n\nCURRENT USER MESSAGE:\n${input.message.trim()}`,
    },
  ]

  const model = process.env.OPENROUTER_MODEL?.trim() || 'google/gemma-4-26b-a4b-it'
  if (!/^[a-zA-Z0-9._:/-]+$/.test(model) || model.length > 160) {
    return sendJson(res, 400, { error: 'OPENROUTER_MODEL contains unsupported characters.' })
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 45_000)

  try {
    const upstream = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'HTTP-Referer': process.env.OPENROUTER_SITE_URL?.trim() || 'https://iranwo.vercel.app',
        'X-OpenRouter-Title': process.env.OPENROUTER_APP_NAME?.trim() || 'Iranwo Health Companion',
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.2,
        max_tokens: 2200,
        response_format: { type: 'json_object' },
        provider: {
          data_collection: 'deny',
          zdr: true,
          require_parameters: true,
          allow_fallbacks: true,
        },
      }),
      signal: controller.signal,
    })

    const responseText = await upstream.text()
    let result: AnyRecord = {}
    try {
      result = responseText ? JSON.parse(responseText) as AnyRecord : {}
    } catch {
      result = {}
    }

    if (!upstream.ok) {
      const requestId = randomUUID()
      const providerMessage = typeof result.error?.message === 'string'
        ? result.error.message.slice(0, 400)
        : ''
      console.error(`[Iranwo AI] OpenRouter HTTP ${upstream.status}. Request ${requestId}. ${providerMessage}`)

      const publicMessage = upstream.status === 401 || upstream.status === 403
        ? 'OpenRouter rejected the API key or request permissions. Check your key and account access.'
        : upstream.status === 402
          ? 'OpenRouter reports insufficient credits or a payment issue for this model route.'
          : upstream.status === 429
            ? 'The model provider rate limit was reached. Wait and retry.'
            : upstream.status === 404
              ? 'The requested model or an eligible privacy-filtered provider route is unavailable.'
              : 'OpenRouter could not complete the request. Check the Vercel function logs for details.'

      return sendJson(res, upstream.status === 429 ? 429 : 502, { error: publicMessage, requestId })
    }

    const rawContent = result.choices?.[0]?.message?.content
    const content = typeof rawContent === 'string'
      ? rawContent
      : Array.isArray(rawContent)
        ? rawContent.map((part: any) => typeof part?.text === 'string' ? part.text : '').join('\n')
        : ''
    const cleaned = content.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()

    let modelPayload: AnyRecord
    try {
      modelPayload = JSON.parse(cleaned) as AnyRecord
    } catch {
      const requestId = randomUUID()
      console.error(`[Iranwo AI] Model returned invalid JSON. Request ${requestId}`)
      return sendJson(res, 502, { error: 'Gemma returned a response that was not valid structured JSON. Please retry.', requestId })
    }

    return sendJson(res, 200, {
      ...modelPayload,
      schemaVersion: '1.0',
      requestId: randomUUID(),
    })
  } catch (error) {
    const timedOut = error instanceof Error && error.name === 'AbortError'
    console.error(`[Iranwo AI] ${timedOut ? 'OpenRouter timeout' : 'OpenRouter connection error'}.`)
    return sendJson(res, timedOut ? 504 : 502, {
      error: timedOut
        ? 'Gemma took too long to respond. Please retry.'
        : 'Could not connect to OpenRouter. Check the server connection.',
    })
  } finally {
    clearTimeout(timeout)
  }
}
