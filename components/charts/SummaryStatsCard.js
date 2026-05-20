// components/charts/SummaryStatsCard.js
// ─────────────────────────────────────────────────────────
// Three hero metric cards + savings rate bar.
// Shows: total income, total expense, savings, savings %.
// ─────────────────────────────────────────────────────────

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

import { useTheme }       from '../../context/ThemeContext';
import { Typography, Spacing, Radius } from '../../utils/theme';
import { formatCurrency } from '../../utils/formatters';

const SummaryStatsCard = ({ summary }) => {
  const { Colors } = useTheme();

  const {
    totalIncome  = 0,
    totalExpense = 0,
    savings      = 0,
    savingsRate  = 0,
    avgExpense   = 0,
    largestExp   = 0,
    expenseCount = 0,
    incomeCount  = 0,
  } = summary || {};

  const rate    = Math.min(Math.max(savingsRate, 0), 100);
  const isPos   = savings >= 0;
  const rateColor = rate >= 20 ? Colors.safe
                  : rate >= 10 ? Colors.warning
                  : Colors.danger;

  const METRICS = [
    {
      label:   'Total Income',
      value:   formatCurrency(totalIncome),
      sub:     `${incomeCount} transaction${incomeCount !== 1 ? 's' : ''}`,
      color:   Colors.safe,
      bg:      Colors.safe + '18',
      emoji:   '📥',
    },
    {
      label:   'Total Expense',
      value:   formatCurrency(totalExpense),
      sub:     `${expenseCount} transaction${expenseCount !== 1 ? 's' : ''}`,
      color:   Colors.danger,
      bg:      Colors.danger + '18',
      emoji:   '📤',
    },
    {
      label:   'Net Savings',
      value:   `${isPos ? '+' : '−'}${formatCurrency(Math.abs(savings))}`,
      sub:     `${savingsRate > 0 ? savingsRate.toFixed(1) : '0'}% of income`,
      color:   isPos ? Colors.safe : Colors.danger,
      bg:      isPos ? Colors.safe + '18' : Colors.danger + '18',
      emoji:   isPos ? '💰' : '⚠️',
    },
  ];

  return (
    <View style={S.wrapper}>
      {/* ── 3 metric tiles ── */}
      <View style={S.row}>
        {METRICS.map((m) => (
          <View
            key={m.label}
            style={[S.tile, { backgroundColor: Colors.bgCard, borderColor: Colors.border }]}
          >
            <View style={[S.tileIcon, { backgroundColor: m.bg }]}>
              <Text style={{ fontSize: 22 }}>{m.emoji}</Text>
            </View>
            <Text style={[S.tileLabel, { color: Colors.textMuted }]}>{m.label}</Text>
            <Text style={[S.tileValue, { color: m.color }]}>{m.value}</Text>
            <Text style={[S.tileSub, { color: Colors.textMuted }]}>{m.sub}</Text>
          </View>
        ))}
      </View>

      {/* ── Savings rate bar ── */}
      <View style={[S.savingsCard, { backgroundColor: Colors.bgCard, borderColor: Colors.border }]}>
        <View style={S.savingsHeader}>
          <View>
            <Text style={[S.savingsTitle, { color: Colors.textPrimary }]}>Savings Rate</Text>
            <Text style={[S.savingsSub, { color: Colors.textMuted }]}>
              {rate >= 20 ? '🎉 Excellent savings habit!'
               : rate >= 10 ? '👍 Good — aim for 20%+'
               : rate > 0   ? '⚠️ Low savings — review spend'
               : '—  No income recorded'}
            </Text>
          </View>
          <Text style={[S.savingsPct, { color: rateColor }]}>
            {savingsRate > 0 ? `${savingsRate.toFixed(1)}%` : '—'}
          </Text>
        </View>

        {/* Segmented bar */}
        <View style={[S.barTrack, { backgroundColor: Colors.bgCardHover }]}>
          <View style={[S.barFill, { width: `${rate}%`, backgroundColor: rateColor }]} />
          {/* 20% target marker */}
          <View style={[S.marker, { left: '20%', backgroundColor: Colors.textMuted }]} />
        </View>

        <View style={S.barLabels}>
          <Text style={[S.barLabel, { color: Colors.textMuted }]}>0%</Text>
          <Text style={[S.barLabel, { color: Colors.textMuted }]}>Target 20%</Text>
          <Text style={[S.barLabel, { color: Colors.textMuted }]}>100%</Text>
        </View>

        {/* Extra quick stats */}
        <View style={[S.extraRow, { borderTopColor: Colors.border }]}>
          {[
            { label: 'Avg Expense', value: formatCurrency(avgExpense) },
            { label: 'Largest Expense', value: formatCurrency(largestExp) },
            { label: 'Total Txns', value: expenseCount + incomeCount },
          ].map((s) => (
            <View key={s.label} style={S.extra}>
              <Text style={[S.extraLabel, { color: Colors.textMuted }]}>{s.label}</Text>
              <Text style={[S.extraValue, { color: Colors.textPrimary }]}>{s.value}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
};

const S = StyleSheet.create({
  wrapper: { marginBottom: Spacing.md },

  row:  { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.sm },
  tile: {
    flex:          1,
    borderRadius:  Radius.lg,
    borderWidth:   1,
    padding:       Spacing.sm,
    alignItems:    'center',
  },
  tileIcon:  {
    width: 44, height: 44, borderRadius: Radius.full,
    alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.xs,
  },
  tileLabel: { fontSize: Typography.xs, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6, textAlign: 'center' },
  tileValue: { fontSize: Typography.md, fontWeight: '900', marginTop: 2, textAlign: 'center' },
  tileSub:   { fontSize: Typography.xs, marginTop: 2, textAlign: 'center' },

  // Savings rate
  savingsCard: { borderRadius: Radius.xl, borderWidth: 1, padding: Spacing.base },
  savingsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.md },
  savingsTitle:  { fontSize: Typography.base, fontWeight: '800' },
  savingsSub:    { fontSize: Typography.xs, marginTop: 3 },
  savingsPct:    { fontSize: Typography['2xl'], fontWeight: '900' },

  barTrack: { height: 10, borderRadius: 5, overflow: 'hidden', position: 'relative', marginBottom: 6 },
  barFill:  { height: '100%', borderRadius: 5 },
  marker:   { position: 'absolute', top: 0, bottom: 0, width: 2 },

  barLabels: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.md },
  barLabel:  { fontSize: Typography.xs },

  extraRow: { flexDirection: 'row', borderTopWidth: 1, paddingTop: Spacing.md, marginTop: Spacing.xs },
  extra:     { flex: 1, alignItems: 'center' },
  extraLabel: { fontSize: Typography.xs, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.6 },
  extraValue: { fontSize: Typography.base, fontWeight: '800', marginTop: 2 },
});

export default SummaryStatsCard;
