### Calorie Tracker (React Native + React Native Web, **no Expo**)

Cross‑platform app (iOS / Android / Web) that calculates a daily caloric surplus/deficit and syncs all local WatermelonDB data through Firebase Cloud Functions + Firestore.

### Repo layout

- **`apps/mobile`**: React Native CLI app (iOS/Android native projects included)
- **`apps/web`**: Vite + React + React Native Web (runs the same shared app UI)
- **`packages/core`**: shared calculations + types + runtime config loader
- **`packages/db`**: WatermelonDB schema/models/CRUD + Watermelon sync client
- **`packages/app`**: shared UI (Summary/Inputs/Goals + Settings) + Firebase auth + sync/background wiring
- **`functions`**: Firebase Cloud Functions (Express API): `profile/me`, `sync/pull`, `sync/push`, `ai/text`, `ai/photo`

### High-level architecture

- **Local-first UI**: All screens read/write **local WatermelonDB** tables.
- **Sync**: The app calls Cloud Functions `pullChanges` / `pushChanges` to sync WatermelonDB across devices (Firestore is the backend store).
- **Auth**: Firebase Google sign-in. After login, the client calls `GET /profile/me` which creates/returns a **UUID `userId`** stored in Firestore and used to scope all DB rows and sync routes.
- **Background tasks** (mobile): `react-native-background-fetch` runs every ~15 minutes and:
  - iOS: reads HealthKit metrics (currently stubbed, see below) and populates last 90 days if empty
  - all platforms: triggers a sync

---

### 1) Prerequisites

- Node.js **20+**
- Yarn (recommended) or npm
- **iOS**: Xcode + CocoaPods
- **Android**: Android Studio + SDKs
- Firebase CLI: `npm i -g firebase-tools`

---

### 2) Install dependencies

From repo root:

```bash
npm install
```

---

### 3) Firebase setup (required)

In the Firebase console:

- Create a Firebase project
- Enable **Authentication → Google** provider
- Create a **Web App** (for Web + RN JS SDK config)

You’ll need your Firebase web config values:

- `FIREBASE_API_KEY`
- `FIREBASE_AUTH_DOMAIN`
- `FIREBASE_PROJECT_ID`
- `FIREBASE_STORAGE_BUCKET`
- `FIREBASE_MESSAGING_SENDER_ID`
- `FIREBASE_APP_ID`

---

### 4) Runtime configuration (local dev)

#### Mobile (React Native)

Create:

- Copy `config/env.local.json.example` → `config/env.local.json`
- Fill in the values

The mobile app injects `config/env.local.json` into `globalThis.__APP_CONFIG__` at startup (see `apps/mobile/App.tsx`).

#### Web (Vite)

Create `apps/web/.env.local` (Vite only exposes vars prefixed with `VITE_`):

```bash
VITE_BACKEND_BASE_URL=http://localhost:5001/YOUR_PROJECT_ID/us-central1/api
VITE_BACKEND_API_KEY=changeme
VITE_GOOGLE_WEB_CLIENT_ID=changeme

VITE_FIREBASE_API_KEY=changeme
VITE_FIREBASE_AUTH_DOMAIN=changeme
VITE_FIREBASE_PROJECT_ID=changeme
VITE_FIREBASE_STORAGE_BUCKET=changeme
VITE_FIREBASE_MESSAGING_SENDER_ID=changeme
VITE_FIREBASE_APP_ID=changeme
```

---

### 5) Cloud Functions (API + Sync + AI)

#### Env vars / secrets

Functions expect these environment variables at runtime:

- `BACKEND_API_KEY`: required for all API calls (`x-api-key`)
- `GEMINI_API_KEY`: required for AI endpoints (`/ai/text`, `/ai/photo`)

For local emulators, run:

```bash
cd functions
BACKEND_API_KEY=changeme GEMINI_API_KEY=changeme firebase emulators:start --only functions
```

The API is exported as `api` at:

- `http://localhost:5001/<PROJECT_ID>/us-central1/api`

#### API routes

- `GET /healthz`
- `GET /profile/me` (auth + api key): returns `{ userId, authUid, name, email, photoURL }`
- `GET /sync/pull?userId=...&since=...` (auth + api key): WatermelonDB pullChanges contract
- `POST /sync/push` (auth + api key): WatermelonDB pushChanges contract
- `POST /ai/text` (auth + api key): Gemini text → `{ items: [...] }`
- `POST /ai/photo` (auth + api key): Gemini vision → `{ items: [...] }`

---

### 6) Run Web

```bash
cd apps/web
npm run dev
```

---

### 7) Run iOS (simulator)

1) Install pods:

```bash
cd apps/mobile/ios
bundle install
bundle exec pod install
cd ..
```

2) Run:

```bash
cd apps/mobile
npm run ios
```

If you see UUID/randomness errors at runtime, this project already loads the required polyfill (`react-native-get-random-values`) in `apps/mobile/index.js`.

#### iOS permissions already added

`apps/mobile/ios/CalorieTracker/Info.plist` includes usage strings for:

- Camera / Photo Library
- HealthKit (read/write)

#### HealthKit integration status

The HealthKit pipeline is **wired** (background fetch → read metrics → write Watermelon rows), and the app is safe to run without Health permissions. When HealthKit is not available/authorized, metrics default to zeros.

The Health reader implementation lives in `packages/app/src/state/health/iosHealth.native.ts`.

#### Google Sign-In (iOS) setup (required for login)

This project uses `@react-native-google-signin/google-signin` + Firebase Auth.

1) In Google Cloud / Firebase, ensure you have OAuth client IDs:
   - **Web client ID** (put into `GOOGLE_WEB_CLIENT_ID`)
   - **iOS client ID** (used to configure the iOS URL scheme)

2) Add your Web client ID to config:
   - `config/env.local.json` → `GOOGLE_WEB_CLIENT_ID`

3) Add iOS URL scheme (Xcode):
   - Open `apps/mobile/ios/CalorieTracker.xcodeproj`
   - Target → **Info** → **URL Types**
   - Add a URL scheme equal to your **REVERSED_CLIENT_ID** (from GoogleService-Info.plist or the iOS OAuth client)

If you skip this step, the app will build but Google sign-in will fail at runtime.

#### iOS Google Sign-In short checklist (do these in order)

- **1) Create Firebase + enable Google auth**
  - Firebase Console → **Authentication** → **Sign-in method** → enable **Google**

- **2) Get the Web Client ID**
  - Google Cloud Console → **APIs & Services** → **Credentials**
  - Find an **OAuth 2.0 Client ID** of type **Web application**
  - Copy the value that looks like: `123...abc.apps.googleusercontent.com`
  - Put it into:
    - `config/env.local.json` → `GOOGLE_WEB_CLIENT_ID`
    - `apps/web/.env.local` → `VITE_GOOGLE_WEB_CLIENT_ID`

- **3) Create/register an iOS OAuth client**
  - In the same **Credentials** screen, create (or locate) an **OAuth client ID** of type **iOS**
  - Ensure its **Bundle ID** matches your Xcode bundle identifier for `apps/mobile` (default is `com.calorietracker`)

- **4) Add the iOS URL scheme (REVERSED_CLIENT_ID)**
  - Best path: Firebase Console → Project settings → add an **iOS app** → download **GoogleService-Info.plist**
  - Open the plist and copy `REVERSED_CLIENT_ID`
  - In Xcode:
    - `apps/mobile/ios/CalorieTracker.xcodeproj` → Target → **Info** → **URL Types**
    - Add a URL scheme equal to `REVERSED_CLIENT_ID`

- **5) Run and test**
  - `npm run functions:serve`
  - `npm run web:dev` (web sign-in uses popup)
  - `cd apps/mobile && npm run ios` (native sign-in uses the Google Sign-In native module)

---

### 8) Run Android (emulator)

```bash
cd apps/mobile
npm run android
```

Android permissions were added in:

- `apps/mobile/android/app/src/main/AndroidManifest.xml` (camera + photo access)

---

### 9) WatermelonDB notes

Tables are defined in `packages/db/src/schema.ts` and include common columns:

- `id` (UUID primary key)
- `userId` (UUID scoping all rows)
- `lastUpdated` (number timestamp, used for sync)
- `updated_at` (WatermelonDB updated timestamp)

All UI reads/writes WatermelonDB locally and syncs through the Functions API.

---

### 10) Background tasks

Mobile uses `react-native-background-fetch` in:

- `packages/app/src/state/background/BackgroundController.native.tsx`

Behavior:

- Runs approximately every 15 minutes
- iOS: if `ios_health_tracker` table is empty, populates last 90 days, otherwise updates today
- Then calls WatermelonDB sync

Web/Android: health tracking is skipped; sync is still active.

---

### 11) Security model

- All API routes require:
  - **Firebase ID token** in `Authorization: Bearer ...`
  - **API key** in `x-api-key`
- Sync routes also verify the provided `userId` matches the authenticated user’s mapping (`authUidToUserId/{authUid}`).

---

### 12) Optional enhancements

- **AI review editing**: add “edit AI item → prefilled manual form”
- **AI photo on native**: add a native image picker flow (Web already supports file picker)
- **Goal inspection graph**: add cycle calculations + success/failure chart rendering


