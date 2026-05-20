// components/AccountPicker.js
// ─────────────────────────────────────────────────────────
// Horizontal scroll picker used inside AddTransactionScreen.
// Shows compact AccountCard tiles; selected one is highlighted.
// ─────────────────────────────────────────────────────────

import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { Typography, Spacing, Radius } from '../utils/theme';
import AccountCard from './AccountCard';
import { formatCurrency } from '../utils/formatters';

const AccountPicker = ({ accounts = [], selectedId, onSelect }) => {
  const { Colors } = useTheme();

  if (accounts.length === 0) {
    return (
      <View style={[styles.empty, { backgroundColor: Colors.bgCard, borderColor: Colors.border }]}>
        <Text style={{ color: Colors.textMuted, fontSize: Typography.sm }}>
          No accounts — add one in the Accounts tab
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scroll}
    >
      {accounts.map((acc) => (
        <AccountCard
          key={acc.id}
          account={acc}
          compact
          selected={selectedId === acc.id}
          onPress={() => onSelect(acc)}
        />
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scroll: {
    paddingVertical: Spacing.xs,
    paddingRight: Spacing.base,
  },
  empty: {
    borderRadius: Radius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    padding: Spacing.md,
    alignItems: 'center',
  },
});

export default AccountPicker;
