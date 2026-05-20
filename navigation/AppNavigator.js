// navigation/AppNavigator.js
// ─────────────────────────────────────────────────────────
// Root stack wrapping the 6-tab bottom navigator.
// Stack screens pushed on top:
//   • CategoryLimits  — from Settings
//   • Export          — from Settings
//   • Family          — from Settings (full-screen)
// ─────────────────────────────────────────────────────────

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { createBottomTabNavigator }   from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { useTheme }           from '../context/ThemeContext';
import { Typography, Spacing, Radius } from '../utils/theme';

import HomeScreen           from '../screens/HomeScreen';
import AccountsScreen       from '../screens/AccountsScreen';
import AddTransactionScreen from '../screens/AddTransactionScreen';
import AnalyticsScreen      from '../screens/AnalyticsScreen';
import HistoryScreen        from '../screens/HistoryScreen';
import SettingsScreen       from '../screens/SettingsScreen';
import CategoryLimitsScreen from '../screens/CategoryLimitsScreen';
import ExportScreen         from '../screens/ExportScreen';
import FamilyScreen         from '../screens/FamilyScreen';

const Tab   = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// ── Tab bar config ────────────────────────────────────────
const TAB_CONFIG = {
  Home:      { emoji: '🏠', label: 'Home'     },
  Accounts:  { emoji: '🏦', label: 'Accounts' },
  Add:       { emoji: '＋', label: 'Add'      },
  Analytics: { emoji: '📊', label: 'Analytics'},
  History:   { emoji: '📋', label: 'History'  },
  Settings:  { emoji: '⚙️', label: 'Settings' },
};

const CustomTabBar = ({ state, descriptors, navigation }) => {
  const { Colors } = useTheme();

  return (
    <View style={[T.bar, { backgroundColor: Colors.bgCard, borderTopColor: Colors.border }]}>
      {state.routes.map((route, index) => {
        const isFocused = state.index === index;
        const isAdd     = route.name === 'Add';
        const cfg       = TAB_CONFIG[route.name] || { emoji: '●', label: route.name };

        const onPress = () => {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!isFocused && !event.defaultPrevented) navigation.navigate(route.name);
        };

        if (isAdd) {
          return (
            <TouchableOpacity key={route.key} onPress={onPress}
              style={[T.fab, { backgroundColor: Colors.accent, shadowColor: Colors.accent }]}
              activeOpacity={0.8}>
              <Text style={[T.fabText, { color: Colors.black }]}>＋</Text>
            </TouchableOpacity>
          );
        }

        return (
          <TouchableOpacity key={route.key} onPress={onPress} style={T.tab} activeOpacity={0.7}>
            <Text style={T.emoji}>{cfg.emoji}</Text>
            <Text style={[T.label, { color: isFocused ? Colors.accent : Colors.textMuted }]}>
              {cfg.label}
            </Text>
            {isFocused && <View style={[T.dot, { backgroundColor: Colors.accent }]} />}
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const TabNavigator = () => (
  <Tab.Navigator tabBar={(p) => <CustomTabBar {...p} />} screenOptions={{ headerShown: false }}>
    <Tab.Screen name="Home"      component={HomeScreen}           />
    <Tab.Screen name="Accounts"  component={AccountsScreen}       />
    <Tab.Screen name="Add"       component={AddTransactionScreen} />
    <Tab.Screen name="Analytics" component={AnalyticsScreen}      />
    <Tab.Screen name="History"   component={HistoryScreen}        />
    <Tab.Screen name="Settings"  component={SettingsScreen}       />
  </Tab.Navigator>
);

// ── Root navigator ────────────────────────────────────────

const AppNavigator = () => {
  const { Colors } = useTheme();

  // Shared header style for all pushed screens
  const headerDefaults = {
    headerStyle:     { backgroundColor: Colors.bgCard },
    headerTintColor: Colors.accent,
    headerTitleStyle:{ color: Colors.textPrimary, fontWeight: '800' },
    headerShadowVisible: false,
  };

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown:  false,
        contentStyle: { backgroundColor: Colors.bg },
        animation:    'slide_from_right',
      }}
    >
      {/* Main tabs */}
      <Stack.Screen name="Tabs" component={TabNavigator} />

      {/* ── Full-screen push screens ── */}
      <Stack.Screen
        name="CategoryLimits"
        component={CategoryLimitsScreen}
        options={{
          headerShown:     true,
          headerTitle:     'Category Budgets',
          headerBackTitle: 'Settings',
          ...headerDefaults,
        }}
      />
      <Stack.Screen
        name="Export"
        component={ExportScreen}
        options={{
          headerShown:     true,
          headerTitle:     'Export Data',
          headerBackTitle: 'Settings',
          ...headerDefaults,
        }}
      />
      <Stack.Screen
        name="Family"
        component={FamilyScreen}
        options={{
          headerShown:     true,
          headerTitle:     'Family',
          headerBackTitle: 'Settings',
          ...headerDefaults,
        }}
      />
    </Stack.Navigator>
  );
};

export default AppNavigator;

// ── Tab bar styles ────────────────────────────────────────
const T = StyleSheet.create({
  bar: {
    flexDirection:    'row',
    borderTopWidth:   1,
    paddingBottom:    Platform.OS === 'ios' ? 22 : 4,
    paddingTop:       4,
    alignItems:       'center',
    height:           Platform.OS === 'ios' ? 84 : 60,
  },
  tab:   { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emoji: { fontSize: 17 },
  label: { fontSize: 9, fontWeight: '600', marginTop: 1 },
  dot:   { position: 'absolute', bottom: -3, width: 16, height: 2.5, borderRadius: 2 },

  fab: {
    width: 48, height: 48, borderRadius: Radius.full,
    alignItems: 'center', justifyContent: 'center',
    marginHorizontal: 2,
    shadowOffset:   { width: 0, height: 3 },
    shadowOpacity:  0.45,
    shadowRadius:   7,
    elevation:      7,
    marginBottom:   Platform.OS === 'ios' ? 0 : 5,
  },
  fabText: { fontSize: 24, fontWeight: '900', lineHeight: 28 },
});
