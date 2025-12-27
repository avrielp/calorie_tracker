import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { getFirebaseAuth } from './firebaseApp';

// NOTE: This requires native setup of `@react-native-google-signin/google-signin`.
// The README will walk through the one-time native config.
export async function signInWithGoogle() {
  // Lazy import so Web bundlers don't even see this dependency.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { GoogleSignin } = require('@react-native-google-signin/google-signin');

  const auth = getFirebaseAuth();
  const { idToken } = await GoogleSignin.signIn();
  if (!idToken) throw new Error('Google sign-in did not return an idToken');

  const credential = GoogleAuthProvider.credential(idToken);
  await signInWithCredential(auth, credential);
}


