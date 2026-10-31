# Start here: Iranwo AI setup

This is the first AI-integration pass on the uploaded Iranwo project snapshot.

## What is now wired

1. The active chat checks each new message with the local safety rules before any model request.
2. Detected emergency/urgent messages bypass the model and display the app's safety action panel. Ambiguous warning-sign mentions ask for clarification first.
3. The six specialist roles have a typed response contract and strict client-side JSON validation.
4. A local Vite development proxy calls hosted Gemma 4 through Novita. Your teammate's clinic/dashboard backend is not required for this test.
5. Conversation processing requires a user opt-in. A separate optional checkbox controls whether age, sex, selected conditions and health notes are added to the request.
6. The app never sends profile name, phone number or trusted contacts to the model.
7. In development mode, the app exposes the six role assessments in a collapsible diagnostics panel after a model response.

## Run the project

On Windows PowerShell:

```powershell
npm.cmd install
npm.cmd run build
npm.cmd run dev
```

## Connect Gemma 4 for local development (prototype only)

This project includes a Vite development-server proxy for Novita AI. It keeps the provider key out of browser code and does not require your teammate's clinic/dashboard backend to be ready.

1. Create a Novita account at https://novita.ai.
2. Open **Key Management** in the account settings and create/copy an API key.
3. Copy `.env.example` to `.env.local` in the project root.
4. Put the key in `.env.local`:

```env
NOVITA_API_KEY=your_real_key_here
NOVITA_MODEL=google/gemma-4-26b-a4b-it
```

5. Restart `npm.cmd run dev` after saving `.env.local`.
6. Open the app on the same computer at `http://localhost:5173` and go to Chat.
7. Accept conversation processing. Optionally tick the separate health-profile checkbox to include age, sex, conditions, and health notes.
8. Use fictional names and synthetic health scenarios only. The provider's healthcare-use approval has not been confirmed.

The local proxy exposes `GET /api/ai/health` for configuration status and `POST /api/ai/assistant` for chat. It accepts requests only from loopback/local browser origin and is registered only in Vite's development server. It is not a production backend. It does not save user information, authenticate users, or connect to the clinic dashboard.

### Why Novita instead of Google AI Studio?

Google's current Gemini API Additional Terms explicitly prohibit using that API to provide medical advice. Google's Cloud generative-AI service terms also contain healthcare restrictions. This project therefore does not call Google's Gemini API directly. Novita currently lists Gemma 4 26B A4B as a hosted, OpenAI-compatible model. Its public terms and AUP reviewed for this prototype do not show the same explicit medical-advice ban, but they do not amount to written approval for a healthcare product. Do not send real patient information or deploy this for real users until Novita confirms the intended use in writing and the data-protection requirements have been reviewed.

### Local development vs deployment

- `.env.local` holds the API key and is ignored by Git.
- `vite.config.ts` reads the key on the server side and forwards requests to Novita.
- The browser only calls `/api/ai/assistant`; it never receives the key.
- This proxy is only for testing from your own computer. For deployment, move the same provider call into a properly secured API service or function.
- Emergency/urgent messages caught by the local safety engine bypass Gemma, even when the AI-processing consent box is unchecked. Ordinary messages require consent before model processing. Test those cases separately from model responses.
- The profile-context checkbox sends only age, sex, saved conditions, and health notes. It never sends name, phone number, or trusted contacts. Keep it off unless you are intentionally testing with synthetic profile data.

## Connect the clinic/storage backend later

The clinic dashboard, authentication, and persistent user records remain separate. When your teammate's backend is ready, it can own the durable profile/consent records and expose a protected AI endpoint. It should not blindly trust consent values supplied by the browser. Keep provider keys server-side and reuse the existing request/response contract.
