// components/ExpenseItem.js
// ─────────────────────────────────────────────────────────
// A single row in the expense history list.
// Shows: emoji, category chip, note, date, amount.
// ─────────────────────────────────────────────────────────

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { Colors, Typography, Spacing, Radius } from '../utils/theme';
import { formatCurrency, formatExpenseDate, getCategoryEmoji, capitalize } from '../utils/formatters';
import { deleteExpense } from '../services/expenseService';

const ExpenseItem = ({ expense }) => {
  const { id, amount, category, note, date } = expense;

  // Long-press to delete
  const handleLongPress = () => {
    Alert.alert(
      'Delete Expense',
      `Delete ${formatCurrency(amount)} · ${capitalize(category)}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteExpense(id);
            } catch (e) {
              Alert.alert('Error', 'Could not delete expense. Try again.');
            }
          },
        },
      ]
    );
  };

  return (
    <TouchableOpacity
      onLongPress={handleLongPress}
      activeOpacity={0.7}
      style={styles.container}
    >
      {/* Left: emoji icon */}
      <View style={styles.iconBox}>
        <Text style={styles.emoji}>{getCategoryEmoji(category)}</Text>
      </View>

      {/* Middle: category + note + date */}
      <View style={styles.middle}>
        <Text style={styles.category}>{capitalize(category)}</Text>
        {note ? <Text style={styles.note} numberOfLines={1}>{note}</Text> : null}
        <Text style={styles.date}>{formatExpenseDate(date)}</Text>
      </View>

      {/* Right: amount */}
      <Text style={styles.amount}>{formatCurrency(amount)}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: Spacing.md,
  },
  iconBox: {
    width: 42,
    height: 42,
    borderRadius: Radius.md,
    backgroundColor: Colors.bgCardHover,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    fontSize: 20,
  },
  middle: {
    flex: 1,
    gap: 2,
  },
  category: {
    color: Colors.textPrimary,
    fontSize: Typography.base,
    fontWeight: '600',
  },
  note: {
    color: Colors.textSecondary,
    fontSize: Typography.sm,
  },
  date: {
    color: Colors.textMuted,
    fontSize: Typography.xs,
    marginTop: 1,
  },
  amount: {
    color: Colors.textPrimary,
    fontSize: Typography.md,
    fontWeight: '700',
  },
});

export default ExpenseItem;
