export type GoalType = 'daily' | 'weekly' | 'monthly' | 'custom';

export type CalorieItemInput = {
  name: string;
  description?: string;
  calories: number;
};

export type UserProfile = {
  /** Internal UUID stored in Firestore, used for all app data scoping. */
  userId: string;
  /** Firebase Auth UID (for debugging/diagnostics). */
  authUid: string;
  name?: string;
  email?: string;
  photoURL?: string;
};

export type AiEstimateItem = CalorieItemInput & {
  /** Optional confidence score 0..1 from the model (best-effort). */
  confidence?: number;
};


