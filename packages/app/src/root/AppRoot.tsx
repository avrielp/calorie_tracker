import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '../state/auth/AuthProvider';
import { DbProvider } from '../state/db/DbProvider';
import { SyncController } from '../state/sync/SyncController';
import { BackgroundController } from '../state/background/BackgroundController';
import { LoginScreen } from '../ui/screens/LoginScreen';
import { SummaryScreen } from '../ui/screens/SummaryScreen';
import { InputsScreen } from '../ui/screens/InputsScreen';
import { GoalsScreen } from '../ui/screens/GoalsScreen';
import { SettingsScreen } from '../ui/screens/SettingsScreen';

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
  return (
    <DbProvider>
      <SyncController />
      <BackgroundController />
      <Stack.Navigator>
        <Stack.Screen name="MainTabs" component={MainTabs} options={{ headerShown: false }} />
        <Stack.Screen name="Settings" component={SettingsScreen} />
      </Stack.Navigator>
    </DbProvider>
  );
}

function Gate() {
  const { isReady, firebaseUser } = useAuth();
  if (!isReady) return null;
  if (!firebaseUser) return <LoginScreen />;
  return <AuthedApp />;
}

export function AppRoot() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <NavigationContainer>
          <Gate />
        </NavigationContainer>
      </AuthProvider>
    </SafeAreaProvider>
  );
}


