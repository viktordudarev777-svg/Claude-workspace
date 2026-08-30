import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { DarkTheme, DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';
import { AppProvider, useApp } from './src/context/AppContext';
import { useTheme } from './src/theme';
import { ScanScreen } from './src/screens/ScanScreen';
import { ResultScreen } from './src/screens/ResultScreen';
import { HistoryScreen } from './src/screens/HistoryScreen';
import { AdditivesScreen } from './src/screens/AdditivesScreen';
import { AdditiveDetailScreen } from './src/screens/AdditiveDetailScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import type { RootStackParamList, TabParamList } from './src/navigation/types';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tabs = createBottomTabNavigator<TabParamList>();

/** Emoji tab icons keep the app dependency-free of an icon font. */
const TAB_ICONS: Record<keyof TabParamList, string> = {
  Scan: '📷',
  History: '🕘',
  Additives: '📖',
  Settings: '⚙️',
};

function TabNavigator(): React.JSX.Element {
  const theme = useTheme();
  const { t } = useApp();

  return (
    <Tabs.Navigator
      screenOptions={({ route }) => ({
        headerStyle: { backgroundColor: theme.surface },
        headerTitleStyle: { color: theme.text },
        tabBarStyle: { backgroundColor: theme.surface, borderTopColor: theme.border },
        tabBarActiveTintColor: theme.accent,
        tabBarInactiveTintColor: theme.textMuted,
        tabBarIcon: ({ size }) => <Text style={{ fontSize: size - 2 }}>{TAB_ICONS[route.name]}</Text>,
      })}
    >
      {/* The scanner is the app: it opens full-bleed, with no header. */}
      <Tabs.Screen name="Scan" component={ScanScreen} options={{ title: t('tab.scan'), headerShown: false }} />
      <Tabs.Screen name="History" component={HistoryScreen} options={{ title: t('tab.history') }} />
      <Tabs.Screen name="Additives" component={AdditivesScreen} options={{ title: t('tab.additives') }} />
      <Tabs.Screen name="Settings" component={SettingsScreen} options={{ title: t('tab.settings') }} />
    </Tabs.Navigator>
  );
}

function Root(): React.JSX.Element {
  const scheme = useColorScheme();
  const theme = useTheme();

  return (
    <NavigationContainer theme={scheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: theme.surface },
          headerTitleStyle: { color: theme.text },
          headerTintColor: theme.accent,
          contentStyle: { backgroundColor: theme.background },
        }}
      >
        <Stack.Screen name="Tabs" component={TabNavigator} options={{ headerShown: false }} />
        <Stack.Screen name="Result" component={ResultScreen} options={{ title: 'FoodLens' }} />
        <Stack.Screen name="AdditiveDetail" component={AdditiveDetailScreen} options={{ title: '' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App(): React.JSX.Element {
  return (
    <SafeAreaProvider>
      <AppProvider>
        <StatusBar style="auto" />
        <Root />
      </AppProvider>
    </SafeAreaProvider>
  );
}
