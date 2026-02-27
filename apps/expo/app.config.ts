import type { ExpoConfig } from 'expo/config';
import fs from 'node:fs';
import path from 'node:path';

function readJsonIfExists(filePath: string): any {
  try {
    if (!fs.existsSync(filePath)) return null;
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}

export default (): ExpoConfig => {
  const repoRoot = path.resolve(__dirname, '../..');
  const localConfigPath = path.join(repoRoot, 'config', 'env.local.json');
  const appConfig = readJsonIfExists(localConfigPath) ?? {};

  return {
    name: 'CalorieTracker',
    slug: 'calorie-tracker',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',
    splash: {
      image: './assets/splash-icon.png',
      resizeMode: 'contain',
      backgroundColor: '#ffffff',
    },
    ios: {
      supportsTablet: true,
    },
    android: {
      adaptiveIcon: {
        backgroundColor: '#E6F4FE',
        foregroundImage: './assets/android-icon-foreground.png',
        backgroundImage: './assets/android-icon-background.png',
        monochromeImage: './assets/android-icon-monochrome.png',
      },
      predictiveBackGestureEnabled: false,
    },
    web: {
      favicon: './assets/favicon.png',
    },
    extra: {
      APP_CONFIG: appConfig,
    },
  };
};


