// screens/HomeScreen.js
// ─────────────────────────────────────────────────────────
// Dashboard showing:
//   • Net worth bar (total income, expense, balance)
//   • Period selector (Today / Week / Month / Year)
//   • Income vs Expense comparison card
//   • Savings rate progress bar
//   • Top spending categories
//   • Account balance tiles
//   • Today's recent transactions
// ─────────────────────────────────────────────────────────

import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

import { useTheme }            from '../context/ThemeContext';
import { Typography, Spacing, Radius } from '../utils/theme';
import { formatCurrency }      from '../utils/formatters';
import { getCategoryMeta }     from '../utils/constants';
import { LoadingOverlay, EmptyState, Card } from '../components/UI';
import LimitWarningBanner      from '../components/LimitWarningBanner';
import TransactionItem         from '../components/TransactionItem';
import useAuth                 from '../hooks/useAuth';
import useTransactions         from '../hooks/useTransactions';
import useAccounts             from '../hooks/useAccounts';
import useExpenses             from '../hooks/useExpenses';     // daily limit from legacy
import useCategoryLimits        from '../hooks/useCategoryLimits';
import CategoryLimitCard        from '../components/CategoryLimitCard';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const PERIODS = [
  { key: 'today', label: 'Today' },
  { key: 'week',  label: 'Week'  },
  { key: 'month', label: 'Month' },
  { key: 'year',  label: 'Year'  },
];

// ── Mini bar component for category breakdown ─────────────
const CategoryBar = ({ item, total, Colors }) => {
  const pct  = total > 0 ? (item.total / total) * 100 : 0;
  const meta = getCategoryMeta(item.category, 'expense');
  const barColor = meta.color || Colors.danger;

  return (
    <View style={catBarStyles.row}>
      <Text style={catBarStyles.emoji}>{meta.emoji}</Text>
      <View style={catBarStyles.mid}>
        <View style={catBarStyles.labelRow}>
          <Text style={[catBarStyles.name, { color: Colors.textPrimary }]} numberOfLines={1}>
            {meta.name}
          </Text>
          <Text style={[catBarStyles.pct, { color: Colors.textMuted }]}>
            {pct.toFixed(0)}%
          </Text>
        </View>
        <View style={[catBarStyles.track, { backgroundColor: Colors.bgCardHover }]}>
          <View style={[catBarStyles.fill, { width: `${pct}%`, backgroundColor: barColor }]} />
        </View>
      </View>
      <Text style={[catBarStyles.amount, { color: Colors.textPrimary }]}>
        {formatCurrency(item.total)}
      </Text>
    </View>
  );
};

const catBarStyles = StyleSheet.create({
  row:      { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.md },
  emoji:    { fontSize: 20, width: 30, marginRight: Spacing.sm },
  mid:      { flex: 1, marginRight: Spacing.md },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  name:     { fontSize: Typography.sm, fontWeight: '600', flex: 1 },
  pct:      { fontSize: Typography.xs, marginLeft: Spacing.xs },
  track:    { height: 5, borderRadius: 3, overflow: 'hidden' },
  fill:     { height: '100%', borderRadius: 3 },
  amount:   { fontSize: Typography.sm, fontWeight: '700', width: 70, textAlign: 'right' },
});

// ── Main component ────────────────────────────────────────
const HomeScreen = () => {
  const { Colors }            = useTheme();
  const navigation            = useNavigation();
  const { user, profile }     = useAuth();
  const { todayExpenses, todayTotal } = useExpenses(user?.uid);
  const { accounts, totalBalance }    = useAccounts(user?.uid);

  const [period, setPeriod] = useState('month');
  const { enriched: limitEnriched, exceededCount } = useCategoryLimits(user?.uid);
  const exceededLimits = limitEnriched.filter((e) => e.exceeded);
  const {
    transactions, expenses, income,
    totalExpense, totalIncome, balance,
    savingsRate, byCategory, loading,
  } = useTransactions(user?.uid, period);

  const dailyLimit  = profile?.dailyLimit || 0;
  const exceeded    = todayTotal > dailyLimit && dailyLimit > 0;
  const overage     = exceeded ? todayTotal - dailyLimit : 0;

  const greetingHour = new Date().getHours();
  const greeting = greetingHour < 12 ? 'Good morning'
                 : greetingHour < 17 ? 'Good afternoon'
                 : 'Good evening';

  const netPositive = balance >= 0;
  const savingsPct  = Math.min(Math.max(parseFloat(savingsRate), 0), 100);

  if (loading) return <LoadingOverlay message="Loading…" />;

  return (
    <SafeAreaView style={[S.safe, { backgroundColor: Colors.bg }]} edges={['top']}>
      <ScrollView contentContainerStyle={S.container} showsVerticalScrollIndicator={false}>

        {/* ── Header ── */}
        <View style={S.header}>
          <View>
            <Text style={[S.greeting, { color: Colors.textSecondary }]}>{greeting},</Text>
            <Text style={[S.name, { color: Colors.textPrimary }]}>
              {profile?.name?.split(' ')[0] || 'there'} 👋
            </Text>
          </View>
          <TouchableOpacity
            style={[S.addBtn, { backgroundColor: Colors.accent }]}
            onPress={() => navigation.navigate('Add')}
          >
            <Text style={[S.addBtnText, { color: Colors.black }]}>+ Add</Text>
          </TouchableOpacity>
        </View>

        {/* ── Daily limit warning ── */}
        <LimitWarningBanner exceeded={exceeded} overage={overage} />

        {/* ── Category budget exceeded banner ── */}
        {exceededLimits.length > 0 && (
          <TouchableOpacity
            onPress={() => navigation.navigate('CategoryLimits')}
            style={[catLimitBannerStyle.banner, { backgroundColor: Colors.dangerBg, borderColor: Colors.danger }]}
            activeOpacity={0.8}
          >
            <Text style={{ fontSize: 20 }}>🚨</Text>
            <View style={{ flex: 1, marginLeft: Spacing.sm }}>
              <Text style={[catLimitBannerStyle.title, { color: Colors.danger }]}>
                {exceededLimits.length} category budget{exceededLimits.length > 1 ? 's' : ''} exceeded!
              </Text>
              <Text style={[catLimitBannerStyle.sub, { color: Colors.danger }]}>
                {exceededLimits.map((e) => e.meta.name).join(', ')} — tap to review
              </Text>
            </View>
            <Text style={[{ color: Colors.danger, fontSize: 18 }]}>›</Text>
          </TouchableOpacity>
        )}

        {/* ── Net worth hero card ── */}
        <View style={[S.heroCard, {
          backgroundColor: Colors.bgCard,
          borderColor:     netPositive ? Colors.safe + '40' : Colors.danger + '40',
        }]}>
          <View style={[S.heroTop, { borderBottomColor: Colors.border }]}>
            <View style={S.heroLeft}>
              <Text style={[S.heroLabel, { color: Colors.textMuted }]}>Net Balance</Text>
              <Text style={[S.heroBalance, { color: netPositive ? Colors.safe : Colors.danger }]}>
                {netPositive ? '+' : '−'}{formatCurrency(Math.abs(balance))}
              </Text>
              <Text style={[S.heroSub, { color: Colors.textMuted }]}>
                {PERIODS.find((p) => p.key === period)?.label || 'Month'}
              </Text>
            </View>
            <View style={[S.heroBadge, {
              backgroundColor: netPositive ? Colors.safe + '20' : Colors.danger + '20',
            }]}>
              <Text style={{ fontSize: 32 }}>{netPositive ? '📈' : '📉'}</Text>
            </View>
          </View>

          {/* Income / Expense row */}
          <View style={S.heroStats}>
            <View style={S.heroStat}>
              <View style={[S.heroStatDot, { backgroundColor: Colors.safe }]} />
              <View>
                <Text style={[S.heroStatLabel, { color: Colors.textMuted }]}>Income</Text>
                <Text style={[S.heroStatValue, { color: Colors.safe }]}>
                  +{formatCurrency(totalIncome)}
                </Text>
              </View>
            </View>
            <View style={[S.heroStatDivider, { backgroundColor: Colors.border }]} />
            <View style={S.heroStat}>
              <View style={[S.heroStatDot, { backgroundColor: Colors.danger }]} />
              <View>
                <Text style={[S.heroStatLabel, { color: Colors.textMuted }]}>Expenses</Text>
                <Text style={[S.heroStatValue, { color: Colors.danger }]}>
                  −{formatCurrency(totalExpense)}
                </Text>
              </View>
            </View>
            <View style={[S.heroStatDivider, { backgroundColor: Colors.border }]} />
            <View style={S.heroStat}>
              <View style={[S.heroStatDot, { backgroundColor: Colors.accent }]} />
              <View>
                <Text style={[S.heroStatLabel, { color: Colors.textMuted }]}>Txns</Text>
                <Text style={[S.heroStatValue, { color: Colors.accent }]}>
                  {transactions.length}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* ── Period selector ── */}
        <View style={[S.periodRow, { backgroundColor: Colors.bgCard, borderColor: Colors.border }]}>
          {PERIODS.map((p) => (
            <TouchableOpacity
              key={p.key}
              style={[S.periodBtn, period === p.key && { backgroundColor: Colors.accent }]}
              onPress={() => setPeriod(p.key)}
            >
              <Text style={[S.periodLabel, {
                color: period === p.key ? Colors.black : Colors.textSecondary,
                fontWeight: period === p.key ? '800' : '600',
              }]}>
                {p.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Savings rate ── */}
        {totalIncome > 0 && (
          <Card style={S.savingsCard}>
            <View style={S.savingsHeader}>
              <Text style={[S.savingsTitle, { color: Colors.textPrimary }]}>Savings Rate</Text>
              <Text style={[S.savingsPct, {
                color: savingsPct >= 20 ? Colors.safe : savingsPct >= 10 ? Colors.warning : Colors.danger,
              }]}>
                {savingsRate}%
              </Text>
            </View>
            <View style={[S.savingsTrack, { backgroundColor: Colors.bgCardHover }]}>
              <View style={[S.savingsFill, {
                width: `${savingsPct}%`,
                backgroundColor: savingsPct >= 20 ? Colors.safe : savingsPct >= 10 ? Colors.warning : Colors.danger,
              }]} />
            </View>
            <Text style={[S.savingsTip, { color: Colors.textMuted }]}>
              {savingsPct >= 20
                ? '🎉 Great! You\'re saving well this period.'
                : savingsPct >= 10
                ? '👍 Decent savings. Can you cut more?'
                : '⚠️ Low savings — review your expenses.'}
            </Text>
          </Card>
        )}

        {/* ── Quick stat row ── */}
        <View style={S.quickStats}>
          {[
            { label: 'Daily Avg', value: formatCurrency(period === 'today' ? totalExpense : period === 'week' ? totalExpense / 7 : period === 'month' ? totalExpense / 30 : totalExpense / 365), color: Colors.textPrimary },
            { label: 'Largest Txn', value: formatCurrency(expenses.length ? Math.max(...expenses.map((e) => e.amount)) : 0), color: Colors.danger },
            { label: 'Income Txns', value: income.length, color: Colors.safe },
          ].map((stat) => (
            <Card key={stat.label} style={S.quickStatCard}>
              <Text style={[S.quickStatLabel, { color: Colors.textMuted }]}>{stat.label}</Text>
              <Text style={[S.quickStatValue, { color: stat.color }]}>{stat.value}</Text>
            </Card>
          ))}
        </View>

        {/* ── Category budgets ── */}
        {limitEnriched.length > 0 && (
          <>
            <View style={S.sectionRow}>
              <Text style={[S.sectionTitle, { color: Colors.textSecondary }]}>Category Budgets</Text>
              <TouchableOpacity onPress={() => navigation.navigate('CategoryLimits')}>
                <Text style={[S.link, { color: Colors.accent }]}>Manage →</Text>
              </TouchableOpacity>
            </View>
            <View style={[catLimitsCardStyle.card, { backgroundColor: Colors.bgCard, borderColor: Colors.border }]}>
              {limitEnriched.slice(0, 4).map((item) => (
                <CategoryLimitCard key={item.categoryId} item={item} compact />
              ))}
              {limitEnriched.length > 4 && (
                <TouchableOpacity onPress={() => navigation.navigate('CategoryLimits')}
                  style={catLimitsCardStyle.more}>
                  <Text style={[catLimitsCardStyle.moreText, { color: Colors.accent }]}>
                    +{limitEnriched.length - 4} more budgets →
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </>
        )}

        {/* ── Top spending categories ── */}
        {byCategory.length > 0 && (
          <>
            <View style={S.sectionRow}>
              <Text style={[S.sectionTitle, { color: Colors.textSecondary }]}>Top Spending</Text>
            </View>
            <Card style={S.catCard}>
              {byCategory.slice(0, 5).map((item) => (
                <CategoryBar
                  key={item.category}
                  item={item}
                  total={totalExpense}
                  Colors={Colors}
                />
              ))}
            </Card>
          </>
        )}

        {/* ── Accounts ── */}
        {accounts.length > 0 && (
          <>
            <View style={S.sectionRow}>
              <Text style={[S.sectionTitle, { color: Colors.textSecondary }]}>Accounts</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Accounts')}>
                <Text style={[S.link, { color: Colors.accent }]}>Manage →</Text>
              </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={S.accScroll}>
              {/* Net worth tile */}
              <View style={[S.accTile, S.accTileNetWorth, { backgroundColor: Colors.accent + '18', borderColor: Colors.accent + '40' }]}>
                <Text style={{ fontSize: 22 }}>💰</Text>
                <Text style={[S.accTileName, { color: Colors.textSecondary }]}>Net Worth</Text>
                <Text style={[S.accTileBal, { color: Colors.accent }]}>{formatCurrency(totalBalance)}</Text>
              </View>
              {accounts.map((acc) => (
                <TouchableOpacity
                  key={acc.id}
                  style={[S.accTile, { backgroundColor: Colors.bgCard, borderColor: Colors.border }]}
                  onPress={() => navigation.navigate('Accounts')}
                >
                  <View style={[S.accIcon, { backgroundColor: (acc.color || Colors.accent) + '22' }]}>
                    <Text style={{ fontSize: 18 }}>{acc.emoji}</Text>
                  </View>
                  <Text style={[S.accTileName, { color: Colors.textPrimary }]} numberOfLines={1}>
                    {acc.name}
                  </Text>
                  <Text style={[S.accTileBal, {
                    color: acc.balance < 0 ? Colors.danger : acc.color || Colors.accent,
                  }]}>
                    {formatCurrency(acc.balance || 0)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </>
        )}

        {/* ── Recent transactions ── */}
        <View style={S.sectionRow}>
          <Text style={[S.sectionTitle, { color: Colors.textSecondary }]}>Recent</Text>
          <TouchableOpacity onPress={() => navigation.navigate('History')}>
            <Text style={[S.link, { color: Colors.accent }]}>All →</Text>
          </TouchableOpacity>
        </View>

        {transactions.length === 0 ? (
          <EmptyState
            emoji="🪙"
            title="No transactions"
            subtitle={`No transactions for this ${period}.\nTap "+ Add" to get started.`}
          />
        ) : (
          <Card style={S.recentCard}>
            {transactions.slice(0, 5).map((txn) => (
              <TransactionItem key={txn.id} transaction={txn} />
            ))}
          </Card>
        )}

      </ScrollView>
    </SafeAreaView>
  );
};

const S = StyleSheet.create({
  safe:      { flex: 1 },
  container: { paddingHorizontal: Spacing.base, paddingBottom: Spacing['3xl'] },

  // Header
  header:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: Spacing.lg },
  greeting:   { fontSize: Typography.sm },
  name:       { fontSize: Typography.xl, fontWeight: '900' },
  addBtn:     { paddingHorizontal: Spacing.base, paddingVertical: Spacing.sm, borderRadius: Radius.full },
  addBtnText: { fontWeight: '700', fontSize: Typography.sm },

  // Hero card
  heroCard: {
    borderRadius: Radius.xl,
    borderWidth:  1.5,
    marginBottom: Spacing.md,
    overflow:     'hidden',
  },
  heroTop: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
    padding:        Spacing.xl,
    borderBottomWidth: 1,
  },
  heroLeft:    { flex: 1 },
  heroLabel:   { fontSize: Typography.xs, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  heroBalance: { fontSize: Typography['4xl'], fontWeight: '900', marginTop: 4, marginBottom: 4 },
  heroSub:     { fontSize: Typography.xs },
  heroBadge:   { width: 64, height: 64, borderRadius: Radius.xl, alignItems: 'center', justifyContent: 'center' },
  heroStats:   { flexDirection: 'row', alignItems: 'center', padding: Spacing.base },
  heroStat:    { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  heroStatDot: { width: 8, height: 8, borderRadius: 4 },
  heroStatLabel: { fontSize: Typography.xs, fontWeight: '600' },
  heroStatValue: { fontSize: Typography.base, fontWeight: '800' },
  heroStatDivider: { width: 1, height: 36, marginHorizontal: Spacing.sm },

  // Period
  periodRow: {
    flexDirection:  'row',
    borderRadius:   Radius.md,
    borderWidth:    1,
    padding:        3,
    marginBottom:   Spacing.md,
    overflow:       'hidden',
  },
  periodBtn:   { flex: 1, alignItems: 'center', paddingVertical: Spacing.sm, borderRadius: Radius.sm },
  periodLabel: { fontSize: Typography.sm },

  // Savings
  savingsCard:   { marginBottom: Spacing.md, padding: Spacing.base },
  savingsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  savingsTitle:  { fontSize: Typography.base, fontWeight: '700' },
  savingsPct:    { fontSize: Typography.xl, fontWeight: '900' },
  savingsTrack:  { height: 8, borderRadius: 4, overflow: 'hidden', marginBottom: Spacing.xs },
  savingsFill:   { height: '100%', borderRadius: 4 },
  savingsTip:    { fontSize: Typography.xs, marginTop: 4 },

  // Quick stats
  quickStats: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
  quickStatCard:  { flex: 1, padding: Spacing.sm },
  quickStatLabel: { fontSize: Typography.xs, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 2 },
  quickStatValue: { fontSize: Typography.base, fontWeight: '800' },

  // Section
  sectionRow:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  sectionTitle:{ fontSize: Typography.xs, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  link:        { fontSize: Typography.sm, fontWeight: '600' },

  // Categories
  catCard: { marginBottom: Spacing.md, padding: Spacing.base },

  // Accounts
  accScroll:      { marginBottom: Spacing.md },
  accTile:        { width: 110, borderRadius: Radius.lg, borderWidth: 1, padding: Spacing.sm, marginRight: Spacing.sm, alignItems: 'center' },
  accTileNetWorth: { borderStyle: 'dashed' },
  accIcon:         { width: 40, height: 40, borderRadius: Radius.full, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.xs },
  accTileName:     { fontSize: Typography.xs, fontWeight: '700', textAlign: 'center', marginBottom: 2 },
  accTileBal:      { fontSize: Typography.sm, fontWeight: '900', textAlign: 'center' },

  // Recent
  recentCard: { padding: 0, overflow: 'hidden' },
});

const catLimitBannerStyle = StyleSheet.create({
  banner:  { flexDirection: 'row', alignItems: 'center', borderRadius: Radius.md, borderWidth: 1, borderLeftWidth: 4, padding: Spacing.md, marginBottom: Spacing.md },
  title:   { fontSize: Typography.sm, fontWeight: '800' },
  sub:     { fontSize: Typography.xs, marginTop: 2, opacity: 0.85 },
});

const catLimitsCardStyle = StyleSheet.create({
  card:     { borderRadius: Radius.xl, borderWidth: 1, paddingHorizontal: Spacing.base, paddingTop: Spacing.sm, paddingBottom: 0, marginBottom: Spacing.md },
  more:     { paddingVertical: Spacing.md, alignItems: 'center' },
  moreText: { fontSize: Typography.sm, fontWeight: '700' },
});

export default HomeScreen;
