import { Platform } from 'react-native';

export function configureGoogleSignInOnce() {
  if (Platform.OS === 'web') {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('./configureGoogleSignIn.web').configureGoogleSignInOnce();
  }
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return require('./configureGoogleSignIn.native').configureGoogleSignInOnce();
}



