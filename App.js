// App.js
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ThemeProvider, useTheme } from './context/ThemeContext';
import useAuth from './hooks/useAuth';
import AppNavigator from './navigation/AppNavigator';
import AuthScreen from './screens/AuthScreen';
import { LoadingOverlay } from './components/UI';

// Inner component so it can consume ThemeContext
const Root = () => {
  const { user, loading } = useAuth();
  const { Colors, isDark } = useTheme();

  if (loading) return <LoadingOverlay message="Starting up…" Colors={Colors} />;

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} backgroundColor={Colors.bg} />
      {user ? (
        <NavigationContainer>
          <AppNavigator />
        </NavigationContainer>
      ) : (
        <AuthScreen />
      )}
    </>
  );
};

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <Root />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
