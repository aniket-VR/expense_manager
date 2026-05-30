// screens/HistoryScreen.js — Updated to use TransactionItem + account filter

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '../context/ThemeContext';
import { Typography, Spacing, Radius } from '../utils/theme';
import { formatCurrency, sumByType } from '../utils/formatters';
import { subscribeTransactionsByFilter } from '../services/transactionService';
import { EmptyState, LoadingOverlay, Card } from '../components/UI';
import TransactionItem from '../components/TransactionItem';
import useAuth     from '../hooks/useAuth';
import useAccounts from '../hooks/useAccounts';


const TIME_FILTERS = [
  { key: 'today', label: 'Today' },
  { key: 'week',  label: 'Week'  },
  { key: 'month', label: 'Month' },
  { key: 'year',  label: 'Year'  },
];

const TYPE_FILTERS = [
  { key: 'all',     label: 'All'     },
  { key: 'expense', label: 'Expense' },
  { key: 'income',  label: 'Income'  },
];

const HistoryScreen = () => {

 

  const { Colors } = useTheme();
  const { user }   = useAuth();
  const { accounts } = useAccounts(user?.uid);

  const [timeFilter, setTimeFilter] = useState('month');
  const [typeFilter, setTypeFilter] = useState('all');
  const [accFilter,  setAccFilter]  = useState('all');
  const [txns,       setTxns]       = useState([]);
  const [loading,    setLoading]    = useState(true);

  useEffect(() => {
    if (!user?.uid) return;
    setLoading(true);
    const unsub = subscribeTransactionsByFilter(
      user.uid, timeFilter,
      (data) => { setTxns(data); setLoading(false); },
      ()     => setLoading(false)
    );
    return () => unsub();
  }, [user?.uid, timeFilter]);

  // Client-side filters
  const filtered = txns.filter((t) => {
    if (typeFilter !== 'all' && t.type !== typeFilter) return false;
    if (accFilter  !== 'all' && t.accountId !== accFilter) return false;
    return true;
  });

  const totalIn  = sumByType(filtered, 'income');
  const totalOut = sumByType(filtered, 'expense');
  const balance  = totalIn - totalOut;

  const renderItem = useCallback(({ item }) => <TransactionItem transaction={item} />, []);
  const keyExtractor = useCallback((item) => item.id, []);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: Colors.bg }]} edges={['top']}>

      {/* Header */}
      <View style={[styles.header, { borderBottomColor: Colors.border }]}>
        <Text style={[styles.title, { color: Colors.textPrimary }]}>History</Text>
      </View>

      {/* Time filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}
        contentContainerStyle={styles.filterRow}>
        {TIME_FILTERS.map((f) => (
          <TouchableOpacity key={f.key}
            style={[styles.filterChip, { borderColor: Colors.border, backgroundColor: Colors.bgCard },
              timeFilter === f.key && { backgroundColor: Colors.accent, borderColor: Colors.accent }]}
            onPress={() => setTimeFilter(f.key)}>
            <Text style={[styles.filterText, timeFilter === f.key ? { color: Colors.black } : { color: Colors.textSecondary }]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Type filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}
        contentContainerStyle={styles.filterRow}>
        {TYPE_FILTERS.map((f) => (
          <TouchableOpacity key={f.key}
            style={[styles.filterChip, { borderColor: Colors.border, backgroundColor: Colors.bgCard },
              typeFilter === f.key && {
                backgroundColor: f.key === 'income' ? Colors.safe : f.key === 'expense' ? Colors.danger : Colors.accent,
                borderColor: 'transparent',
              }]}
            onPress={() => setTypeFilter(f.key)}>
            <Text style={[styles.filterText, typeFilter === f.key ? { color: Colors.white } : { color: Colors.textSecondary }]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}

        {/* Account chips */}
        <TouchableOpacity
          style={[styles.filterChip, { borderColor: Colors.border, backgroundColor: Colors.bgCard },
            accFilter === 'all' && { backgroundColor: Colors.accent, borderColor: Colors.accent }]}
          onPress={() => setAccFilter('all')}>
          <Text style={[styles.filterText, accFilter === 'all' ? { color: Colors.black } : { color: Colors.textSecondary }]}>
            All Accounts
          </Text>
        </TouchableOpacity>
        {accounts.map((acc) => (
          <TouchableOpacity key={acc.id}
            style={[styles.filterChip, { borderColor: Colors.border, backgroundColor: Colors.bgCard },
              accFilter === acc.id && { backgroundColor: acc.color || Colors.accent, borderColor: 'transparent' }]}
            onPress={() => setAccFilter(acc.id)}>
            <Text style={[styles.filterText, accFilter === acc.id ? { color: Colors.white } : { color: Colors.textSecondary }]}>
              {acc.emoji} {acc.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Summary strip */}
      {!loading && filtered.length > 0 && (
        <View style={[styles.summaryStrip, { backgroundColor: Colors.bgCard, borderColor: Colors.border }]}>
          <View style={styles.sumCell}>
            <Text style={[styles.sumLabel, { color: Colors.textMuted }]}>Income</Text>
            <Text style={[styles.sumVal, { color: Colors.safe }]}>+{formatCurrency(totalIn)}</Text>
          </View>
          <View style={[styles.sumDivider, { backgroundColor: Colors.border }]} />
          <View style={styles.sumCell}>
            <Text style={[styles.sumLabel, { color: Colors.textMuted }]}>Expense</Text>
            <Text style={[styles.sumVal, { color: Colors.danger }]}>−{formatCurrency(totalOut)}</Text>
          </View>
          <View style={[styles.sumDivider, { backgroundColor: Colors.border }]} />
          <View style={styles.sumCell}>
            <Text style={[styles.sumLabel, { color: Colors.textMuted }]}>Net</Text>
            <Text style={[styles.sumVal, { color: balance >= 0 ? Colors.accent : Colors.danger }]}>
              {balance >= 0 ? '+' : '−'}{formatCurrency(Math.abs(balance))}
            </Text>
          </View>
        </View>
      )}

      {/* List */}
      {loading ? (
        <LoadingOverlay message="Loading…" />
      ) : (
        <FlatList
          data={filtered}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          contentContainerStyle={[
            styles.list,
            filtered.length === 0 && styles.listEmpty,
            { backgroundColor: filtered.length > 0 ? Colors.bgCard : 'transparent',
              borderColor: Colors.border },
          ]}
          ListEmptyComponent={
            <EmptyState emoji="📭"
              title="No transactions"
              subtitle="Try changing the filters above" />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { paddingHorizontal: Spacing.base, paddingTop: Spacing.lg, paddingBottom: Spacing.sm, borderBottomWidth: 1 },
  title: { fontSize: Typography['2xl'], fontWeight: '900' },

  filterScroll: { maxHeight: 44, marginTop: Spacing.sm },
  filterRow: { paddingHorizontal: Spacing.base, gap: Spacing.sm, alignItems: 'center' },
  filterChip: { paddingVertical: Spacing.xs, paddingHorizontal: Spacing.md, borderRadius: Radius.full, borderWidth: 1 },
  filterText: { fontSize: Typography.sm, fontWeight: '600' },

  summaryStrip: { flexDirection: 'row', marginHorizontal: Spacing.base, marginTop: Spacing.sm, borderRadius: Radius.md, borderWidth: 1, overflow: 'hidden' },
  sumCell: { flex: 1, alignItems: 'center', paddingVertical: Spacing.sm },
  sumDivider: { width: 1, marginVertical: Spacing.xs },
  sumLabel: { fontSize: Typography.xs, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.6 },
  sumVal: { fontSize: Typography.base, fontWeight: '800', marginTop: 1 },

  list: { marginHorizontal: Spacing.base, marginTop: Spacing.sm, borderRadius: Radius.lg, borderWidth: 1, overflow: 'hidden', marginBottom: Spacing['2xl'] },
  listEmpty: { backgroundColor: 'transparent', borderWidth: 0 },
});

export default HistoryScreen;
