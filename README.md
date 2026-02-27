### Calorie Tracker (Expo + React Native + Web)

Cross‑platform app (iOS / Android / Web) that calculates a daily caloric surplus/deficit and syncs all local WatermelonDB data through Firebase Cloud Functions + Firestore.

### Repo layout

- **`apps/expo`**: Expo app (iOS/Android/Web) running the shared app UI
- **`apps/mobile`**: legacy React Native CLI app (kept for reference)
- **`packages/core`**: shared calculations + types + runtime config loader
- **`packages/db`**: WatermelonDB schema/models/CRUD + Watermelon sync client
- **`packages/app`**: shared UI (Summary/Inputs/Goals + Settings) + Firebase auth + sync/background wiring
- **`functions`**: Firebase Cloud Functions (Express API): `profile/me`, `sync/pull`, `sync/push`, `ai/text`, `ai/photo`

### High-level architecture

- **Local-first UI**: All screens read/write **local WatermelonDB** tables.
- **Sync**: The app calls Cloud Functions `pullChanges` / `pushChanges` to sync WatermelonDB across devices (Firestore is the backend store).
- **Auth**: Firebase Google sign-in. After login, the client calls `GET /profile/me` which creates/returns a **UUID `userId`** stored in Firestore and used to scope all DB rows and sync routes.
- **Background tasks** (mobile): `react-native-background-fetch` runs every ~15 minutes and:
  - iOS: reads HealthKit metrics (best-effort; returns zeros if unavailable/unauthorized) and populates last 90 days if empty
  - all platforms: triggers a sync

---

### 1) Prerequisites

- Node.js **20+**
- npm (recommended) or Yarn
- **iOS**: Xcode + CocoaPods
- **Android**: Android Studio + SDKs
- Firebase CLI: `npm i -g firebase-tools`
- **Java (JDK)**: required for the **Firestore emulator** (and therefore recommended for `firebase emulators:start --only functions,firestore`)

#### Install Java + manage multiple versions (recommended)

**macOS (Homebrew + jenv)**:

```bash
brew install jenv temurin@21 temurin@17
```

Add `jenv` to your shell (zsh):

```bash
echo 'export PATH="$HOME/.jenv/bin:$PATH"' >> ~/.zshrc
echo 'eval "$(jenv init -)"' >> ~/.zshrc
source ~/.zshrc
```

Register installed JDKs and pick a default:

```bash
jenv add "$(/usr/libexec/java_home -v 21)"
jenv add "$(/usr/libexec/java_home -v 17)"
jenv global 21
java -version
```

**Alternative (macOS/Linux): SDKMAN** (good if you want one tool for many Java versions):

```bash
curl -s "https://get.sdkman.io" | bash
sdk install java 21-tem
sdk install java 17-tem
sdk default java 21-tem
java -version
```

> Note: Android Studio may bundle a JDK, but Firebase emulators need `java` available on your PATH (or `JAVA_HOME` set).

---

### 2) Install dependencies

From repo root:

```bash
npm install
```

---

### 3) Firebase setup (required, from zero)

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

Also:

- Create (or locate) a **Google OAuth Web Client ID** (for native Google sign-in): `GOOGLE_WEB_CLIENT_ID`

> Web sign-in (Vite) uses Firebase popup. iOS sign-in uses the native Google Sign-In module but still needs the **Web Client ID**.

---

### 4) Runtime configuration (local dev)

This repo uses:

- **Client config** (web + native): `config/env.local.json` (not committed)
- **Functions secrets**: Firebase Secret Manager in cloud, or environment variables when running emulators

#### Mobile (React Native)

Create:

- Copy `config/env.local.json.example` → `config/env.local.json`
- Fill in the values

The mobile app injects `config/env.local.json` into `globalThis.__APP_CONFIG__` at startup (see `apps/mobile/App.tsx`).

#### Web

Web is served by Expo (`expo start --web`) and uses the same `config/env.local.json` client config as native.

---

### 5) Backend (Cloud Functions) — local emulator + cloud deploy

#### 5.1 Link the Firebase CLI to your project

From repo root:

```bash
firebase login
firebase use --add
```

Pick your Firebase project. This makes the emulator and deploy commands know which `PROJECT_ID` you’re using.

#### 5.1.1 Local emulator vs deployed backend (how the apps choose)

- **The apps use whatever you set as `BACKEND_BASE_URL`** (mobile) / `VITE_BACKEND_BASE_URL` (web).
- For **local dev**, point it at the emulator:
  - `http://localhost:5001/<PROJECT_ID>/us-central1/api`
- For **cloud**, point it at your deployed Function URL (shown in `firebase deploy` output).

#### 5.2 Secrets (required)

Functions expect these environment variables at runtime:

- `BACKEND_API_KEY`: required for all API calls (`x-api-key`) — **client + server must match**
- `GEMINI_API_KEY`: required for AI endpoints (`/ai/text`, `/ai/photo`) — **server-only**

> Why keep `GEMINI_API_KEY` server-only? The mobile app loads `config/env.local.json` into its JS bundle at runtime. If you put the Gemini key there, it can leak to clients. Keep it only in Functions secrets/env vars.

#### 5.2.1 Gemini API key (how to generate)

- **What it is**: a **Google Gemini API key** used only by Cloud Functions. It is **not related to Firestore** and not generated inside the Firebase console.
- **Where to create it**: Google AI Studio → “Get API key”.
  - Link: `https://aistudio.google.com/app/apikey`
- **Then**: copy the key value into:
  - **local emulators**: `functions/.secret.local` → `GEMINI_API_KEY=...`
  - **cloud**: `firebase functions:secrets:set GEMINI_API_KEY`

For **cloud deploy**, set Firebase Secrets:

```bash
firebase functions:secrets:set BACKEND_API_KEY
firebase functions:secrets:set GEMINI_API_KEY
```

For **local emulators**, use `functions/.secret.local` (recommended) or pass env vars when starting emulators.

**Recommended**: edit `functions/.secret.local` (already in `.gitignore`):

```bash
BACKEND_API_KEY=changeme
GEMINI_API_KEY=changeme
```

Then start emulators from the repo root:

```bash
firebase emulators:start --only functions,firestore
```

**Alternative**: pass them as environment variables when starting emulators:

```bash
cd functions
BACKEND_API_KEY=changeme GEMINI_API_KEY=changeme firebase emulators:start --only functions,firestore
```

Use `functions/env.local.example` as a template if you prefer exporting variables via your shell.

The API is exported as `api` at:

- `http://localhost:5001/<PROJECT_ID>/us-central1/api`

> Tip: `<PROJECT_ID>` is your Firebase project id (also used in `FIREBASE_PROJECT_ID`).

#### 5.3 Deploy Functions (optional, for “real cloud” backend)

```bash
cd functions
firebase deploy --only functions
```

#### API routes

- `GET /healthz`
- `GET /profile/me` (auth + api key): returns `{ userId, authUid, name, email, photoURL }`
- `GET /sync/pull?userId=...&since=...` (auth + api key): WatermelonDB pullChanges contract
- `POST /sync/push` (auth + api key): WatermelonDB pushChanges contract
- `POST /ai/text` (auth + api key): Gemini text → `{ items: [...] }`
- `POST /ai/photo` (auth + api key): Gemini vision → `{ items: [...] }`

---

### 6) Run everything locally (recommended first run)

In three terminals:

**Terminal A (backend emulators):**

```bash
cd functions
BACKEND_API_KEY=changeme GEMINI_API_KEY=changeme firebase emulators:start --only functions,firestore
```

**Terminal B (web):**

```bash
npm run expo:web
```

**Terminal C (iOS):**

```bash
cd apps/mobile/ios
bundle install
bundle exec pod install
cd ..
npm run ios
```

> If you run on a **physical iPhone**, replace `localhost` in `BACKEND_BASE_URL` with your Mac’s LAN IP (e.g. `http://192.168.1.10:5001/...`).

---

### 7) Run iOS (simulator) (standalone)

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


