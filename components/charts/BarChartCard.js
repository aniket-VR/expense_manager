// components/charts/BarChartCard.js
// ─────────────────────────────────────────────────────────
// Stacked/grouped bar chart comparing income vs expense
// per time bucket. Uses react-native-chart-kit BarChart.
// ─────────────────────────────────────────────────────────

import React from 'react';
import { View, Text, StyleSheet, Dimensions, ScrollView } from 'react-native';
import { BarChart } from 'react-native-chart-kit';

import { useTheme }       from '../../context/ThemeContext';
import { Typography, Spacing, Radius } from '../../utils/theme';
import { formatCurrency } from '../../utils/formatters';

const SCREEN_W = Dimensions.get('window').width;
const CHART_W  = SCREEN_W - Spacing.base * 2;

const BarChartCard = ({ trendSeries, period }) => {
  const { Colors, isDark } = useTheme();

  const { labels = [], expenseData = [] } = trendSeries || {};
  const hasData = expenseData.some((v) => v > 0);

  const safeLabels = labels.length ? labels : [''];
  const safeData   = expenseData.length ? expenseData.map((v) => Math.round(v || 0)) : [0];

  // Find top bucket for annotation
  const maxVal  = Math.max(...safeData, 1);
  const maxIdx  = safeData.indexOf(maxVal);

  const chartConfig = {
    backgroundColor:        Colors.bgCard,
    backgroundGradientFrom: Colors.bgCard,
    backgroundGradientTo:   Colors.bgCard,
    decimalPlaces:          0,
    barPercentage:          0.55,
    color:          (opacity = 1) => `rgba(248,81,73,${opacity})`,
    labelColor:     (opacity = 1) => isDark
      ? `rgba(139,148,158,${opacity})`
      : `rgba(87,96,106,${opacity})`,
    propsForBackgroundLines: {
      stroke:          Colors.border,
      strokeDasharray: '3 3',
      strokeWidth:     1,
    },
    propsForLabels: { fontSize: 10 },
    fillShadowGradientOpacity: 0.9,
    fillShadowGradientToOpacity: 0.6,
  };

  return (
    <View style={[S.card, { backgroundColor: Colors.bgCard, borderColor: Colors.border }]}>
      <View style={S.header}>
        <View>
          <Text style={[S.title, { color: Colors.textPrimary }]}>Expense by Period</Text>
          <Text style={[S.subtitle, { color: Colors.textMuted }]}>
            {period === 'week' ? 'Daily bars' : period === 'month' ? 'Daily bars' : 'Monthly bars'}
          </Text>
        </View>
        {hasData && (
          <View style={[S.badge, { backgroundColor: Colors.danger + '20' }]}>
            <Text style={[S.badgeText, { color: Colors.danger }]}>
              Peak {formatCurrency(maxVal)}
            </Text>
          </View>
        )}
      </View>

      {!hasData ? (
        <View style={S.empty}>
          <Text style={S.emptyEmoji}>📊</Text>
          <Text style={[S.emptyText, { color: Colors.textMuted }]}>No expense data</Text>
        </View>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <BarChart
            data={{ labels: safeLabels, datasets: [{ data: safeData }] }}
            width={Math.max(CHART_W, safeLabels.length * 38)}
            height={180}
            chartConfig={chartConfig}
            fromZero
            showValuesOnTopOfBars={safeData.length <= 12}
            withInnerLines
            withHorizontalLabels
            yAxisLabel="₹"
            formatYLabel={(v) => {
              const n = Number(v);
              if (n >= 100000) return `${(n / 100000).toFixed(0)}L`;
              if (n >= 1000)   return `${(n / 1000).toFixed(0)}K`;
              return String(n);
            }}
            style={S.chart}
          />
        </ScrollView>
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
  badge:    { borderRadius: Radius.full, paddingHorizontal: Spacing.sm, paddingVertical: 3 },
  badgeText:{ fontSize: Typography.xs, fontWeight: '700' },

  chart: { paddingRight: 0, marginLeft: -10 },

  empty: { alignItems: 'center', paddingVertical: Spacing['2xl'] },
  emptyEmoji: { fontSize: 36, marginBottom: Spacing.sm },
  emptyText:  { fontSize: Typography.sm },
});

export default BarChartCard;
