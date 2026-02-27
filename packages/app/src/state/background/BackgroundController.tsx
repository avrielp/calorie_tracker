import { Platform } from 'react-native';

export function BackgroundController() {
  if (Platform.OS === 'web') {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { BackgroundController: Impl } = require('./BackgroundController.web');
    return Impl();
  }
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { BackgroundController: Impl } = require('./BackgroundController.native');
  return Impl();
}



