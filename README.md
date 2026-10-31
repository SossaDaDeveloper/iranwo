# Iranwo

**Help is closer than you think.**

Iranwo is a prototype health companion designed to help people understand general health information, organize what they are experiencing, and find sensible next steps. It is being developed with Nigerian users in mind, including support for English, Yorùbá, Nigerian Pidgin, Hausa, and Igbo interface text.

> **Project status: prototype.** Iranwo is not a hospital, emergency-dispatch service, medical device, or replacement for a qualified healthcare professional. Its warning-sign checks are experimental and are not a clinically validated triage system.

## Contents

- [What Iranwo does](#what-iranwo-does)
- [How it works](#how-it-works)
- [Technology](#technology)
- [Requirements](#requirements)
- [Installation](#installation)
- [Environment variables](#environment-variables)
- [Running and building](#running-and-building)
- [AI assistant setup](#ai-assistant-setup)
- [Supabase and clinic dashboard](#supabase-and-clinic-dashboard)
- [Offline behavior](#offline-behavior)
- [Privacy and security](#privacy-and-security)
- [Current limitations](#current-limitations)
- [Project structure](#project-structure)
- [Contributing](#contributing)

## What Iranwo does

The prototype is organized around a few main experiences:

- **Onboarding:** users choose a language and enter basic profile information, health context, and trusted contacts.
- **Health companion:** users can ask general health questions in a conversational interface.
- **Health profile:** users can review and update information they have chosen to save.
- **Warning-sign support:** a local safety screen checks messages for a limited set of urgent warning signs and can direct the user to emergency-help options.
- **Emergency actions:** users can open their device's phone dialer or messaging app to contact emergency services or a trusted person.
- **Care directory:** the prototype includes example clinic listings. These examples are not verified facility recommendations.

The project also contains development work for a Supabase-backed patient and clinic workflow. Its setup is described separately below because the AI prototype and the clinic-dashboard implementation are not yet a single, verified end-to-end workflow in every project snapshot.

## How it works

### 1. Onboarding and local profile

A user moves through onboarding, selects an interface language, and can add personal details, existing health conditions, notes, and trusted contacts. In the prototype, profile information and chat history are stored in the browser using `localStorage`.

`localStorage` is specific to the browser and device. It is not encrypted storage and does not automatically sync between devices.

### 2. Local safety check

Before an ordinary chat message is sent to the hosted AI model, the client runs a local warning-sign check. The rules look for a limited set of phrases associated with potentially urgent situations. A detected warning sign can bypass the AI request and show the emergency-help interface. Ambiguous matches may ask the user to clarify the context.

This check is a basic safety net, not a medical assessment. It can miss important symptoms and can also flag a phrase that is being discussed hypothetically. **A message that does not trigger an alert is not evidence that the person is safe.** Do not wait for Iranwo or an AI response during a possible emergency.

### 3. AI assistant

When the local safety check does not route the message to urgent-help options, the chat can send an ordinary request to the configured AI endpoint. The current development integration uses Gemma through OpenRouter.

The AI response is structured around six logical responsibilities:

1. **Conversation intent:** identifies whether the user is describing a current personal concern, another person, a hypothetical situation, or an educational question.
2. **Patient context:** identifies which explicitly shared profile details, if any, were used.
3. **Symptom analysis:** organizes the symptoms and details reported by the user, including missing information.
4. **Risk assessment:** describes uncertainty and any warning signs identified from the information supplied.
5. **Safety verification:** checks for contradictions, negation, hypothetical wording, and unsupported assumptions.
6. **Response and escalation:** prepares the user-facing response and suggests appropriate next steps or human support where relevant.

These are six logical roles in one structured model response, **not six separate AI agents or six separate model calls**. The model must not diagnose, prescribe medication, provide medication dosages, or claim that a person is safe. Model output is not a clinical decision.

For the current development flow, the browser sends the current message, up to eight previous chat turns, and the selected language. A separate opt-in can include limited profile context (age, sex, selected health conditions, and health notes). The user's name, phone number, and trusted contacts are not included in that AI request.

The current hosted-AI test is limited to English. Other interface languages do not automatically mean that AI-generated replies are supported or clinically reviewed in those languages.

### 4. Emergency and human-support actions

The emergency screen provides user-initiated actions. A `tel:` link opens the device dialer; an SMS link opens a draft in the device's messaging app. The user still has to place the call or send the message. The browser cannot silently place a call or guarantee that an SMS has been delivered.

The AI response itself does not place calls, send messages, create clinic requests, or dispatch emergency services.

The current demo human-support queue saves sample requests to the same browser's `localStorage`. It is for demonstrating the interface only: it does not notify a teammate, clinic, or responder, and it does not sync to another device.

### 5. Supabase clinic workflow (integration in progress)

A separate project implementation provides Supabase authentication, patient-to-clinic sharing, emergency-alert records, and a staff dashboard. In that implementation:

- A patient signs in and explicitly shares their profile with a clinic using an access code supplied by that clinic.
- A patient can revoke a clinic's access.
- Clinic staff accounts are provisioned by an administrator; staff do not self-register through the clinic portal.
- A staff account must have an active clinic membership before it can view that clinic's authorized records.
- Supabase Row Level Security (RLS) policies restrict which patient records and alerts each user can access.

**Important integration note:** the uploaded AI prototype uses a local demo-support flow, while the teammate's clinic-dashboard branch uses a separate Supabase schema. The dashboard is not connected to the local demo-support queue merely because the Supabase package is installed. The frontend components, authentication flow, database schema, and emergency-request workflow must all be integrated and tested together before describing this as a live clinic-alert service.

The Supabase instructions below refer to the teammate's `care_clinics` / `patient_emergency_alerts` implementation. Do not mix it with the alternate `clinics` / `emergency_requests` modules found in an earlier project snapshot; they are different database designs and require different server functions and migrations.

## Technology

- **React 18** for the user interface
- **TypeScript** for application code and type checking
- **Vite** for local development and production builds
- **Tailwind CSS** and project CSS for styling
- **Lucide React** for interface icons
- **vite-plugin-pwa** for the progressive web app shell and static asset caching
- **OpenRouter + Gemma** for the hosted AI prototype
- **Supabase JS** for authentication and database access in the clinic-dashboard integration

The hosted AI integration uses regular HTTP requests; it does not require `@huggingface/transformers`. That package is only needed if the project is deliberately configured to load a local Hugging Face model in the browser.

## Requirements

Install the following before running the project:

- Node.js (use a current supported LTS release)
- npm (included with Node.js)
- Git, if cloning the repository
- An OpenRouter API key to test the hosted AI feature
- A Supabase project only when working on the Supabase clinic-dashboard integration

## Installation

### 1. Clone the repository

```bash
git clone <YOUR_REPOSITORY_URL>
cd iranwo
```

Replace `<YOUR_REPOSITORY_URL>` with the actual Git repository URL.

### 2. Install dependencies

On Windows PowerShell, use `npm.cmd`:

```powershell
npm.cmd install
```

On macOS, Linux, or a terminal where `npm` works normally:

```bash
npm install
```

If you have copied the Supabase clinic-dashboard code into a project whose `package.json` does not already list the Supabase SDK, install it from the project root:

```powershell
npm.cmd install @supabase/supabase-js
```

You do not need `@huggingface/transformers` for the hosted OpenRouter integration.

### 3. Create your local environment file

Copy `.env.example` to `.env.local` in the project root.

Windows PowerShell:

```powershell
Copy-Item .env.example .env.local
```

macOS/Linux:

```bash
cp .env.example .env.local
```

Add your own development values to `.env.local`. Do not commit this file.

### 4. Configure the AI provider

Create or use an OpenRouter API key, then add it to `.env.local`:

```env
OPENROUTER_API_KEY=your_openrouter_api_key
OPENROUTER_MODEL=google/gemma-4-26b-a4b-it
OPENROUTER_SITE_URL=http://localhost:5173
OPENROUTER_APP_NAME=Iranwo Health Companion
```

Keep `OPENROUTER_API_KEY` server-side. Never rename it to a `VITE_` variable: Vite exposes variables prefixed with `VITE_` to browser code.

The current OpenRouter proxy is registered in the Vite development server for local testing. It is not a production API server and must not be exposed as one.

### 5. Configure the emergency and demo-support contact values

The following are optional public app settings:

```env
VITE_IRANWO_EMERGENCY_NUMBER=112
VITE_IRANWO_SUPPORT_NAME=Iranwo demo support contact
VITE_IRANWO_SUPPORT_PHONE=+2348012345678
```

Replace the support name and number only with a person's details when that person has agreed to be the demo contact. Use international phone format (E.164), for example `+2348012345678`.

These `VITE_` values are included in the browser build. They must not contain passwords, API keys, service-role keys, or other secrets. The emergency number is a configurable placeholder; verify the correct emergency routing and availability for the actual deployment area before release.

### 6. Configure Supabase (only when the clinic integration is merged)

1. Create a Supabase project.
2. In the Supabase project's API/Connect settings, copy the Project URL and the public publishable key.
3. Add them to `.env.local`:

   ```env
   VITE_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key
   ```

4. In the teammate's clinic-dashboard implementation, use **one** database setup path:
   - For a new Supabase project, run `supabase/schema.sql` in the Supabase SQL Editor.
   - For an existing project that already has `public.user_profiles`, review and run `supabase/migrations/20261031_clinic_dashboard.sql` as appropriate.
5. Restart the Vite server after changing environment variables.
6. Configure the local and deployed app URLs in Supabase Authentication's allowed redirect URLs if email confirmation is enabled.

The Supabase browser client must use a publishable/anon key with appropriate RLS policies. **Never put a Supabase `service_role` key in a `VITE_` variable or in frontend code.**

#### Provisioning clinic staff

The teammate's dashboard implementation does not allow staff self-registration. A Supabase administrator must invite or create the staff Auth user, create the clinic record, and add that user's UUID to `public.clinic_staff` with an active role. Patients then grant the clinic access using its access code. Follow the SQL and instructions in the matching Supabase branch README; do not create staff memberships from an untrusted client.

#### Supabase integration is not complete until verified

Installing `@supabase/supabase-js` and adding environment variables do not, by themselves, connect the AI prototype to the clinic dashboard. Confirm that the active `src/App.tsx` imports and renders the Supabase-backed screens, that the selected schema matches the frontend queries, and that patient sharing and staff authorization work under RLS. Test with synthetic accounts and synthetic health information only.

## Running and building

Start the local development server:

```powershell
npm.cmd run dev
```

Vite prints the local URL in the terminal, usually `http://localhost:5173`.

Type-check and create a production build:

```powershell
npm.cmd run build
```

Preview the generated build locally:

```powershell
npm.cmd run preview
```

The OpenRouter proxy described above is development-only. A successful `npm run build` does not create a production AI backend. A deployed app needs a protected server endpoint that authenticates requests, verifies consent, rate-limits usage, validates model output, and keeps provider credentials on the server.

### PowerShell note

If PowerShell reports that `npm.ps1` cannot be loaded because script execution is disabled, use `npm.cmd` instead of changing the machine's execution policy:

```powershell
npm.cmd install
npm.cmd run dev
npm.cmd run build
```

## Offline behavior

The app is configured as a Progressive Web App (PWA), and its service worker can cache the application shell and selected static assets. This does **not** mean every feature works offline:

- Locally stored profile information and the local warning-sign check can be available in the current browser after the app has loaded, subject to browser storage and service-worker behavior.
- Hosted AI responses require an internet connection.
- Supabase sign-in, cloud profile sync, and clinic-dashboard data require an internet connection.
- The PWA does not automatically download or run the hosted Gemma model on the user's device.

Do not advertise the current hosted AI integration as an offline AI assistant.

## Privacy and security

Iranwo may handle sensitive information. The prototype is not ready for real patient data.

- Browser `localStorage` is not encrypted and may be accessible to anyone using the same browser profile or device.
- Do not use real patient details when testing the hosted AI integration. Use synthetic test profiles and messages.
- The AI integration sends the current message and up to eight previous turns to the configured provider. Limited profile context is sent only after a separate opt-in in the relevant AI flow. Name, phone number, and trusted contacts are excluded from the AI payload described by the prototype contract.
- Review the current terms, privacy practices, and healthcare-use permissions of the actual model provider and inference route before sending health information. Using OpenRouter does not automatically mean every underlying provider/model route is approved for healthcare use.
- A client-side consent checkbox is not a substitute for server-side consent records, authentication, privacy controls, or a retention/deletion policy.
- Use Supabase RLS and server-side authorization. Never rely only on hiding a dashboard screen in the frontend.
- Do not commit `.env.local`, API keys, passwords, service-role keys, or private credentials. Rotate any credential that has been exposed in a commit, log, screenshot, or shared archive.

Before a real-world launch, the project needs security and privacy review, clinical review of warning-sign wording, language review by fluent speakers, verified clinic data, approved provider terms, monitoring, incident handling, and a tested human response process.

## Current limitations

- The warning-sign rules are a small phrase-based prototype and are not clinically validated.
- A negative safety check cannot rule out an emergency.
- AI-generated messages may be inaccurate, incomplete, or inappropriate. They are general information only, not diagnosis or treatment.
- The hosted AI test currently supports English only; the other language options are interface translations, not proof of AI or clinical-language support.
- Clinic directory entries in the prototype are examples and must be verified before use.
- Dialer and SMS links require the user to complete the action. Iranwo cannot confirm call connection or message delivery.
- The local human-support demo dashboard stores requests on one browser only and does not notify an actual responder.
- The Supabase clinic dashboard belongs to a separate integration path and must be verified against the active application and selected database schema before use.
- The current Vite AI proxy is for local development only and is not suitable for deployment.

## Project structure

The exact file tree may change as features are integrated. The main areas include:

```text
iranwo/
├── docs/                 # AI backend contract, setup notes, safety test cases
├── public/               # Static assets and PWA icons
├── src/
│   ├── components/       # Onboarding and reusable UI components
│   ├── features/
│   │   ├── ai/           # AI request gateway, response types and orchestration
│   │   ├── app/          # Main application screens
│   │   ├── emergency/    # Emergency actions and related helpers
│   │   ├── profile/      # Profile types and browser persistence
│   │   └── safety/       # Local warning-sign rules and safety UI
│   ├── data/             # Prototype clinic/contact data
│   ├── App.tsx           # Main application entry component
│   ├── main.tsx          # React entry point
│   └── styles.css        # Global styling
├── supabase/             # SQL schema and migrations, when integrated
├── .env.example          # Environment variable template
├── index.html
├── package.json
└── vite.config.ts
```

Some Supabase modules in the teammate's branch may be stored under `src/features/clinic`, `src/features/profile`, and `src/supabase.ts` instead. Use the actual structure in the checked-out branch rather than assuming every folder above exists in every branch.

## Contributing

1. Create a feature branch before making changes.
2. Keep AI provider credentials and other secrets out of source code and Git history.
3. Use synthetic data for development and testing.
4. Keep deterministic safety handling independent from model output.
5. Do not claim that a call, SMS, clinic request, or human response occurred unless the relevant service confirms it.
6. Run `npm.cmd run build` before opening a pull request and describe any tests that were not run.
7. For changes to the AI request/response format, update `docs/AI_BACKEND_CONTRACT.md` and add or update safety test cases.

---

**Iranwo is a prototype under active development.** Its purpose is to make health information and appropriate next steps easier to access, while keeping clear boundaries between AI assistance and professional medical care.
