// components/charts/TrendLineChart.js
// ─────────────────────────────────────────────────────────
// Expense + Income dual-line trend chart.
// Renders a LineChart from react-native-chart-kit.
//
// Props:
//   trendSeries — { labels, expenseData, incomeData } from useAnalytics
//   period      — 'week' | 'month' | 'quarter' | 'year'
//   showIncome  — boolean (toggle income line)
// ─────────────────────────────────────────────────────────

import React, { useState } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, ScrollView } from 'react-native';
import { LineChart } from 'react-native-chart-kit';

import { useTheme }       from '../../context/ThemeContext';
import { Typography, Spacing, Radius } from '../../utils/theme';
import { formatCurrency } from '../../utils/formatters';

const SCREEN_W = Dimensions.get('window').width;
const CHART_W  = SCREEN_W - Spacing.base * 2;

const TrendLineChart = ({ trendSeries, period }) => {
  const { Colors, isDark } = useTheme();
  const [showIncome, setShowIncome] = useState(true);

  const { labels = [], expenseData = [], incomeData = [] } = trendSeries || {};

  const hasData = expenseData.some((v) => v > 0) || incomeData.some((v) => v > 0);

  // Prevent react-native-chart-kit crash on all-zero data
  const safeExp = expenseData.length ? expenseData.map((v) => v || 0) : [0];
  const safeInc = incomeData.length  ? incomeData.map((v)  => v || 0) : [0];
  const safeLabels = labels.length ? labels : [''];

  const maxVal = Math.max(...safeExp, ...safeInc, 1);

  const datasets = [
    {
      data:            safeExp,
      color:           (opacity = 1) => `rgba(248,81,73,${opacity})`,  // danger red
      strokeWidth:     2.5,
    },
    ...(showIncome ? [{
      data:            safeInc,
      color:           (opacity = 1) => `rgba(46,160,67,${opacity})`,  // safe green
      strokeWidth:     2.5,
    }] : []),
  ];

  const chartConfig = {
    backgroundColor:         Colors.bgCard,
    backgroundGradientFrom:  Colors.bgCard,
    backgroundGradientTo:    Colors.bgCard,
    decimalPlaces:           0,
    color:           (opacity = 1) => `rgba(139,148,158,${opacity})`,
    labelColor:      (opacity = 1) => isDark
      ? `rgba(139,148,158,${opacity})`
      : `rgba(87,96,106,${opacity})`,
    propsForDots: {
      r:           '3',
      strokeWidth: '1',
      stroke:      Colors.bgCard,
    },
    propsForBackgroundLines: {
      stroke:          Colors.border,
      strokeDasharray: '4 4',
      strokeWidth:     1,
    },
    propsForLabels: {
      fontSize: 10,
    },
    fillShadowGradientOpacity: 0.18,
    fillShadowGradientFromOpacity: 0.18,
    fillShadowGradientToOpacity:   0,
  };

  // Summary: total / avg from trend data
  const totalExp = safeExp.reduce((s, v) => s + v, 0);
  const totalInc = safeInc.reduce((s, v) => s + v, 0);
  const avgExp   = safeExp.filter((v) => v > 0).length
    ? totalExp / safeExp.filter((v) => v > 0).length : 0;

  return (
    <View style={[S.card, { backgroundColor: Colors.bgCard, borderColor: Colors.border }]}>
      {/* Header */}
      <View style={S.header}>
        <View>
          <Text style={[S.title, { color: Colors.textPrimary }]}>Spending Trend</Text>
          <Text style={[S.subtitle, { color: Colors.textMuted }]}>
            {period === 'week'    ? 'Daily — last 7 days'
           : period === 'month'   ? 'Daily — this month'
           : period === 'quarter' ? 'Weekly — this quarter'
           : 'Monthly — this year'}
          </Text>
        </View>
        {/* Income toggle */}
        <TouchableOpacity
          onPress={() => setShowIncome(!showIncome)}
          style={[
            S.toggleBtn,
            { borderColor: Colors.safe },
            showIncome && { backgroundColor: Colors.safe + '22' },
          ]}
        >
          <View style={[S.toggleDot, { backgroundColor: Colors.safe }]} />
          <Text style={[S.toggleText, { color: Colors.safe }]}>Income</Text>
        </TouchableOpacity>
      </View>

      {/* Quick stats row */}
      <View style={S.statsRow}>
        {[
          { label: 'Total Expense', value: formatCurrency(totalExp), color: Colors.danger },
          { label: 'Total Income',  value: formatCurrency(totalInc), color: Colors.safe   },
          { label: 'Avg / period',  value: formatCurrency(avgExp),   color: Colors.accent },
        ].map((s) => (
          <View key={s.label} style={[S.statBox, { backgroundColor: Colors.bgCardHover }]}>
            <Text style={[S.statLabel, { color: Colors.textMuted }]}>{s.label}</Text>
            <Text style={[S.statValue, { color: s.color }]}>{s.value}</Text>
          </View>
        ))}
      </View>

      {!hasData ? (
        <View style={S.empty}>
          <Text style={S.emptyEmoji}>📈</Text>
          <Text style={[S.emptyText, { color: Colors.textMuted }]}>No transactions yet</Text>
        </View>
      ) : (
        <>
          {/* Legend */}
          <View style={S.legendRow}>
            <View style={S.legendItem}>
              <View style={[S.legendLine, { backgroundColor: Colors.danger }]} />
              <Text style={[S.legendLabel, { color: Colors.textSecondary }]}>Expense</Text>
            </View>
            {showIncome && (
              <View style={S.legendItem}>
                <View style={[S.legendLine, { backgroundColor: Colors.safe }]} />
                <Text style={[S.legendLabel, { color: Colors.textSecondary }]}>Income</Text>
              </View>
            )}
          </View>

          {/* Line chart — horizontal scroll for dense periods */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <LineChart
              data={{ labels: safeLabels, datasets }}
              width={Math.max(CHART_W, safeLabels.length * 42)}
              height={200}
              chartConfig={chartConfig}
              bezier
              withShadow={false}
              withInnerLines
              withOuterLines={false}
              withVerticalLines={false}
              fromZero
              yAxisLabel="₹"
              yLabelsOffset={8}
              formatYLabel={(v) => {
                const n = Number(v);
                if (n >= 100000) return `${(n / 100000).toFixed(0)}L`;
                if (n >= 1000)   return `${(n / 1000).toFixed(0)}K`;
                return String(n);
              }}
              style={S.chart}
            />
          </ScrollView>
        </>
      )}
    </View>
  );
};

const S = StyleSheet.create({
  card: {
    borderRadius: Radius.xl,
    borderWidth:  1,
    marginBottom: Spacing.md,
    overflow:     'hidden',
  },

  header: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'flex-start',
    padding:        Spacing.base,
    paddingBottom:  Spacing.sm,
  },
  title:    { fontSize: Typography.base, fontWeight: '800' },
  subtitle: { fontSize: Typography.xs, marginTop: 2 },

  toggleBtn: {
    flexDirection:  'row',
    alignItems:     'center',
    borderWidth:    1,
    borderRadius:   Radius.full,
    paddingVertical: 4,
    paddingHorizontal: Spacing.sm,
  },
  toggleDot:  { width: 7, height: 7, borderRadius: 4, marginRight: 4 },
  toggleText: { fontSize: Typography.xs, fontWeight: '700' },

  // Stats
  statsRow: {
    flexDirection: 'row',
    gap:           Spacing.sm,
    paddingHorizontal: Spacing.base,
    marginBottom:  Spacing.sm,
  },
  statBox: {
    flex:          1,
    borderRadius:  Radius.md,
    padding:       Spacing.sm,
    alignItems:    'center',
  },
  statLabel: { fontSize: Typography.xs, fontWeight: '600', textAlign: 'center' },
  statValue: { fontSize: Typography.sm, fontWeight: '800', marginTop: 2 },

  // Legend
  legendRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.base,
    marginBottom:  Spacing.xs,
    gap:           Spacing.lg,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center' },
  legendLine: { width: 18, height: 3, borderRadius: 2, marginRight: 6 },
  legendLabel: { fontSize: Typography.xs, fontWeight: '600' },

  chart: { paddingRight: 0, marginLeft: -10 },

  empty: { alignItems: 'center', paddingVertical: Spacing['2xl'] },
  emptyEmoji: { fontSize: 36, marginBottom: Spacing.sm },
  emptyText:  { fontSize: Typography.sm },
});

export default TrendLineChart;
