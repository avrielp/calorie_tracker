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
import { Platform, View, Text, StyleSheet, Pressable } from 'react-native';
import { colors } from '../ui/theme';
import { ErrorBoundary } from '../ui/components/ErrorBoundary';

export type RootStackParamList = {
  MainTabs: undefined;
  Settings: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();
const Tabs = createBottomTabNavigator();

function MainTabs() {
  return (
    <Tabs.Navigator>
      <Tabs.Screen name="Summary" component={SummaryScreen} />
      <Tabs.Screen name="Inputs" component={InputsScreen} />
      <Tabs.Screen name="Goals" component={GoalsScreen} />
    </Tabs.Navigator>
  );
}

function AuthedApp() {
  const { signOut } = useAuth();

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
          <View style={styles.authedTopBar}>
            <Text style={styles.authedTopBarText}>Signed in</Text>
            <Pressable onPress={() => signOut()} style={styles.signOutBtn}>
              <Text style={styles.signOutBtnText}>Sign out</Text>
            </Pressable>
          </View>
          <View style={{ flex: 1, minHeight: 0 }}>
            <ErrorBoundary label="Navigation crashed">
              <Stack.Navigator>
                <Stack.Screen name="MainTabs" component={MainTabs} options={{ headerShown: false }} />
                <Stack.Screen name="Settings" component={SettingsScreen} />
              </Stack.Navigator>
            </ErrorBoundary>
          </View>
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
  authedTopBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.card,
  },
  authedTopBarText: { color: colors.text, fontWeight: '900' },
  signOutBtn: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#0E1016',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
  },
  signOutBtnText: { color: colors.text, fontWeight: '800' },
});


