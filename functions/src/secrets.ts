import { defineSecret } from 'firebase-functions/params';

// Stored in Secret Manager in production (Firebase Functions v2).
// In local emulators, these can be provided via environment variables.
export const BACKEND_API_KEY = defineSecret('BACKEND_API_KEY');
export const GEMINI_API_KEY = defineSecret('GEMINI_API_KEY');


