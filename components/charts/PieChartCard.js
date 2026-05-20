// components/charts/PieChartCard.js
// ─────────────────────────────────────────────────────────
// Category pie chart + ranked breakdown table.
// Tap a row to highlight that slice.
// react-native-chart-kit PieChart renders in SVG via
// react-native-svg — no native build step needed in Expo.
// ─────────────────────────────────────────────────────────

import React, { useState } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, ScrollView } from 'react-native';
import { PieChart } from 'react-native-chart-kit';

import { useTheme }        from '../../context/ThemeContext';
import { Typography, Spacing, Radius } from '../../utils/theme';
import { formatCurrency }  from '../../utils/formatters';
import { getCategoryMeta } from '../../utils/constants';

const SCREEN_W = Dimensions.get('window').width;
const CHART_W  = SCREEN_W - Spacing.base * 2;

const PieChartCard = ({
  data         = [],   // pieData from useAnalytics
  categoryRows = [],   // expenseByCategory / incomeByCategory
  total        = 0,
  title        = 'Spending by Category',
  type         = 'expense',
}) => {
  const { Colors } = useTheme();
  const [selectedIdx, setSelectedIdx] = useState(null);

  const isEmpty = !data.length;
  const accentColor = type === 'income' ? Colors.safe : Colors.danger;

  const chartConfig = {
    backgroundColor:         Colors.bgCard,
    backgroundGradientFrom:  Colors.bgCard,
    backgroundGradientTo:    Colors.bgCard,
    color: (opacity = 1) => `rgba(139,148,158,${opacity})`,
  };

  return (
    <View style={[S.card, { backgroundColor: Colors.bgCard, borderColor: Colors.border }]}>
      {/* ── Card header ── */}
      <View style={S.header}>
        <View>
          <Text style={[S.title, { color: Colors.textPrimary }]}>{title}</Text>
          <Text style={[S.subtitle, { color: Colors.textMuted }]}>
            {categoryRows.length} {type === 'income' ? 'income' : 'expense'} categories
          </Text>
        </View>
        <Text style={[S.total, { color: accentColor }]}>
          {type === 'income' ? '+' : '−'}{formatCurrency(total)}
        </Text>
      </View>

      {isEmpty ? (
        /* ── Empty state ── */
        <View style={S.empty}>
          <Text style={S.emptyEmoji}>🥧</Text>
          <Text style={[S.emptyText, { color: Colors.textMuted }]}>
            No {type} data for this period
          </Text>
        </View>
      ) : (
        <>
          {/* ── Pie chart ── */}
          <View style={S.chartWrap}>
            <PieChart
              data={data}
              width={CHART_W}
              height={190}
              chartConfig={chartConfig}
              accessor="population"
              backgroundColor="transparent"
              paddingLeft="15"
              hasLegend={false}
              avoidFalseZero
            />

            {/* Centre annotation — shows selected slice, or total */}
            <View style={S.centreOverlay} pointerEvents="none">
              {selectedIdx !== null ? (
                <>
                  <Text style={[S.centreEmoji]}>
                    {getCategoryMeta(data[selectedIdx]?.name, type).emoji}
                  </Text>
                  <Text style={[S.centreAmt, { color: accentColor }]}>
                    {formatCurrency(data[selectedIdx]?.population)}
                  </Text>
                  <Text style={[S.centrePct, { color: Colors.textMuted }]}>
                    {data[selectedIdx]?.percentage}%
                  </Text>
                </>
              ) : (
                <>
                  <Text style={[S.centreTotalLabel, { color: Colors.textMuted }]}>Total</Text>
                  <Text style={[S.centreTotalAmt, { color: accentColor }]}>
                    {formatCurrency(total)}
                  </Text>
                </>
              )}
            </View>
          </View>

          {/* ── Colour legend chips ── */}
          <View style={S.legendWrap}>
            {data.map((item, i) => (
              <TouchableOpacity
                key={item.name}
                onPress={() => setSelectedIdx(selectedIdx === i ? null : i)}
                style={[
                  S.legendChip,
                  { borderColor: Colors.border, backgroundColor: Colors.bgCardHover },
                  selectedIdx === i && { backgroundColor: item.color + '22', borderColor: item.color },
                ]}
              >
                <View style={[S.legendDot, { backgroundColor: item.color }]} />
                <Text style={[S.legendLabel, { color: Colors.textSecondary }]} numberOfLines={1}>
                  {getCategoryMeta(item.name, type).name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* ── Table divider ── */}
          <View style={[S.tableDivider, { backgroundColor: Colors.border }]} />

          {/* ── Column headers ── */}
          <View style={[S.tableHeader, { borderBottomColor: Colors.border }]}>
            <Text style={[S.colHead, { color: Colors.textMuted, flex: 3 }]}>CATEGORY</Text>
            <Text style={[S.colHead, { color: Colors.textMuted, flex: 2, textAlign: 'right' }]}>AMOUNT</Text>
            <Text style={[S.colHead, { color: Colors.textMuted, width: 48, textAlign: 'right' }]}>SHARE</Text>
            <Text style={[S.colHead, { color: Colors.textMuted, width: 30, textAlign: 'center' }]}>#</Text>
          </View>

          {/* ── Data rows ── */}
          {categoryRows.map((row, i) => {
            const meta      = getCategoryMeta(row.category, type);
            const pct       = total > 0 ? (row.total / total) * 100 : 0;
            const rowColor  = data[i]?.color || Colors.accent;
            const isSelected = selectedIdx === i;

            return (
              <TouchableOpacity
                key={row.category}
                onPress={() => setSelectedIdx(isSelected ? null : i)}
                activeOpacity={0.75}
                style={[
                  S.tableRow,
                  { borderBottomColor: Colors.border },
                  isSelected && { backgroundColor: rowColor + '14' },
                ]}
              >
                {/* Colour indicator bar */}
                <View style={[S.rowBar, { backgroundColor: rowColor }]} />

                {/* Category */}
                <View style={[S.catCell, { flex: 3 }]}>
                  <View style={[S.catIcon, { backgroundColor: rowColor + '22' }]}>
                    <Text style={{ fontSize: 14 }}>{meta.emoji}</Text>
                  </View>
                  <Text style={[S.rowName, { color: Colors.textPrimary }]} numberOfLines={1}>
                    {meta.name}
                  </Text>
                </View>

                {/* Amount */}
                <Text style={[S.rowAmt, { color: accentColor, flex: 2 }]}>
                  {formatCurrency(row.total)}
                </Text>

                {/* Share bar + % */}
                <View style={[S.shareCell, { width: 48 }]}>
                  <View style={[S.shareTrack, { backgroundColor: Colors.bgCardHover }]}>
                    <View style={[
                      S.shareFill,
                      { width: `${Math.min(pct, 100)}%`, backgroundColor: rowColor },
                    ]} />
                  </View>
                  <Text style={[S.pctText, { color: Colors.textMuted }]}>
                    {pct.toFixed(1)}%
                  </Text>
                </View>

                {/* Count */}
                <Text style={[S.rowCount, { color: Colors.textMuted, width: 30 }]}>
                  {row.count}
                </Text>
              </TouchableOpacity>
            );
          })}
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

  // Header
  header: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'flex-start',
    padding:        Spacing.base,
    paddingBottom:  Spacing.sm,
  },
  title:    { fontSize: Typography.base, fontWeight: '800' },
  subtitle: { fontSize: Typography.xs, marginTop: 2 },
  total:    { fontSize: Typography.lg, fontWeight: '900' },

  // Empty
  empty: { alignItems: 'center', paddingVertical: Spacing['2xl'] },
  emptyEmoji: { fontSize: 40, marginBottom: Spacing.sm },
  emptyText:  { fontSize: Typography.sm },

  // Chart wrapper for centre overlay
  chartWrap: { position: 'relative', alignItems: 'center' },
  centreOverlay: {
    position:       'absolute',
    top: 0, bottom: 0,
    left: CHART_W * 0.5 - 54,
    width:          108,
    alignItems:     'center',
    justifyContent: 'center',
    pointerEvents:  'none',
  },
  centreEmoji:      { fontSize: 28 },
  centreAmt:        { fontSize: Typography.base, fontWeight: '900', marginTop: 2 },
  centrePct:        { fontSize: Typography.xs, marginTop: 1 },
  centreTotalLabel: { fontSize: Typography.xs, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8 },
  centreTotalAmt:   { fontSize: Typography.base, fontWeight: '900', marginTop: 2 },

  // Legend chips
  legendWrap: {
    flexDirection: 'row',
    flexWrap:      'wrap',
    paddingHorizontal: Spacing.sm,
    paddingBottom: Spacing.sm,
    gap:           Spacing.xs,
  },
  legendChip: {
    flexDirection:  'row',
    alignItems:     'center',
    borderWidth:    1,
    borderRadius:   Radius.full,
    paddingVertical: 3,
    paddingHorizontal: Spacing.sm,
  },
  legendDot:   { width: 7, height: 7, borderRadius: 4, marginRight: 4 },
  legendLabel: { fontSize: Typography.xs, fontWeight: '600', maxWidth: 80 },

  tableDivider: { height: 1, marginTop: Spacing.xs },

  // Table
  tableHeader: {
    flexDirection:    'row',
    alignItems:       'center',
    paddingHorizontal: Spacing.base,
    paddingVertical:  Spacing.sm,
    borderBottomWidth: 1,
  },
  colHead: {
    fontSize:    Typography.xs,
    fontWeight:  '700',
    letterSpacing: 0.6,
  },

  tableRow: {
    flexDirection:    'row',
    alignItems:       'center',
    paddingHorizontal: Spacing.base,
    paddingVertical:  Spacing.md,
    borderBottomWidth: 1,
  },
  rowBar: { width: 3, height: '70%', borderRadius: 2, marginRight: Spacing.sm },

  catCell: { flexDirection: 'row', alignItems: 'center' },
  catIcon: {
    width:          28,
    height:         28,
    borderRadius:   Radius.sm,
    alignItems:     'center',
    justifyContent: 'center',
    marginRight:    Spacing.sm,
  },
  rowName:  { fontSize: Typography.sm, fontWeight: '600', flex: 1 },
  rowAmt:   { fontSize: Typography.sm, fontWeight: '800', textAlign: 'right' },

  shareCell:  { alignItems: 'flex-end' },
  shareTrack: { width: 40, height: 4, borderRadius: 2, overflow: 'hidden', marginBottom: 2 },
  shareFill:  { height: '100%', borderRadius: 2 },
  pctText:    { fontSize: Typography.xs },
  rowCount:   { fontSize: Typography.xs, textAlign: 'center' },
});

export default PieChartCard;
