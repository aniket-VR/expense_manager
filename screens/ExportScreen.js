// screens/ExportScreen.js
// ─────────────────────────────────────────────────────────
// Export screen — choose period, preview summary, export to
// PDF or CSV.
//
// Flow:
//   1. User picks period (Today / Week / Month / Year / All)
//   2. Hook fetches transactions for that period (one-shot)
//   3. Preview card shows counts + totals before exporting
//   4. "Export PDF" → buildPDFHtml → sharePDF
//      "Export CSV" → buildCSV     → shareCSV
// ─────────────────────────────────────────────────────────

import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme }      from '../context/ThemeContext';
import { Typography, Spacing, Radius } from '../utils/theme';
import { fetchTransactionsByFilter } from '../services/transactionService';
import { buildCSV, buildPDFHtml, shareCSV, sharePDF } from '../services/exportService';
import { formatCurrency } from '../utils/formatters';
import { getCategoryMeta } from '../utils/constants';
import { Button, Card, LoadingOverlay, EmptyState } from '../components/UI';
import useAuth from '../hooks/useAuth';
import { showRewardedAd, loadRewardedAd } from '../utils/RewardedAdManager';


// ── Config ────────────────────────────────────────────────

const PERIODS = [
  { key: 'today', label: 'Today',      emoji: '📅' },
  { key: 'week',  label: 'This Week',  emoji: '📆' },
  { key: 'month', label: 'This Month', emoji: '🗓️' },
  { key: 'year',  label: 'This Year',  emoji: '📊' },
  { key: 'all',   label: 'All Time',   emoji: '🗃️' },
];


// ── Small sub-components ──────────────────────────────────

const PeriodChip = ({ item, selected, onPress, Colors }) => (
  <TouchableOpacity
    onPress={() => onPress(item.key)}
    style={[
      styles.periodChip,
      { backgroundColor: Colors.bgCard, borderColor: Colors.border },
      selected && { backgroundColor: Colors.accent, borderColor: Colors.accent },
    ]}
    activeOpacity={0.75}
  >
    <Text style={styles.periodEmoji}>{item.emoji}</Text>
    <Text style={[
      styles.periodLabel,
      { color: selected ? Colors.black : Colors.textSecondary },
    ]}>
      {item.label}
    </Text>
  </TouchableOpacity>
);

const StatRow = ({ label, value, valueColor, Colors }) => (
  <View style={[styles.statRow, { borderBottomColor: Colors.border }]}>
    <Text style={[styles.statLabel, { color: Colors.textSecondary }]}>{label}</Text>
    <Text style={[styles.statValue, { color: valueColor || Colors.textPrimary }]}>{value}</Text>
  </View>
);

// ── Main screen ───────────────────────────────────────────

const ExportScreen = () => {
  const { Colors }       = useTheme();
  const { user, profile } = useAuth();

  const [period,       setPeriod]       = useState('month');
  const [transactions, setTransactions] = useState([]);
  const [fetching,     setFetching]     = useState(false);
  const [exportingPDF, setExportingPDF] = useState(false);
  const [exportingCSV, setExportingCSV] = useState(false);
  const [fetchError,   setFetchError]   = useState('');


  
  // Fetch transactions when period changes
  const loadData = useCallback(async () => {
    if (!user?.uid) return;
    setFetching(true);
    setFetchError('');
    try {
      const data = await fetchTransactionsByFilter(user.uid, period);
      setTransactions(data);
    } catch (e) {
      console.error(e);
      setFetchError('Could not load transactions. Check your connection.');
    } finally {
      setFetching(false);
    }
  }, [user?.uid, period]);

  useEffect(() => { loadData(); }, [loadData]);

  // Derived summary
  const expenses     = transactions.filter((t) => t.type === 'expense');
  const income       = transactions.filter((t) => t.type === 'income');
  const totalExpense = expenses.reduce((s, t) => s + t.amount, 0);
  const totalIncome  = income.reduce((s, t) => s + t.amount, 0);
  const savings      = totalIncome - totalExpense;
  const savingsRate  = totalIncome > 0 ? (savings / totalIncome) * 100 : 0;

  // Category breakdown for preview
  const catMap = {};
  expenses.forEach((t) => {
    const k = t.category || 'others';
    if (!catMap[k]) catMap[k] = { total: 0 };
    catMap[k].total += t.amount;
  });
  const topCats = Object.entries(catMap)
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, 4);

  const summary = { totalIncome, totalExpense, savings, savingsRate, period };

  const filename = `expense_report_${period}_${new Date().toISOString().split('T')[0]}`;

  // ── Export handlers ──────────────────────────────────────

  const handleExportPDF = async () => {
    showRewardedAd();

    if (transactions.length === 0) {
      Alert.alert('No Data', 'No transactions found for this period.');
      return;
    }
    setExportingPDF(true);
    try {
      const html = buildPDFHtml(transactions, summary, profile, period);
      await sharePDF(html, `${filename}.pdf`);
    } catch (e) {
      console.error(e);
      Alert.alert('Export Failed', e.message || 'Could not generate PDF. Try again.');
    } finally {
      setExportingPDF(false);
    }
  };

  const handleExportCSV = async () => {
    showRewardedAd();

    if (transactions.length === 0) {
      Alert.alert('No Data', 'No transactions found for this period.');
      return;
    }
    setExportingCSV(true);
    try {
      const csv = buildCSV(transactions, summary);
      await shareCSV(csv, `${filename}.csv`);
    } catch (e) {
      console.error(e);
      Alert.alert('Export Failed', e.message || 'Could not generate CSV. Try again.');
    } finally {
      setExportingCSV(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: Colors.bg }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

        {/* ── Header ── */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: Colors.textPrimary }]}>Export</Text>
          <Text style={[styles.subtitle, { color: Colors.textSecondary }]}>
            Download your financial data as PDF or CSV
          </Text>
        </View>

        {/* ── Period picker ── */}
        <Text style={[styles.sectionLabel, { color: Colors.textSecondary }]}>Select Period</Text>
        <View style={styles.periodGrid}>
          {PERIODS.map((item) => (
            <PeriodChip
              key={item.key}
              item={item}
              selected={period === item.key}
              onPress={setPeriod}
              Colors={Colors}
            />
          ))}
        </View>

        {/* ── Data preview card ── */}
        <Text style={[styles.sectionLabel, { color: Colors.textSecondary }]}>Preview</Text>

        <View style={[styles.previewCard, { backgroundColor: Colors.bgCard, borderColor: Colors.border }]}>
          {/* Card header */}
          <View style={[styles.previewHeader, { borderBottomColor: Colors.border }]}>
            <View>
              <Text style={[styles.previewTitle, { color: Colors.textPrimary }]}>
                {PERIODS.find((p) => p.key === period)?.label || 'Period'}
              </Text>
              <Text style={[styles.previewSub, { color: Colors.textMuted }]}>
                {fetching ? 'Loading…' : `${transactions.length} transactions`}
              </Text>
            </View>
            {fetching && <ActivityIndicator color={Colors.accent} size="small" />}
          </View>

          {fetching ? (
            <View style={styles.fetchingRow}>
              <ActivityIndicator color={Colors.accent} />
              <Text style={[styles.fetchingText, { color: Colors.textMuted }]}>
                Fetching transactions…
              </Text>
            </View>
          ) : fetchError ? (
            <View style={styles.errorRow}>
              <Text style={[styles.errorText, { color: Colors.danger }]}>{fetchError}</Text>
              <TouchableOpacity onPress={loadData}>
                <Text style={[styles.retryText, { color: Colors.accent }]}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : transactions.length === 0 ? (
            <View style={styles.emptyPreview}>
              <Text style={styles.emptyEmoji}>📭</Text>
              <Text style={[styles.emptyText, { color: Colors.textMuted }]}>
                No transactions in this period
              </Text>
            </View>
          ) : (
            <>
              {/* Summary rows */}
              <StatRow label="Total Income"  value={`+${formatCurrency(totalIncome)}`}  valueColor={Colors.safe}   Colors={Colors} />
              <StatRow label="Total Expense" value={`−${formatCurrency(totalExpense)}`} valueColor={Colors.danger} Colors={Colors} />
              <StatRow
                label="Net Savings"
                value={`${savings >= 0 ? '+' : '−'}${formatCurrency(Math.abs(savings))}`}
                valueColor={savings >= 0 ? Colors.safe : Colors.danger}
                Colors={Colors}
              />
              <StatRow
                label="Savings Rate"
                value={`${savingsRate.toFixed(1)}%`}
                valueColor={savingsRate >= 20 ? Colors.safe : savingsRate >= 10 ? Colors.warning : Colors.danger}
                Colors={Colors}
              />
              <StatRow label="Income Txns"  value={String(income.length)}   Colors={Colors} />
              <StatRow label="Expense Txns" value={String(expenses.length)} Colors={Colors} />

              {/* Top categories */}
              {topCats.length > 0 && (
                <View style={[styles.catsSection, { borderTopColor: Colors.border }]}>
                  <Text style={[styles.catsTitle, { color: Colors.textMuted }]}>Top Spending</Text>
                  {topCats.map(([cat, data]) => {
                    const meta = getCategoryMeta(cat, 'expense');
                    const barW = totalExpense > 0 ? (data.total / totalExpense) * 100 : 0;
                    return (
                      <View key={cat} style={styles.catPreviewRow}>
                        <Text style={styles.catEmoji}>{meta.emoji}</Text>
                        <View style={styles.catMid}>
                          <View style={styles.catLabelRow}>
                            <Text style={[styles.catName, { color: Colors.textPrimary }]}>{meta.name}</Text>
                            <Text style={[styles.catAmt, { color: Colors.danger }]}>
                              {formatCurrency(data.total)}
                            </Text>
                          </View>
                          <View style={[styles.barTrack, { backgroundColor: Colors.bgCardHover }]}>
                            <View style={[
                              styles.barFill,
                              { width: `${barW}%`, backgroundColor: meta.color || Colors.danger },
                            ]} />
                          </View>
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </>
          )}
        </View>

        {/* ── Export format cards ── */}
        <Text style={[styles.sectionLabel, { color: Colors.textSecondary }]}>Export Format</Text>

        {/* PDF card */}
        <TouchableOpacity
          onPress={handleExportPDF}
          disabled={exportingPDF || exportingCSV || fetching || transactions.length === 0}
          activeOpacity={0.8}
          style={[
            styles.formatCard,
            { backgroundColor: Colors.bgCard, borderColor: Colors.border },
            (exportingPDF) && { borderColor: Colors.accent },
          ]}
        >
          <View style={[styles.formatIcon, { backgroundColor: '#cf222e22' }]}>
            <Text style={styles.formatEmoji}>📄</Text>
          </View>
          <View style={styles.formatText}>
            <Text style={[styles.formatTitle, { color: Colors.textPrimary }]}>Export as PDF</Text>
            <Text style={[styles.formatSub, { color: Colors.textMuted }]}>
              Formatted report with charts, summary cards, and transaction table.
              Best for sharing or printing.
            </Text>
            <View style={styles.formatTags}>
              {['Summary', 'Charts', 'Transactions', 'Categories'].map((t) => (
                <View key={t} style={[styles.tag, { backgroundColor: '#cf222e18' }]}>
                  <Text style={[styles.tagText, { color: '#cf222e' }]}>{t}</Text>
                </View>
              ))}
            </View>
          </View>
          {exportingPDF
            ? <ActivityIndicator color={Colors.accent} size="small" />
            : <Text style={[styles.arrow, { color: Colors.textMuted }]}>›</Text>}
        </TouchableOpacity>

        {/* CSV card */}
        <TouchableOpacity
          onPress={handleExportCSV}
          disabled={exportingCSV || exportingPDF || fetching || transactions.length === 0}
          activeOpacity={0.8}
          style={[
            styles.formatCard,
            { backgroundColor: Colors.bgCard, borderColor: Colors.border },
            (exportingCSV) && { borderColor: Colors.accent },
          ]}
        >
          <View style={[styles.formatIcon, { backgroundColor: '#1a7f3722' }]}>
            <Text style={styles.formatEmoji}>📊</Text>
          </View>
          <View style={styles.formatText}>
            <Text style={[styles.formatTitle, { color: Colors.textPrimary }]}>Export as CSV</Text>
            <Text style={[styles.formatSub, { color: Colors.textMuted }]}>
              Raw data including all transactions and category breakdown.
              Open in Excel, Google Sheets, or any spreadsheet app.
            </Text>
            <View style={styles.formatTags}>
              {['All Transactions', 'Category Totals', 'Excel Ready'].map((t) => (
                <View key={t} style={[styles.tag, { backgroundColor: '#1a7f3718' }]}>
                  <Text style={[styles.tagText, { color: '#1a7f37' }]}>{t}</Text>
                </View>
              ))}
            </View>
          </View>
          {exportingCSV
            ? <ActivityIndicator color={Colors.accent} size="small" />
            : <Text style={[styles.arrow, { color: Colors.textMuted }]}>›</Text>}
        </TouchableOpacity>

        {/* ── Info box ── */}
        <View style={[styles.infoBox, { backgroundColor: Colors.bgCard, borderColor: Colors.accentDim }]}>
          <Text style={[styles.infoTitle, { color: Colors.textPrimary }]}>📋 What's included</Text>
          {[
            '• Analytics summary (income, expense, savings rate)',
            '• Category-wise spending breakdown with percentages',
            '• Full transaction history with dates, amounts, notes',
            '• Account information per transaction',
            '• PDF: limited to 200 transactions for file size',
            '• CSV: all transactions, unlimited',
          ].map((line) => (
            <Text key={line} style={[styles.infoLine, { color: Colors.textSecondary }]}>{line}</Text>
          ))}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe:      { flex: 1 },
  container: { paddingHorizontal: Spacing.base, paddingBottom: Spacing['3xl'] },

  header:   { paddingTop: Spacing.lg, paddingBottom: Spacing.base },
  title:    { fontSize: Typography['2xl'], fontWeight: '900' },
  subtitle: { fontSize: Typography.sm, marginTop: 4 },

  sectionLabel: {
    fontSize: Typography.xs, fontWeight: '700', textTransform: 'uppercase',
    letterSpacing: 1, marginBottom: Spacing.sm, marginTop: Spacing.lg,
  },

  // Period grid
  periodGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.xs },
  periodChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 1.5, borderRadius: Radius.full,
    paddingVertical: Spacing.sm, paddingHorizontal: Spacing.base,
  },
  periodEmoji: { fontSize: 14 },
  periodLabel: { fontSize: Typography.sm, fontWeight: '700' },

  // Preview card
  previewCard:   { borderRadius: Radius.xl, borderWidth: 1, overflow: 'hidden', marginBottom: Spacing.xs },
  previewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
                   padding: Spacing.base, borderBottomWidth: 1 },
  previewTitle:  { fontSize: Typography.base, fontWeight: '800' },
  previewSub:    { fontSize: Typography.xs, marginTop: 2 },

  fetchingRow:  { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.xl, justifyContent: 'center' },
  fetchingText: { fontSize: Typography.sm },
  errorRow:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing.base },
  errorText:    { fontSize: Typography.sm, flex: 1 },
  retryText:    { fontSize: Typography.sm, fontWeight: '700' },
  emptyPreview: { alignItems: 'center', padding: Spacing.xl },
  emptyEmoji:   { fontSize: 36, marginBottom: Spacing.sm },
  emptyText:    { fontSize: Typography.sm },

  statRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
               paddingHorizontal: Spacing.base, paddingVertical: Spacing.md, borderBottomWidth: 1 },
  statLabel: { fontSize: Typography.sm },
  statValue: { fontSize: Typography.sm, fontWeight: '800' },

  catsSection: { padding: Spacing.base, borderTopWidth: 1 },
  catsTitle:   { fontSize: Typography.xs, fontWeight: '700', textTransform: 'uppercase',
                 letterSpacing: 0.8, marginBottom: Spacing.sm },
  catPreviewRow: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.sm },
  catEmoji:      { fontSize: 18, width: 28, marginRight: Spacing.sm },
  catMid:        { flex: 1 },
  catLabelRow:   { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  catName:       { fontSize: Typography.sm, fontWeight: '600' },
  catAmt:        { fontSize: Typography.sm, fontWeight: '700' },
  barTrack:      { height: 5, borderRadius: 3, overflow: 'hidden' },
  barFill:       { height: '100%', borderRadius: 3 },

  // Format cards
  formatCard: {
    flexDirection: 'row', alignItems: 'flex-start',
    borderRadius: Radius.xl, borderWidth: 1,
    padding: Spacing.base, marginBottom: Spacing.md,
    gap: Spacing.md,
  },
  formatIcon:  { width: 48, height: 48, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  formatEmoji: { fontSize: 24 },
  formatText:  { flex: 1 },
  formatTitle: { fontSize: Typography.base, fontWeight: '800', marginBottom: 4 },
  formatSub:   { fontSize: Typography.xs, lineHeight: 18, marginBottom: Spacing.sm },
  formatTags:  { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
  tag:         { borderRadius: Radius.full, paddingHorizontal: Spacing.sm, paddingVertical: 2 },
  tagText:     { fontSize: 10, fontWeight: '700' },
  arrow:       { fontSize: 24, lineHeight: 48 },

  // Info box
  infoBox:  { borderRadius: Radius.xl, borderWidth: 1, padding: Spacing.base, marginTop: Spacing.sm },
  infoTitle:{ fontSize: Typography.base, fontWeight: '800', marginBottom: Spacing.sm },
  infoLine: { fontSize: Typography.xs, lineHeight: 20 },
});

export default ExportScreen;
