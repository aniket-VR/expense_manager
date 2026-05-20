// screens/AnalyticsScreen.js
// ─────────────────────────────────────────────────────────
// Analytics Dashboard — complete feature set:
//
//  Filters:
//    • Period   — Week / Month / Quarter / Year
//    • Type     — Expense / Income  (switches pie chart)
//    • Account  — All / specific account
//    • Category — drill-down single-category filter
//
//  Sections:
//    1. Summary stats (income, expense, savings, savings rate)
//    2. Expense pie chart + category breakdown table
//    3. Income pie chart + breakdown table
//    4. Trend line chart (expense vs income over time)
//    5. Bar chart (expense per period)
//    6. Category filter drill-down list
//
//  Performance:
//    • One Firestore query per filter change (not real-time)
//    • All aggregation runs client-side on memoised arrays
//    • Manual refresh button — no wasted background reads
// ─────────────────────────────────────────────────────────

import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

import { useTheme }        from '../context/ThemeContext';
import { Typography, Spacing, Radius } from '../utils/theme';
import { formatCurrency }  from '../utils/formatters';
import { getCategoryMeta, EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '../utils/constants';
import { LoadingOverlay, Card }  from '../components/UI';
import SummaryStatsCard    from '../components/charts/SummaryStatsCard';
import PieChartCard        from '../components/charts/PieChartCard';
import TrendLineChart      from '../components/charts/TrendLineChart';
import BarChartCard        from '../components/charts/BarChartCard';
import useAuth             from '../hooks/useAuth';
import useAccounts         from '../hooks/useAccounts';
import useAnalytics        from '../hooks/useAnalytics';
import TransactionItem     from '../components/TransactionItem';

const SCREEN_W = Dimensions.get('window').width;

// ── Filter options ────────────────────────────────────────
const PERIODS = [
  { key: 'week',    label: 'Week'    },
  { key: 'month',   label: 'Month'   },
  { key: 'quarter', label: 'Quarter' },
  { key: 'year',    label: 'Year'    },
];

// ── FilterBar — generic horizontal pill selector ──────────
const FilterBar = ({ options, selected, onSelect, Colors }) => (
  <ScrollView
    horizontal
    showsHorizontalScrollIndicator={false}
    contentContainerStyle={{ gap: Spacing.sm, paddingHorizontal: Spacing.base, paddingVertical: Spacing.xs }}
  >
    {options.map((opt) => {
      const active = selected === opt.key;
      return (
        <TouchableOpacity
          key={opt.key}
          onPress={() => onSelect(opt.key)}
          style={[
            FB.pill,
            { borderColor: Colors.border, backgroundColor: Colors.bgCard },
            active && { backgroundColor: Colors.accent, borderColor: Colors.accent },
          ]}
        >
          {opt.emoji ? <Text style={{ fontSize: 14, marginRight: 4 }}>{opt.emoji}</Text> : null}
          <Text style={[FB.pillText, { color: active ? Colors.black : Colors.textSecondary, fontWeight: active ? '800' : '600' }]}>
            {opt.label}
          </Text>
        </TouchableOpacity>
      );
    })}
  </ScrollView>
);
const FB = StyleSheet.create({
  pill:     { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: Radius.full, paddingVertical: 6, paddingHorizontal: Spacing.md },
  pillText: { fontSize: Typography.sm },
});

// ── Main screen ───────────────────────────────────────────

const AnalyticsScreen = () => {
  const { Colors }   = useTheme();
  const navigation   = useNavigation();
  const { user }     = useAuth();
  const { accounts } = useAccounts(user?.uid);

  // Filters
  const [period,    setPeriod]    = useState('month');
  const [accountId, setAccountId] = useState('all');
  const [catFilter, setCatFilter] = useState('all');   // single category drill-down

  // Data
  const {
    loading, error, refetch, fetchedAt,
    summary, expenses, income,
    expenseByCategory, incomeByCategory,
    trendSeries, pieData, incomePieData,
  } = useAnalytics(user?.uid, period, accountId);

  // Filtered transactions for drill-down list
  const filteredTxns = catFilter === 'all'
    ? []
    : [...expenses, ...income]
        .filter((t) => t.category === catFilter)
        .sort((a, b) => {
          const da = a.date?.toDate ? a.date.toDate() : new Date(a.date);
          const db = b.date?.toDate ? b.date.toDate() : new Date(b.date);
          return db - da;
        });

  // Account filter options
  const accountOptions = [
    { key: 'all', label: 'All Accounts', emoji: '🏦' },
    ...accounts.map((a) => ({ key: a.id, label: a.name, emoji: a.emoji })),
  ];

  // Category filter options (expense)
  const catOptions = [
    { key: 'all', label: 'All', emoji: '📊' },
    ...expenseByCategory.map((r) => {
      const m = getCategoryMeta(r.category, 'expense');
      return { key: r.category, label: m.name, emoji: m.emoji };
    }),
  ];

  const handleRefresh = useCallback(() => { refetch(); }, [refetch]);

  if (loading) return <LoadingOverlay message="Crunching numbers…" />;

  return (
    <SafeAreaView style={[S.safe, { backgroundColor: Colors.bg }]} edges={['top']}>
      {/* ── Fixed header ── */}
      <View style={[S.topBar, { borderBottomColor: Colors.border, backgroundColor: Colors.bg }]}>
        <View>
          <Text style={[S.screenTitle, { color: Colors.textPrimary }]}>Analytics</Text>
          {fetchedAt && (
            <Text style={[S.fetchedAt, { color: Colors.textMuted }]}>
              Updated {fetchedAt.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true })}
            </Text>
          )}
        </View>
        <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
          <TouchableOpacity
            onPress={() => navigation.navigate('Export')}
            style={[S.refreshBtn, { backgroundColor: Colors.accentDim, borderColor: Colors.accent }]}
          >
            <Text style={{ fontSize: 14 }}>📤</Text>
            <Text style={[S.refreshText, { color: Colors.accent }]}>Export</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleRefresh}
            style={[S.refreshBtn, { backgroundColor: Colors.bgCard, borderColor: Colors.border }]}
          >
            <Text style={{ fontSize: 14 }}>🔄</Text>
            <Text style={[S.refreshText, { color: Colors.textSecondary }]}>Refresh</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Period filter ── */}
      <FilterBar
        options={PERIODS}
        selected={period}
        onSelect={(k) => { setPeriod(k); setCatFilter('all'); }}
        Colors={Colors}
      />

      <ScrollView
        contentContainerStyle={S.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={handleRefresh} tintColor={Colors.accent} />
        }
      >
        {/* ── Error banner ── */}
        {error && (
          <View style={[S.errorBanner, { backgroundColor: Colors.dangerBg, borderColor: Colors.danger }]}>
            <Text style={{ fontSize: 18 }}>⚠️</Text>
            <Text style={[S.errorText, { color: Colors.danger }]}>{error}</Text>
            <TouchableOpacity onPress={handleRefresh} style={[S.retryBtn, { borderColor: Colors.danger }]}>
              <Text style={[S.retryText, { color: Colors.danger }]}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Account filter ── */}
        {accounts.length > 0 && (
          <View style={S.section}>
            <Text style={[S.sectionLabel, { color: Colors.textSecondary }]}>Account</Text>
            <FilterBar
              options={accountOptions}
              selected={accountId}
              onSelect={setAccountId}
              Colors={Colors}
            />
          </View>
        )}

        {/* ════════════════════════════════
              1. SUMMARY STATS
            ════════════════════════════════ */}
        <View style={S.padded}>
          <SummaryStatsCard summary={summary} />
        </View>

        {/* ════════════════════════════════
              2. EXPENSE PIE + TABLE
            ════════════════════════════════ */}
        <View style={S.padded}>
          <PieChartCard
            data={pieData}
            categoryRows={expenseByCategory}
            total={summary.totalExpense}
            title="Expenses by Category"
            type="expense"
          />
        </View>

        {/* ════════════════════════════════
              3. INCOME PIE + TABLE
            ════════════════════════════════ */}
        {summary.totalIncome > 0 && (
          <View style={S.padded}>
            <PieChartCard
              data={incomePieData}
              categoryRows={incomeByCategory}
              total={summary.totalIncome}
              title="Income by Source"
              type="income"
            />
          </View>
        )}

        {/* ════════════════════════════════
              4. TREND LINE CHART
            ════════════════════════════════ */}
        <View style={S.padded}>
          <TrendLineChart trendSeries={trendSeries} period={period} />
        </View>

        {/* ════════════════════════════════
              5. BAR CHART
            ════════════════════════════════ */}
        <View style={S.padded}>
          <BarChartCard trendSeries={trendSeries} period={period} />
        </View>

        {/* ════════════════════════════════
              6. CATEGORY DRILL-DOWN
            ════════════════════════════════ */}
        {expenseByCategory.length > 0 && (
          <View style={S.padded}>
            <View style={[S.drillCard, { backgroundColor: Colors.bgCard, borderColor: Colors.border }]}>
              <Text style={[S.drillTitle, { color: Colors.textPrimary }]}>Category Filter</Text>
              <Text style={[S.drillSub, { color: Colors.textMuted }]}>
                Tap a category to see its transactions
              </Text>

              {/* Category chips */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: Spacing.sm }}>
                {catOptions.map((opt) => {
                  const active = catFilter === opt.key;
                  return (
                    <TouchableOpacity
                      key={opt.key}
                      onPress={() => setCatFilter(active ? 'all' : opt.key)}
                      style={[
                        S.catChip,
                        { borderColor: Colors.border, backgroundColor: Colors.bgCardHover },
                        active && { borderColor: Colors.accent, backgroundColor: Colors.accentDim },
                      ]}
                    >
                      <Text style={{ fontSize: 16 }}>{opt.emoji}</Text>
                      <Text style={[S.catChipText, { color: active ? Colors.accent : Colors.textSecondary }]}>
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* Drill-down transactions */}
              {catFilter !== 'all' && (
                <>
                  <View style={[S.drillDivider, { backgroundColor: Colors.border }]} />
                  {filteredTxns.length === 0 ? (
                    <Text style={[S.noTxns, { color: Colors.textMuted }]}>
                      No transactions in this category
                    </Text>
                  ) : (
                    <>
                      <View style={S.drillSummary}>
                        <Text style={[S.drillSummaryLabel, { color: Colors.textMuted }]}>
                          {filteredTxns.length} transactions
                        </Text>
                        <Text style={[S.drillSummaryAmt, { color: Colors.danger }]}>
                          {formatCurrency(filteredTxns.reduce((s, t) => s + t.amount, 0))}
                        </Text>
                      </View>
                      {filteredTxns.slice(0, 10).map((txn) => (
                        <TransactionItem key={txn.id} transaction={txn} showAccount />
                      ))}
                      {filteredTxns.length > 10 && (
                        <Text style={[S.moreText, { color: Colors.textMuted }]}>
                          +{filteredTxns.length - 10} more transactions
                        </Text>
                      )}
                    </>
                  )}
                </>
              )}
            </View>
          </View>
        )}

        {/* ── Empty state (no transactions at all) ── */}
        {!loading && summary.totalExpense === 0 && summary.totalIncome === 0 && !error && (
          <View style={S.padded}>
            <Card style={S.emptyCard}>
              <Text style={S.emptyEmoji}>📊</Text>
              <Text style={[S.emptyTitle, { color: Colors.textPrimary }]}>
                No data for this period
              </Text>
              <Text style={[S.emptySub, { color: Colors.textMuted }]}>
                Add some transactions and come back to see your analytics.
              </Text>
            </Card>
          </View>
        )}

        {/* Bottom padding */}
        <View style={{ height: Spacing['2xl'] }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const S = StyleSheet.create({
  safe:  { flex: 1 },
  scroll:{ paddingBottom: Spacing['2xl'] },
  padded:{ paddingHorizontal: Spacing.base },

  // Top bar
  topBar: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'center',
    paddingHorizontal: Spacing.base,
    paddingTop:     Spacing.md,
    paddingBottom:  Spacing.sm,
    borderBottomWidth: 1,
  },
  screenTitle: { fontSize: Typography['2xl'], fontWeight: '900' },
  fetchedAt:   { fontSize: Typography.xs, marginTop: 2 },
  refreshBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderWidth: 1, borderRadius: Radius.full,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs,
  },
  refreshText: { fontSize: Typography.sm, fontWeight: '700' },

  section:      { marginBottom: Spacing.xs },
  sectionLabel: { fontSize: Typography.xs, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, paddingHorizontal: Spacing.base, marginBottom: 2 },

  // Error
  errorBanner: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, margin: Spacing.base, padding: Spacing.md, borderRadius: Radius.md, borderWidth: 1 },
  errorText:   { flex: 1, fontSize: Typography.sm },
  retryBtn:    { borderWidth: 1, borderRadius: Radius.full, paddingHorizontal: Spacing.md, paddingVertical: 4 },
  retryText:   { fontSize: Typography.xs, fontWeight: '700' },

  // Drill-down card
  drillCard:    { borderRadius: Radius.xl, borderWidth: 1, padding: Spacing.base, marginBottom: Spacing.md },
  drillTitle:   { fontSize: Typography.base, fontWeight: '800' },
  drillSub:     { fontSize: Typography.xs, marginTop: 2 },
  catChip:      { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1.5, borderRadius: Radius.full, paddingVertical: 6, paddingHorizontal: Spacing.md, marginRight: Spacing.sm },
  catChipText:  { fontSize: Typography.sm, fontWeight: '700' },
  drillDivider: { height: 1, marginVertical: Spacing.sm },
  drillSummary: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: Spacing.xs },
  drillSummaryLabel: { fontSize: Typography.sm },
  drillSummaryAmt:   { fontSize: Typography.sm, fontWeight: '800' },
  noTxns:  { fontSize: Typography.sm, textAlign: 'center', paddingVertical: Spacing.lg },
  moreText:{ fontSize: Typography.sm, textAlign: 'center', paddingVertical: Spacing.md },

  // Empty
  emptyCard:  { alignItems: 'center', paddingVertical: Spacing['2xl'] },
  emptyEmoji: { fontSize: 52, marginBottom: Spacing.md },
  emptyTitle: { fontSize: Typography.lg, fontWeight: '800', marginBottom: Spacing.xs },
  emptySub:   { fontSize: Typography.sm, textAlign: 'center', lineHeight: 20 },
});

export default AnalyticsScreen;
