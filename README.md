# Iranwo Next — interactive healthcare prototype

A responsive React + TypeScript application with a custom SVG doctor/stethoscope welcome logo, onboarding, language selection (English, Yoruba, Nigerian Pidgin, Hausa and Igbo), required name/age/sex, condition-specific animated cards, country-aware phone entry, trusted contacts, animated completion, dashboard, prototype chat, demo clinic listings and an SOS screen.

## Run locally
```powershell
npm.cmd install
npm.cmd run dev
```

## Connect Supabase
1. Create a Supabase project and open its SQL Editor.
2. If `public.user_profiles` already exists, open [`supabase/migrations/20261031_clinic_dashboard.sql`](./supabase/migrations/20261031_clinic_dashboard.sql), copy the entire file into a new SQL Editor query, and run it. The migration checks the profile columns used by Iranwo, leaves existing profile rows untouched, and creates the clinic tables and RLS policies in a transaction. It fails before making changes if it finds an unrecognized existing RLS policy on an affected table; review that policy before adapting the migration rather than blindly removing it. If setting up a fresh project instead, run [`supabase/schema.sql`](./supabase/schema.sql).
3. Copy `.env.example` to `.env` and set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` from the Supabase project's Connect/API settings. The legacy `VITE_SUPABASE_ANON_KEY` name is also accepted.
4. Restart the Vite dev server. New users see account creation first; they can continue in device-only mode when Supabase is not configured.
5. If email confirmation is enabled, confirm the signup email and then sign in. Set the app's local and deployed URLs in Supabase Auth's allowed redirect URLs.

The app copies the existing device profile to a new Supabase account when that account has no profile yet. Later profile edits sync automatically. The Supabase client uses only a publishable/anon key; never put a `service_role` or other private key in a `VITE_` variable. If you have enabled email confirmation, profile sync begins when you sign in after confirmation.

Patient profile JSON can contain sensitive health and trusted-contact information. Patients can share it with a clinic from **Profile → Share with a clinic** using an access code supplied by that clinic, and can revoke access there. The app verifies access codes through `find_clinic_by_access_code`, which returns only the matching clinic ID and name; authenticated clients do not have direct `SELECT` access to `care_clinics.access_code`. Existing grants are listed through `get_my_clinic_grants`, which returns only the signed-in patient's own grants. Row-level security restricts clinic access to an active staff membership plus an unrevoked patient grant. Never disable those policies or put a `service_role` key in the browser. This prototype is not a substitute for a security, privacy, and regulatory review before production use.

## Clinic dashboard prototype

- Choose **Clinic staff sign in** on the welcome screen to open the separate clinic workspace. The portal is sign-in only; it has no staff self-registration. Patients continue to use the normal patient account flow.
- A Supabase administrator must first create the clinic and invite/create each staff Auth user. In the Supabase Dashboard, open **Authentication → Users** and invite the staff email (or create the user); copy the resulting Auth user UUID. In **SQL Editor**, create the clinic and then attach the staff UUID to it. Run this as a Supabase administrator, not from client-side code:

  ```sql
  -- Run once per clinic; copy the returned id for the membership statement.
  insert into public.care_clinics (name, access_code)
  values ('Example Clinic', 'REPLACE-WITH-A-UNIQUE-CODE')
  returning id;

  -- Run once per staff user after replacing both UUIDs.
  insert into public.clinic_staff (clinic_id, user_id, role)
  values ('REPLACE-WITH-CLINIC-UUID', 'REPLACE-WITH-AUTH-USER-UUID', 'admin');
  ```

- Staff then sign in through **Clinic Portal**. A Supabase login without an active `clinic_staff` membership does not expose patient records. Patients separately grant access to that clinic using the access code.
- Patients sign into their Iranwo account, sync their profile, and enter the clinic's access code in their profile to share. Profiles stored only in browser localStorage are not available to clinic staff. Existing legacy browser health-profile fields are imported into the current local profile; when a new cloud account has no existing profile, the normal first-sync uploads them. They are not merged into an existing cloud profile, to avoid mixing health information between accounts.
- Creating or signing into a patient account does not grant clinic membership. The dashboard checks for an active `clinic_staff` membership and Supabase RLS independently restricts records to patients who have granted access to that clinic. Never grant staff membership to unverified users; frontend hiding alone is not an authorization boundary.
- A patient can explicitly share an emergency alert with all clinics they currently authorize from the SOS screen. The prototype does not send location, call an ambulance, notify trusted contacts, or contact emergency services. Alerts are not guaranteed to be monitored in real time.
- Dashboard counts include only the records currently shared with the clinic under RLS. Registration dates reflect cloud profile-row creation, not the original Auth signup time; dates are `Not available` for existing rows where a timestamp was not stored. Response metrics use recorded alert-response events only.
- **Preview the dashboard with mock data** is available from the clinic sign-in page. Demo patient and alert records are separately labeled and never merged into Supabase data.
- The patient-sharing form validates codes through a restricted database function. Use long, high-entropy access codes and establish a secure invitation workflow and rate limits before production.

Build and preview:
```powershell
npm.cmd run build
npm.cmd run preview
```

## Important implementation notes
- Without a Supabase account, the profile remains in browser `localStorage`, which is not encrypted storage. When signed in, the profile is also synced to Supabase. Avoid entering sensitive health details on a shared device.
- The five languages have translated interface copy, but clinical wording should be reviewed by fluent native speakers before a real-world launch. Language selection does not automatically translate model-generated medical responses; that requires multilingual model prompting or a translation/localization layer.
- The chat is a local demo responder, not a connected AI model and not a medical diagnostic tool.
- Clinic records are fictional examples and must not be represented as verified nearby facilities.
- The emergency number defaults to `112` as a configurable placeholder. Verify local emergency routing, deployment region and availability before release.
- SOS opens the phone dialer with a `tel:` link after a user tap. Trusted-contact calling and SMS are also user-initiated. A browser cannot reliably call multiple people or send SMS silently in the background. Do not represent a call or alert as completed unless the receiving service confirms it.
- Real automated notifications require a backend, explicit consent, verified contacts, delivery receipts, retries and a monitored emergency response workflow. Do not place private API keys in client-side environment variables.
- The optional `VITE_IRANWO_API_BASE_URL` is a placeholder for future backend integration; no emergency backend is included.
- Country phone input applies a simple per-country digit count for the included sample countries. For production-grade international validation, use a maintained phone-number library such as `libphonenumber-js`.
- Animations respect `prefers-reduced-motion`.
