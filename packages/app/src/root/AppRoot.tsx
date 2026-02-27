import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '../state/auth/AuthProvider';
import { DbProvider } from '../state/db/DbProvider';
import { SyncProvider } from '../state/sync/SyncProvider';
import { BackgroundController } from '../state/background/BackgroundController';
import { LoginScreen } from '../ui/screens/LoginScreen';
import { SummaryScreen } from '../ui/screens/SummaryScreen';
import { InputsScreen } from '../ui/screens/InputsScreen';
import { GoalsScreen } from '../ui/screens/GoalsScreen';
import { SettingsScreen } from '../ui/screens/SettingsScreen';
import { Platform, View, Text, StyleSheet } from 'react-native';
import { colors } from '../ui/theme';
import { ErrorBoundary } from '../ui/components/ErrorBoundary';
import { ProfileButton } from '../ui/components/ProfileButton';

export type RootStackParamList = {
  MainTabs: undefined;
  Settings: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();
const Tabs = createBottomTabNavigator();

function MainTabs() {
  return (
    <Tabs.Navigator
      screenOptions={({ navigation }) => ({
        headerRight: () => (
          <ProfileButton
            onPress={() => {
              // Settings is on the parent Stack navigator
              navigation.getParent()?.navigate('Settings' as never);
            }}
          />
        ),
      })}
    >
      <Tabs.Screen name="Summary" component={SummaryScreen} />
      <Tabs.Screen name="Inputs" component={InputsScreen} />
      <Tabs.Screen name="Goals" component={GoalsScreen} />
    </Tabs.Navigator>
  );
}

function AuthedApp() {
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    // `react-native-screens` is a native optimization. On web it can cause instability.
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { enableScreens } = require('react-native-screens');
      if (typeof enableScreens === 'function') enableScreens(false);
    } catch {
      // ignore
    }
  }, []);

  return (
    <DbProvider>
      <SyncProvider>
        <BackgroundController />
        <View style={styles.authedRoot}>
          <ErrorBoundary label="Navigation crashed">
            <Stack.Navigator>
              <Stack.Screen name="MainTabs" component={MainTabs} options={{ headerShown: false }} />
              <Stack.Screen name="Settings" component={SettingsScreen} />
            </Stack.Navigator>
          </ErrorBoundary>
        </View>
      </SyncProvider>
    </DbProvider>
  );
}

function Gate() {
  const { isReady, firebaseUser } = useAuth();
  if (!isReady) {
    return (
      <View style={styles.loadingRoot}>
        <Text style={styles.loadingText}>Loading…</Text>
      </View>
    );
  }
  if (!firebaseUser) return <LoginScreen />;
  return <AuthedApp />;
}

export function AppRoot() {
  const content = (
    <AuthProvider>
      <NavigationContainer>
        <Gate />
      </NavigationContainer>
    </AuthProvider>
  );

  // On web, `react-native-safe-area-context` can render nothing depending on environment/metrics.
  // We skip it because the web UI doesn't rely on safe-area insets.
  if (Platform.OS === 'web') return content;

  return <SafeAreaProvider>{content}</SafeAreaProvider>;
}

const styles = StyleSheet.create({
  loadingRoot: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: colors.text, fontSize: 16, fontWeight: '700' },
  authedRoot: { flex: 1, backgroundColor: colors.bg },
});


