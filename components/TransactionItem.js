// components/TransactionItem.js
// Single transaction row — income in green, expense in red.
// Long-press to delete (reverses account balance automatically).

import React, { useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { Typography, Spacing, Radius } from '../utils/theme';
import { formatCurrency, formatExpenseDate } from '../utils/formatters';
import { getCategoryMeta } from '../utils/constants';
import { deleteTransaction } from '../services/transactionService';

const TransactionItem = ({ transaction, showAccount = true }) => {
  const { Colors } = useTheme();
  const { id, amount, type, category, accountName, note, date } = transaction;

  const isIncome = type === 'income';
  const catMeta  = getCategoryMeta(category, type);
  const amtColor = isIncome ? Colors.safe : Colors.danger;
  const bgColor  = isIncome ? Colors.safe + '18' : Colors.danger + '18';

  const handleLongPress = useCallback(() => {
    Alert.alert(
      'Delete Transaction',
      `Delete ${isIncome ? '+' : '−'}${formatCurrency(amount)} · ${catMeta.name}?\n\nThis reverses the account balance.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive',
          onPress: async () => {
            try { await deleteTransaction(id); }
            catch (e) { Alert.alert('Error', 'Could not delete. Try again.'); }
          },
        },
      ]
    );
  }, [id, amount, catMeta.name, isIncome]);

  return (
    <TouchableOpacity
      onLongPress={handleLongPress}
      activeOpacity={0.7}
      style={[S.row, { borderBottomColor: Colors.border }]}
    >
      {/* Icon */}
      <View style={[S.iconBox, { backgroundColor: bgColor }]}>
        <Text style={S.emoji}>{catMeta.emoji}</Text>
      </View>

      {/* Middle */}
      <View style={S.mid}>
        <Text style={[S.category, { color: Colors.textPrimary }]}>{catMeta.name}</Text>
        <Text style={[S.meta, { color: Colors.textMuted }]}>
          {showAccount && accountName ? `${accountName} · ` : ''}{formatExpenseDate(date)}
        </Text>
        {note ? <Text style={[S.note, { color: Colors.textSecondary }]} numberOfLines={1}>{note}</Text> : null}
      </View>

      {/* Amount + type badge */}
      <View style={S.right}>
        <Text style={[S.amount, { color: amtColor }]}>
          {isIncome ? '+' : '−'}{formatCurrency(amount)}
        </Text>
        <View style={[S.badge, { backgroundColor: bgColor }]}>
          <Text style={[S.badgeText, { color: amtColor }]}>
            {isIncome ? 'Income' : 'Expense'}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const S = StyleSheet.create({
  row:      { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.md, paddingHorizontal: Spacing.base, borderBottomWidth: 1 },
  iconBox:  { width: 44, height: 44, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center', marginRight: Spacing.md },
  emoji:    { fontSize: 20 },
  mid:      { flex: 1 },
  category: { fontSize: Typography.base, fontWeight: '700' },
  meta:     { fontSize: Typography.xs, marginTop: 1 },
  note:     { fontSize: Typography.xs, marginTop: 1 },
  right:    { alignItems: 'flex-end' },
  amount:   { fontSize: Typography.md, fontWeight: '800' },
  badge:    { marginTop: 3, paddingHorizontal: 6, paddingVertical: 2, borderRadius: Radius.full },
  badgeText:{ fontSize: Typography.xs, fontWeight: '600' },
});

export default TransactionItem;
