import { Platform } from 'react-native';

export async function signInWithGoogle() {
  if (Platform.OS === 'web') {
    const mod = await import('./googleSignIn.web');
    return mod.signInWithGoogle();
  }
  const mod = await import('./googleSignIn.native');
  return mod.signInWithGoogle();
}



