// components/BalanceSummaryBar.js
// ─────────────────────────────────────────────────────────
// Three-column total net worth summary shown at top of
// AccountsScreen and HomeScreen.
// ─────────────────────────────────────────────────────────

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { Typography, Spacing, Radius } from '../utils/theme';
import { formatCurrency } from '../utils/formatters';

const BalanceSummaryBar = ({ totalBalance, totalIncome = 0, totalExpense = 0 }) => {
  const { Colors } = useTheme();

  const items = [
    { label: 'Total Balance', value: totalBalance, color: Colors.accent, prefix: '' },
    { label: 'Income',        value: totalIncome,  color: Colors.safe,   prefix: '+' },
    { label: 'Expenses',      value: totalExpense, color: Colors.danger, prefix: '−' },
  ];

  return (
    <View style={[styles.row, { backgroundColor: Colors.bgCard, borderColor: Colors.border }]}>
      {items.map((item, i) => (
        <React.Fragment key={item.label}>
          {i > 0 && <View style={[styles.divider, { backgroundColor: Colors.border }]} />}
          <View style={styles.cell}>
            <Text style={[styles.label, { color: Colors.textMuted }]}>{item.label}</Text>
            <Text style={[styles.value, { color: item.color }]}>
              {item.prefix}{formatCurrency(Math.abs(item.value))}
            </Text>
          </View>
        </React.Fragment>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    borderRadius: Radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: Spacing.base,
  },
  cell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xs,
  },
  divider: {
    width: 1,
    marginVertical: Spacing.sm,
  },
  label: {
    fontSize: Typography.xs,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 4,
    textAlign: 'center',
  },
  value: {
    fontSize: Typography.md,
    fontWeight: '900',
    textAlign: 'center',
  },
});

export default BalanceSummaryBar;
