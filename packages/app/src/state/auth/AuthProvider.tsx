import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { User } from 'firebase/auth';
import { onAuthStateChanged } from 'firebase/auth';
import type { UserProfile } from '@calorie-tracker/core';
import { getFirebaseAuth } from './firebaseApp';
import { getOrCreateUserProfile } from './authApi';
import { signInWithGoogle } from './googleSignIn';
import { configureGoogleSignInOnce } from './configureGoogleSignIn';

type AuthState = {
  isReady: boolean;
  firebaseUser: User | null;
  profile: UserProfile | null;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  getIdToken: () => Promise<string>;
};

const Ctx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const auth = useMemo(() => getFirebaseAuth(), []);
  const [isReady, setIsReady] = useState(false);
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    // Ensure native Google Sign-In is configured before any login attempt.
    configureGoogleSignInOnce();
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (!user) {
        setProfile(null);
        setIsReady(true);
        return;
      }
      try {
        const token = await user.getIdToken();
        const prof = await getOrCreateUserProfile({ idToken: token });
        setProfile(prof);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn('[auth] failed to load profile; falling back to auth uid only', e);
        setProfile({
          userId: user.uid,
          authUid: user.uid,
          name: user.displayName ?? undefined,
          email: user.email ?? undefined,
          photoURL: user.photoURL ?? undefined,
        });
      } finally {
        setIsReady(true);
      }
    });
    return () => unsub();
  }, [auth]);

  const value: AuthState = useMemo(
    () => ({
      isReady,
      firebaseUser,
      profile,
      signIn: async () => {
        await signInWithGoogle();
      },
      signOut: async () => {
        await auth.signOut();
      },
      getIdToken: async () => {
        const user = auth.currentUser;
        if (!user) throw new Error('Not authenticated');
        return user.getIdToken();
      },
    }),
    [auth, firebaseUser, isReady, profile],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAuth must be used within AuthProvider');
  return v;
}


