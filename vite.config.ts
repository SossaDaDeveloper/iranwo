import { randomUUID } from 'node:crypto'
import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

type LocalAIRequest = {
  schemaVersion?: unknown
  message?: unknown
  history?: unknown
  language?: unknown
  includeProfileContext?: unknown
  profileContext?: unknown
  consent?: { accepted?: unknown; policyVersion?: unknown }
}

type ChatMessage = {
  role: 'user' | 'assistant'
  content: string
}

function sendJson(res: import('node:http').ServerResponse, status: number, payload: unknown) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store')
  res.end(JSON.stringify(payload))
}

async function readJsonBody(req: import('node:http').IncomingMessage): Promise<LocalAIRequest> {
  const chunks: Buffer[] = []
  let size = 0

  for await (const chunk of req) {
    const part = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
    size += part.byteLength
    if (size > 24_000) throw new Error('REQUEST_TOO_LARGE')
    chunks.push(part)
  }

  return JSON.parse(Buffer.concat(chunks).toString('utf8')) as LocalAIRequest
}

/**
 * Iranwo's six-role system prompt.
 * This is sent to the configured OpenRouter model. Before using it with real
 * patient data or deploying to users, verify the applicable OpenRouter and
 * underlying inference-provider terms permit this healthcare-support use.
 */
const GEMMA_SYSTEM_PROMPT = `You are the language and conversation component of Iranwo, a prototype health-information companion for adults in Nigeria. You are not a doctor and must not diagnose, prescribe, recommend medication doses, or claim that anyone is safe. You may explain general health information, help organize user-reported symptoms, ask focused follow-up questions, and encourage appropriate professional care. Treat every statement as unverified user-reported information. Do not invent facts or infer missing profile details.

SAFETY:
- If the user describes potentially serious symptoms, be direct, calm, and recommend timely in-person medical assessment. For signs that may indicate immediate danger, recommend contacting local emergency services or seeking emergency care now.
- Never tell someone to wait at home when symptoms may be serious. Never say absence of listed warning signs proves safety.
- Do not recommend medication or dosage. Do not give a diagnosis.
- Do not make a clinic request, place a call, send a message, or claim anyone has been contacted. Only the user can choose those actions in the app.
- If the user is asking hypothetically or for education, do not pretend the event is happening to them. Clarify ambiguous context.
- Do not reveal hidden reasoning or chain-of-thought. Return only concise role summaries and the final message.

SIX LOGICAL ROLES (all six must be present in the JSON):
1. conversationIntent: classify current_personal, current_other_person, hypothetical, educational, past_or_resolved, or unclear; subject user, other_person, general, or unknown; timeContext current, past, hypothetical, or unknown.
2. patientContext: state whether the explicitly supplied profile context influenced this response. fieldsUsed may contain only age, sex, conditions, notes. Never claim context was provided when it was not.
3. symptomAnalysis: extract symptoms, onset, duration, severity, associatedSymptoms, and missingInformation. Use null for unknown onset/duration/severity.
4. riskAssessment: use routine, urgent, emergency, or uncertain. List only reported warning signs and explain limitations. A model assessment is not clinical triage.
5. safetyVerification: check negation, hypothetical framing, contradictions, and unsupported assumptions.
6. responseEscalation: use education, clarification, general_guidance, professional_care, or emergency_guidance; indicate whether human support is recommended; provide a concise actionSummary and optional followUpQuestion.

OUTPUT RULES:
- Respond in English.
- Return a single valid JSON object only. No Markdown fences, commentary, or text outside JSON.
- Use this exact shape and valid enum values:
{
  "schemaVersion": "1.0",
  "assistantMessage": "string",
  "agents": {
    "conversationIntent": {"category":"current_personal|current_other_person|hypothetical|educational|past_or_resolved|unclear","subject":"user|other_person|general|unknown","timeContext":"current|past|hypothetical|unknown","summary":"string"},
    "patientContext": {"contextUsed":false,"fieldsUsed":[],"summary":"string","unknowns":[]},
    "symptomAnalysis": {"symptoms":[],"onset":null,"duration":null,"severity":null,"associatedSymptoms":[],"missingInformation":[]},
    "riskAssessment": {"level":"routine|urgent|emergency|uncertain","warningSigns":[],"limitations":"string"},
    "safetyVerification": {"checkedNegation":true,"checkedHypotheticalContext":true,"contradictions":[],"assumptionsAvoided":[]},
    "responseEscalation": {"responseType":"education|clarification|general_guidance|professional_care|emergency_guidance","humanSupportRecommended":false,"actionSummary":"string","followUpQuestion":null}
  }
}
- patientContext.contextUsed must be true only if one or more supplied profile fields actually influenced the answer; then list those exact fields in fieldsUsed. Otherwise contextUsed=false and fieldsUsed=[].
- Keep assistantMessage to roughly 2–5 concise sentences. Make it empathetic, clear, and non-alarmist.
- Do not overstate certainty. Ask no more than one high-value follow-up question.`

function localGemmaDevPlugin(env: Record<string, string>): Plugin {
  return {
    name: 'iranwo-openrouter-gemma-dev-proxy',
    configureServer(server) {
      server.middlewares.use('/api/ai/health', (req, res, next) => {
        if (req.method !== 'GET') return next()

        const configured = Boolean(env.OPENROUTER_API_KEY?.trim())
        sendJson(res, configured ? 200 : 503, {
          configured,
          provider: 'OpenRouter',
          model: env.OPENROUTER_MODEL?.trim() || 'google/gemma-4-26b-a4b-it',
          mode: 'local-development-only',
          privacyRouting: 'zero-data-retention-required',
        })
      })

      server.middlewares.use('/api/ai/assistant', (req, res, next) => {
        if (req.method !== 'POST') return next()

        void (async () => {
          // Keep this development proxy local. Do not expose it to the LAN.
          const host = (req.headers.host || '').split(':')[0].toLowerCase()
          const remote = req.socket.remoteAddress || ''
          const loopback = remote === '::1' || remote === '127.0.0.1' || remote === '::ffff:127.0.0.1'
          if (!['localhost', '127.0.0.1'].includes(host) || !loopback) {
            sendJson(res, 403, { error: 'The local AI proxy only accepts requests from this computer. Open Iranwo using http://localhost:5173.' })
            return
          }

          const origin = req.headers.origin
          if (origin) {
            try {
              if (new URL(origin).host !== req.headers.host) {
                sendJson(res, 403, { error: 'Cross-origin requests are not allowed.' })
                return
              }
            } catch {
              sendJson(res, 403, { error: 'Invalid request origin.' })
              return
            }
          }

          const apiKey = env.OPENROUTER_API_KEY?.trim()
          if (!apiKey) {
            sendJson(res, 503, { error: 'OPENROUTER_API_KEY is missing. Add it to .env.local and restart the dev server.' })
            return
          }

          let input: LocalAIRequest
          try {
            input = await readJsonBody(req)
          } catch (error) {
            sendJson(res, error instanceof Error && error.message === 'REQUEST_TOO_LARGE' ? 413 : 400, {
              error: error instanceof Error && error.message === 'REQUEST_TOO_LARGE'
                ? 'Request is too large.'
                : 'Request body must be valid JSON.',
            })
            return
          }

          if (input.schemaVersion !== '1.0' || typeof input.message !== 'string' || !input.message.trim() || input.message.length > 2000) {
            sendJson(res, 400, { error: 'Invalid request. Check schemaVersion and message length (1–2000 characters).' })
            return
          }

          if (input.language !== 'en') {
            sendJson(res, 400, { error: 'The prototype AI connection currently supports English only.' })
            return
          }

          if (!input.consent || input.consent.accepted !== true) {
            sendJson(res, 403, { error: 'Conversation-processing consent is required.' })
            return
          }

          const history: ChatMessage[] = Array.isArray(input.history)
            ? input.history
                .slice(-8)
                .filter((turn): turn is { role: 'user' | 'assistant'; text: string } =>
                  typeof turn === 'object' && turn !== null &&
                  ((turn as { role?: unknown }).role === 'user' || (turn as { role?: unknown }).role === 'assistant') &&
                  typeof (turn as { text?: unknown }).text === 'string',
                )
                .map(turn => ({ role: turn.role, content: turn.text.slice(0, 2000) }))
            : []

          let profileContext: {
            age: number | null
            sex: string | null
            conditions: string[]
            notes: string | null
          } | null = null

          if (input.includeProfileContext === true) {
            if (typeof input.profileContext !== 'object' || input.profileContext === null) {
              sendJson(res, 400, { error: 'Profile context was marked as included but no profile fields were supplied.' })
              return
            }

            const profile = input.profileContext as Record<string, unknown>
            const age = typeof profile.age === 'number' && Number.isInteger(profile.age) && profile.age >= 18 && profile.age <= 120
              ? profile.age
              : null
            const sex = typeof profile.sex === 'string' ? profile.sex.slice(0, 40) : null
            const conditions = Array.isArray(profile.conditions)
              ? profile.conditions
                  .filter((value): value is string => typeof value === 'string')
                  .slice(0, 12)
                  .map(value => value.slice(0, 80))
              : []
            const notes = typeof profile.notes === 'string' ? profile.notes.slice(0, 600) : null
            profileContext = { age, sex, conditions, notes }
          }

          const profileText = profileContext
            ? JSON.stringify(profileContext)
            : 'Not provided. Do not infer profile information.'

          const messages = [
            { role: 'system' as const, content: GEMMA_SYSTEM_PROMPT },
            ...history,
            {
              role: 'user' as const,
              content: `USER PROFILE CONTEXT (only use if relevant; these are user-reported, not verified):\n${profileText}\n\nCURRENT USER MESSAGE:\n${input.message.trim()}`,
            },
          ]

          const model = env.OPENROUTER_MODEL?.trim() || 'google/gemma-4-26b-a4b-it'
          // Basic validation prevents accidental whitespace/URL/prefix mistakes.
          if (!/^[a-zA-Z0-9._:/-]+$/.test(model) || model.length > 160) {
            sendJson(res, 400, { error: 'OPENROUTER_MODEL contains unsupported characters. Use google/gemma-4-26b-a4b-it (without quotes).' })
            return
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
                'HTTP-Referer': env.OPENROUTER_SITE_URL?.trim() || 'http://localhost:5173',
                'X-OpenRouter-Title': env.OPENROUTER_APP_NAME?.trim() || 'Iranwo Health Companion',
              },
              body: JSON.stringify({
                model,
                messages,
                temperature: 0.2,
                max_tokens: 2200,
                response_format: { type: 'json_object' },
                // Restrict routing to providers that declare no data collection
                // and zero data retention. This is a privacy filter, not a
                // substitute for checking the selected provider's healthcare terms.
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
            let result: Record<string, unknown> = {}
            try {
              result = responseText ? JSON.parse(responseText) as Record<string, unknown> : {}
            } catch {
              result = {}
            }

            if (!upstream.ok) {
              const requestId = randomUUID()
              const errorObject = typeof result.error === 'object' && result.error !== null
                ? result.error as { message?: unknown; code?: unknown }
                : null
              const providerMessage = typeof errorObject?.message === 'string'
                ? errorObject.message.slice(0, 400)
                : ''
              console.error(`[Iranwo AI] OpenRouter returned HTTP ${upstream.status}. Request ${requestId}. ${providerMessage}`)

              const publicMessage = upstream.status === 401 || upstream.status === 403
                ? 'OpenRouter rejected the API key or request permissions. Check your key and account access.'
                : upstream.status === 402
                  ? 'OpenRouter reports insufficient credits or a payment issue for this model route.'
                  : upstream.status === 429
                    ? 'The model provider rate limit was reached. Wait and retry.'
                    : upstream.status === 404
                      ? 'The requested model or an eligible privacy-filtered provider route is unavailable.'
                      : 'OpenRouter could not complete the request. Check the Vite terminal for the provider error.'

              sendJson(res, upstream.status === 429 ? 429 : 502, { error: publicMessage, requestId })
              return
            }

            const choices = Array.isArray(result.choices) ? result.choices as Array<{
              message?: { content?: string | Array<{ type?: string; text?: string }> | null }
            }> : []
            const rawContent = choices[0]?.message?.content
            const content = typeof rawContent === 'string'
              ? rawContent
              : Array.isArray(rawContent)
                ? rawContent.map(part => part.text || '').join('\n')
                : ''
            const cleaned = content.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()

            let modelPayload: Record<string, unknown>
            try {
              modelPayload = JSON.parse(cleaned) as Record<string, unknown>
            } catch {
              const requestId = randomUUID()
              console.error(`[Iranwo AI] OpenRouter model returned invalid JSON. Request ${requestId}`)
              sendJson(res, 502, { error: 'Gemma returned a response that was not valid structured JSON. Please retry.', requestId })
              return
            }

            sendJson(res, 200, {
              ...modelPayload,
              schemaVersion: '1.0',
              requestId: randomUUID(),
            })
          } catch (error) {
            const timedOut = error instanceof Error && error.name === 'AbortError'
            console.error(`[Iranwo AI] ${timedOut ? 'OpenRouter timeout' : 'OpenRouter connection error'}.`)
            sendJson(res, timedOut ? 504 : 502, {
              error: timedOut
                ? 'Gemma took too long to respond. Please retry.'
                : 'Could not connect to OpenRouter. Check your internet connection.',
            })
          } finally {
            clearTimeout(timeout)
          }
        })().catch(() => {
          if (!res.headersSent) sendJson(res, 500, { error: 'Unexpected local AI proxy error.' })
        })
      })
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [
      react(),
      tailwindcss(),
      localGemmaDevPlugin(env),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['icon.svg'],
        manifest: {
          name: 'Iranwo Health Companion',
          short_name: 'Iranwo',
          description: 'Help is closer than you think.',
          theme_color: '#F7F5EF',
          background_color: '#F7F5EF',
          display: 'standalone',
          start_url: '/',
          icons: [
            {
              src: '/icon.svg',
              sizes: 'any',
              type: 'image/svg+xml',
              purpose: 'any maskable',
            },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
          navigateFallback: 'index.html',
          cleanupOutdatedCaches: true,
        },
      }),
    ],
  }
})
