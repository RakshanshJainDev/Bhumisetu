# Bhusetu — SIH26018 Land Record Digitization & Validation

## What this repo implements
- Public read-only search over `finalRecords`.
- Firebase Authentication + custom-claim roles (`primary`, `admin`).
- Primary upload of JPG/PNG/PDF to Firebase Storage.
- Server-side Gemini OCR/extraction through Cloud Functions; the Gemini key is never shipped to the browser.
- Structured JSON extraction + field confidence scoring.
- Automatic publication only when **every required field confidence is >80%**.
- Manual review workspace for lower-confidence records.
- Hidden server-side audit metadata: the uploader is captured through the authenticated UID; add a non-public username mapping in `/users/{uid}` if your admin system needs it.
- Admin database changes are placed in `adminChangeQueue` with a 24-hour `effectiveAt` timestamp. A production scheduler should run `applyDueAdminChanges` (or replace it with a scheduled Cloud Function) to apply due changes.

## Important security correction
Do **not** implement a client-side “backdoor” such as `admin + phone 26018 + blank password/email`. It is not compatible with a secure, non-bypassable authentication requirement because anyone who learns those values can impersonate the administrator. Use a dedicated Firebase Auth admin account and assign the `admin` custom claim server-side.

Firebase recommends custom claims for role-based access control and Security Rules for enforcement. App Check can also be enabled for the web app. See the official Firebase docs for both. 

## Setup
1. Create a Firebase project and register a Web App.
2. Enable Email/Password Authentication, Firestore, Storage, and Cloud Functions.
3. Copy `.env.example` to `.env` and fill Firebase web config values.
4. Install frontend dependencies: `npm install`.
5. Install function dependencies: `cd functions && npm install && cd ..`.
6. Set Gemini secret: `firebase functions:secrets:set GEMINI_API_KEY`.
7. Deploy Firestore/Storage rules and functions: `firebase deploy --only firestore:rules,storage,functions`.
8. Set a `role` custom claim on an operator (`primary`) or administrator (`admin`) using a trusted server/Admin SDK script. The web client must never be allowed to choose its own role.
9. Build: `npm run build`.
10. Deploy `dist` to Netlify. If deploying functions separately on Firebase, keep the frontend's callable Functions region as `asia-south1`.

## Firebase user profile mapping
Create `/users/{uid}` with non-public fields such as `{ username, phone, email }`. Keep that document unreadable to other users via the included rules. The login form collects the four fields, but the reference implementation uses Firebase Auth email/password as the actual authentication factor and role claims for authorization. If your SIH rubric requires checking username/phone too, perform that check in a trusted callable function against `/users/{uid}` after Firebase sign-in; never use browser-side comparison as a security control.

## Gemini schema
The function uses the current `@google/genai` Interactions API with multimodal input and structured JSON output. PDFs/images are uploaded through Gemini's Files API from the Cloud Function. Gemini's current docs document these flows and recommend the Interactions API for new applications.

## Demo data
You can create demo `finalRecords` manually in Firestore, for example:
```json
{
  "ownerName":"Ramesh Kumar",
  "surveyNumber":"GJ-12-345",
  "location":"Udaipurwati",
  "pincode":"313001",
  "area":"0.84 hectare",
  "landType":"Agricultural",
  "language":"Hindi"
}
```

## Netlify vs Firebase
Netlify hosts the React SPA. Firebase provides Auth/Firestore/Storage/Functions. This preserves a zero-managed-server frontend deployment while keeping sensitive API operations off the client.
