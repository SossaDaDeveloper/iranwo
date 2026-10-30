# Iranwo Next — interactive healthcare prototype

A responsive React + TypeScript application with a custom SVG doctor/stethoscope welcome logo, onboarding, language selection (English, Yoruba, Nigerian Pidgin, Hausa and Igbo), required name/age/sex, condition-specific animated cards, country-aware phone entry, trusted contacts, animated completion, dashboard, prototype chat, demo clinic listings and an SOS screen.

## Run locally
```powershell
npm.cmd install
npm.cmd run dev
```
Build and preview:
```powershell
npm.cmd run build
npm.cmd run preview
```

## Important implementation notes
- User profile and contacts are stored in browser `localStorage`. This is not encrypted storage. Avoid entering sensitive health details on a shared device.
- The five languages have translated interface copy, but clinical wording should be reviewed by fluent native speakers before a real-world launch. Language selection does not automatically translate model-generated medical responses; that requires multilingual model prompting or a translation/localization layer.
- The chat is a local demo responder, not a connected AI model and not a medical diagnostic tool.
- Clinic records are fictional examples and must not be represented as verified nearby facilities.
- The emergency number defaults to `112` as a configurable placeholder. Verify local emergency routing, deployment region and availability before release.
- SOS opens the phone dialer with a `tel:` link after a user tap. Trusted-contact calling and SMS are also user-initiated. A browser cannot reliably call multiple people or send SMS silently in the background. Do not represent a call or alert as completed unless the receiving service confirms it.
- Real automated notifications require a backend, explicit consent, verified contacts, delivery receipts, retries and a monitored emergency response workflow. Do not place private API keys in client-side environment variables.
- The optional `VITE_IRANWO_API_BASE_URL` is a placeholder for future backend integration; no emergency backend is included.
- Country phone input applies a simple per-country digit count for the included sample countries. For production-grade international validation, use a maintained phone-number library such as `libphonenumber-js`.
- Animations respect `prefers-reduced-motion`.
