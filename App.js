import React, { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ThemeProvider, useTheme } from './context/ThemeContext';
import useAuth from './hooks/useAuth';
import AppNavigator from './navigation/AppNavigator';
import AuthScreen from './screens/AuthScreen';
import { LoadingOverlay } from './components/UI';
import { loadRewardedAd } from './utils/RewardedAdManager';
import mobileAds from 'react-native-google-mobile-ads';

import { loadAppOpenAd, showAppOpenAd } from './utils/AppOpenAdManager' ;

const Root = () => {
  const { user, loading } = useAuth();
  const { Colors, isDark } = useTheme();

  const appState = useRef(AppState.currentState);



  useEffect(() => {
    // preload first ad
    loadAppOpenAd();
 mobileAds().initialize().then(() => {
    console.log('Ads initialized');
    loadRewardedAd();
  });
    const subscription = AppState.addEventListener(
      'change',
      nextAppState => {
        // app comes from background to foreground
        if (
          appState.current.match(/background|inactive/) &&
          nextAppState === 'active'
        ) {
          console.log('App returned to foreground');

          showAppOpenAd();
        }

        appState.current = nextAppState;
      }
    );

    return () => {
      subscription.remove();
    };
  }, []);

  if (loading) {
    return <LoadingOverlay message="Starting up…" Colors={Colors} />;
  }

  return (
    <>
      <StatusBar
        style={isDark ? 'light' : 'dark'}
        backgroundColor={Colors.bg}
      />

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

// // App.js
// import React from 'react';
// import { StatusBar } from 'expo-status-bar';
// import { NavigationContainer } from '@react-navigation/native';
// import { SafeAreaProvider } from 'react-native-safe-area-context';

// import { ThemeProvider, useTheme } from './context/ThemeContext';
// import useAuth from './hooks/useAuth';
// import AppNavigator from './navigation/AppNavigator';
// import AuthScreen from './screens/AuthScreen';
// import { LoadingOverlay } from './components/UI';
// import { loadAppOpenAd, showAppOpenAd } from './utils/AppOpenAdManager';
// import { useEffect } from 'react';

// // import { AppOpenAd, TestIds, AdEventType } from 'react-native-google-mobile-ads';

// // const adUnitId = __DEV__ ? TestIds.APP_OPEN : 'ca-app-pub-3940256099942544/5575463023';

// // const appOpenAd = AppOpenAd.createForAdRequest(adUnitId, {
// //   keywords: ['fashion', 'clothing'],
// // });

// // // Preload an app open ad
// // appOpenAd.load();

// // Show the app open ad when user brings the app to the foreground.



// // Inner component so it can consume ThemeContext
// const Root = () => {

//   const { user, loading } = useAuth();
//   const { Colors, isDark } = useTheme();

//   if (loading) return <LoadingOverlay message="Starting up…" Colors={Colors} />;
//   useEffect(() => {
//     loadAppOpenAd();

//     setTimeout(() => {
//       showAppOpenAd();
//     }, 3000); // wait a few seconds
//   }, []);
//   return (
//     <>
//       <StatusBar style={isDark ? 'light' : 'dark'} backgroundColor={Colors.bg} />
//       {user ? (
//         <NavigationContainer>
//           <AppNavigator />
//         </NavigationContainer>
//       ) : (
//         <AuthScreen />
//       )}
//     </>
//   );
// };

// export default function App() {
//   return (
//     <SafeAreaProvider>
//       <ThemeProvider>
//         <Root />
//       </ThemeProvider>
//     </SafeAreaProvider>
//   );
// }
