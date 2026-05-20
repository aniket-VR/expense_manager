// components/AccountCard.js
// ─────────────────────────────────────────────────────────
// Single account tile used in AccountsScreen and pickers.
// Props:
//   account       — { id, name, emoji, color, balance }
//   onPress       — tap to open detail
//   onLongPress   — (optional) show edit/delete menu
//   selected      — highlight when used as a picker
//   compact       — smaller version for transaction forms
// ─────────────────────────────────────────────────────────

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { Typography, Spacing, Radius } from '../utils/theme';
import { formatCurrency } from '../utils/formatters';

const AccountCard = ({ account, onPress, onLongPress, selected = false, compact = false }) => {
  const { Colors } = useTheme();
  const { name, emoji, color = Colors.accent, balance = 0 } = account;
  const isNegative = balance < 0;

  if (compact) {
    return (
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.75}
        style={[
          styles.compact,
          {
            backgroundColor: selected ? color + '22' : Colors.bgCard,
            borderColor: selected ? color : Colors.border,
          },
        ]}
      >
        <View style={[styles.compactIcon, { backgroundColor: color + '22' }]}>
          <Text style={styles.compactEmoji}>{emoji}</Text>
        </View>
        <View style={styles.compactText}>
          <Text style={[styles.compactName, { color: Colors.textPrimary }]} numberOfLines={1}>
            {name}
          </Text>
          <Text style={[styles.compactBalance, { color: isNegative ? Colors.danger : Colors.textSecondary }]}>
            {formatCurrency(balance)}
          </Text>
        </View>
        {selected && <View style={[styles.selectedDot, { backgroundColor: color }]} />}
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.8}
      style={[styles.card, { backgroundColor: Colors.bgCard, borderColor: Colors.border }]}
    >
      {/* Colored top bar */}
      <View style={[styles.topBar, { backgroundColor: color }]} />

      <View style={styles.body}>
        {/* Icon + name row */}
        <View style={styles.nameRow}>
          <View style={[styles.iconCircle, { backgroundColor: color + '22' }]}>
            <Text style={styles.emoji}>{emoji}</Text>
          </View>
          <Text style={[styles.name, { color: Colors.textPrimary }]} numberOfLines={1}>
            {name}
          </Text>
        </View>

        {/* Balance */}
        <Text style={[styles.balanceLabel, { color: Colors.textMuted }]}>Balance</Text>
        <Text style={[
          styles.balance,
          { color: isNegative ? Colors.danger : Colors.textPrimary },
        ]}>
          {isNegative ? '−' : ''}{formatCurrency(Math.abs(balance))}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  // ── Full card ─────────────────────────────────────────
  card: {
    width: 155,
    borderRadius: Radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
    marginRight: Spacing.md,
  },
  topBar: {
    height: 4,
  },
  body: {
    padding: Spacing.base,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  emoji: { fontSize: 18 },
  name: {
    flex: 1,
    fontSize: Typography.base,
    fontWeight: '700',
  },
  balanceLabel: {
    fontSize: Typography.xs,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  balance: {
    fontSize: Typography.xl,
    fontWeight: '900',
  },

  // ── Compact picker ────────────────────────────────────
  compact: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.md,
    borderWidth: 1.5,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    marginRight: Spacing.sm,
    minWidth: 110,
  },
  compactIcon: {
    width: 32,
    height: 32,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  compactEmoji: { fontSize: 16 },
  compactText: { flex: 1 },
  compactName: {
    fontSize: Typography.sm,
    fontWeight: '700',
  },
  compactBalance: {
    fontSize: Typography.xs,
    marginTop: 1,
  },
  selectedDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: Spacing.xs,
  },
});

export default AccountCard;
