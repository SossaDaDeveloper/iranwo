# Iranwo AI backend contract — v1

This contract connects the React client to a server-side AI implementation. The browser must never contain a model-provider API key.

## Endpoint

For local development, the Vite server exposes `POST /api/ai/assistant` and forwards requests to Novita. The provider key is read only by the Vite server from `.env.local`. For production, set `VITE_IRANWO_AI_ENDPOINT` to a protected backend endpoint; do not deploy the development proxy.

## Request body

```json
{
  "schemaVersion": "1.0",
  "message": "I have had a headache since this morning.",
  "history": [
    { "role": "assistant", "text": "What would you like to understand today?" }
  ],
  "language": "en",
  "includeProfileContext": true,
  "profileContext": {
    "age": 24,
    "sex": "Prefer not to say",
    "conditions": ["Asthma"],
    "notes": "Synthetic test profile. No real patient data."
  },
  "consent": {
    "accepted": true,
    "policyVersion": "iranwo-ai-processing-v1",
    "acceptedAt": "2026-10-30T12:00:00.000Z"
  }
}
```

The current local development proxy accepts the current message, at most eight previous chat turns, the selected language, and (only after a separate user opt-in) a limited profile context containing age, sex, selected health conditions, and health notes. Name, phone number, country, and trusted contacts are never included. The production backend must retrieve stored profile context only for the authenticated user and only after verified consent; do not trust a browser-supplied profile or consent flag.

## Successful response body

Return one JSON object matching `IranwoAIResponse` in `src/features/ai/agent.types.ts`:

```json
{
  "schemaVersion": "1.0",
  "requestId": "server-generated-id",
  "assistantMessage": "A concise, cautious, non-diagnostic response for the user.",
  "agents": {
    "conversationIntent": {
      "category": "current_personal",
      "subject": "user",
      "timeContext": "current",
      "summary": "The user is describing a current concern."
    },
    "patientContext": {
      "contextUsed": true,
      "fieldsUsed": ["age", "conditions"],
      "summary": "The synthetic profile indicates asthma; this is user-reported context, not verified.",
      "unknowns": ["Medication and asthma control status were not provided"]
    },
    "symptomAnalysis": {
      "symptoms": ["headache"],
      "onset": "This morning",
      "duration": "Since this morning",
      "severity": null,
      "associatedSymptoms": [],
      "missingInformation": ["Severity", "Other symptoms"]
    },
    "riskAssessment": {
      "level": "uncertain",
      "warningSigns": [],
      "limitations": "A text conversation cannot establish a diagnosis or rule out an emergency."
    },
    "safetyVerification": {
      "checkedNegation": true,
      "checkedHypotheticalContext": true,
      "contradictions": [],
      "assumptionsAvoided": ["No diagnosis inferred"]
    },
    "responseEscalation": {
      "responseType": "clarification",
      "humanSupportRecommended": false,
      "actionSummary": "Ask about severity and associated symptoms; advise professional help for severe or worsening symptoms.",
      "followUpQuestion": "How severe is the headache, and do you have any other symptoms?"
    }
  }
}
```

All six roles are specialist responsibilities in one structured model response for the MVP, not six separate model calls. Return concise assessment summaries, not hidden chain-of-thought.

## Required server behavior

- Keep provider credentials and the full system prompt on the server. Never create `VITE_*API_KEY` values. The current `vite.config.ts` includes a local-only Novita proxy for development; do not expose that proxy publicly.
- Authenticate/rate-limit requests as appropriate for the application's auth design. The frontend's consent flag is not a substitute for server-side authorization or consent records.
- Confirm in writing that the selected provider permits Iranwo's intended health-information and symptom-support use. Novita is currently used only for synthetic local-development tests; the published AUP does not show an explicit medical-advice prohibition, but that is not written healthcare-use approval. Do not send real patient information until the provider and data-protection reviews are complete.
- Treat model output as untrusted. Validate the six-role structure, enforce output limits, and return only the documented schema.
- Never diagnose, prescribe, provide medication dosage, claim a person is safe, or claim anyone has been contacted.
- The deterministic safety screen in the client runs before this endpoint, even when model-processing consent has not been accepted, and cannot be downgraded by model output. Ordinary model requests require explicit consent. The backend must also avoid overriding urgent user safety instructions.
- Do not send clinic requests, call contacts, or dispatch emergency services from the AI response. Those require separate user action and the existing emergency-request consent flow.
- Return meaningful HTTP errors: `401/403` for authorization/consent, `429` for rate limits, and `5xx` for temporary provider failures.
- Log request IDs and operational metadata, not unnecessary raw symptom text. Apply an appropriate retention/deletion policy before collecting real health information.

## Current development setup

- Local test provider: Novita AI, OpenAI-compatible endpoint `https://api.novita.ai/openai/v1/chat/completions`.
- Default model: `google/gemma-4-26b-a4b-it`.
- The Vite dev proxy reads `NOVITA_API_KEY` from `.env.local`; it accepts loopback requests only.
- Set `NOVITA_MODEL` to `google/gemma-4-31b-it` to test the 31B model if the account has access and the additional cost is acceptable.
- The local proxy is not an authentication, persistence, or production server.

## Current client limitations

- The local Novita proxy currently supports English only; other selected languages remain blocked until their data-processing notices and model quality are reviewed.
- The profile context is opt-in and limited to age, sex, selected conditions, and notes. The client never sends name, phone number, or trusted contacts.
- The local dev proxy is loopback-only and has no user authentication, durable consent ledger, rate-limit policy, audit workflow, or data-retention controls suitable for production.
- A model response is not a diagnosis, a clinical triage result, or proof that a person is safe.
