// screens/AccountsScreen.js
// ─────────────────────────────────────────────────────────
// Full accounts management screen.
// • See all accounts with live balances
// • Add / edit / delete accounts
// • Tap account to see its transaction history
// • Transfer between accounts
// ─────────────────────────────────────────────────────────

import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Modal, TextInput, Alert, FlatList, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '../context/ThemeContext';
import { Typography, Spacing, Radius } from '../utils/theme';
import {
  createAccount, updateAccount, deleteAccount,
  transferBetweenAccounts, setBalance,
} from '../services/accountService';
import useAuth from '../hooks/useAuth';
import useAccounts from '../hooks/useAccounts';
import useAccountTransactions from '../hooks/useAccountTransactions';
import AccountCard from '../components/AccountCard';
import BalanceSummaryBar from '../components/BalanceSummaryBar';
import TransactionItem from '../components/TransactionItem';
import { Button, Card, LoadingOverlay, EmptyState, ErrorText, Divider } from '../components/UI';
import { formatCurrency } from '../utils/formatters';

// ── Emoji palette for new accounts ────────────────────────
const EMOJI_OPTIONS = [
  '💵','🏦','💳','👛','📈','💰','🏧','💎','🪙','🏠',
  '🚗','✈️','📱','💻','🎓','🏥','🛒','⚡','🌍','💼',
];

const COLOR_OPTIONS = [
  '#00C6A2','#58A6FF','#F85149','#D29922','#2EA043',
  '#D2A8FF','#FF9800','#E91E63','#00BCD4','#8BC34A',
];

// ── Sub-screen: account detail ────────────────────────────

const AccountDetail = ({ account, onBack, userId }) => {
  const { Colors } = useTheme();
  const { transactions, totalIn, totalOut, loading } = useAccountTransactions(userId, account.id);

  const [showAdjust, setShowAdjust] = useState(false);
  const [adjustVal,  setAdjustVal]  = useState(String(account.balance || 0));
  const [saving,     setSaving]     = useState(false);

  const handleSetBalance = async () => {
    const val = parseFloat(adjustVal);
    if (isNaN(val)) { Alert.alert('Error', 'Enter a valid number'); return; }
    setSaving(true);
    try {
      await setBalance(account.id, val);
      setShowAdjust(false);
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      {/* Header */}
      <View style={[styles.detailHeader, { borderBottomColor: Colors.border }]}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Text style={{ color: Colors.accent, fontSize: Typography.base, fontWeight: '700' }}>← Back</Text>
        </TouchableOpacity>
        <Text style={[styles.detailTitle, { color: Colors.textPrimary }]}>{account.name}</Text>
        <TouchableOpacity onPress={() => setShowAdjust(true)}>
          <Text style={{ color: Colors.textSecondary, fontSize: Typography.sm }}>Adjust</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: Spacing.base }}>
        {/* Balance hero */}
        <View style={[styles.balanceHero, { backgroundColor: account.color + '18', borderColor: account.color + '44' }]}>
          <Text style={{ fontSize: 40 }}>{account.emoji}</Text>
          <Text style={[styles.heroLabel, { color: Colors.textSecondary }]}>Current Balance</Text>
          <Text style={[styles.heroBalance, {
            color: account.balance < 0 ? Colors.danger : account.color || Colors.accent,
          }]}>
            {formatCurrency(account.balance || 0)}
          </Text>
          <View style={styles.heroStats}>
            <View style={styles.heroStat}>
              <Text style={[styles.heroStatLabel, { color: Colors.textMuted }]}>In</Text>
              <Text style={[styles.heroStatVal, { color: Colors.safe }]}>+{formatCurrency(totalIn)}</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: Colors.border }]} />
            <View style={styles.heroStat}>
              <Text style={[styles.heroStatLabel, { color: Colors.textMuted }]}>Out</Text>
              <Text style={[styles.heroStatVal, { color: Colors.danger }]}>−{formatCurrency(totalOut)}</Text>
            </View>
          </View>
        </View>

        {/* Transactions */}
        <Text style={[styles.sectionTitle, { color: Colors.textSecondary }]}>All Transactions</Text>

        {loading ? (
          <Text style={{ color: Colors.textMuted, textAlign: 'center', marginTop: Spacing.xl }}>Loading…</Text>
        ) : transactions.length === 0 ? (
          <EmptyState emoji="🪙" title="No transactions" subtitle="Add one using the + tab" />
        ) : (
          <Card style={{ padding: 0, overflow: 'hidden' }}>
            {transactions.map((txn) => (
              <TransactionItem key={txn.id} transaction={txn} showAccount={false} />
            ))}
          </Card>
        )}
      </ScrollView>

      {/* Adjust balance modal */}
      <Modal visible={showAdjust} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: Colors.bgCard, borderColor: Colors.border }]}>
            <Text style={[styles.modalTitle, { color: Colors.textPrimary }]}>Adjust Balance</Text>
            <Text style={[styles.modalSub, { color: Colors.textSecondary }]}>
              Set the exact balance for {account.name}
            </Text>
            <View style={[styles.adjRow, { borderColor: Colors.accent, backgroundColor: Colors.bgInput }]}>
              <Text style={[styles.adjRupee, { color: Colors.accent }]}>₹</Text>
              <TextInput
                style={[styles.adjInput, { color: Colors.textPrimary }]}
                value={adjustVal}
                onChangeText={setAdjustVal}
                keyboardType="numeric"
                autoFocus
              />
            </View>
            <View style={styles.modalBtns}>
              <Button title="Cancel" variant="ghost" onPress={() => setShowAdjust(false)} style={{ flex: 1 }} />
              <Button title="Save" onPress={handleSetBalance} loading={saving} style={{ flex: 1 }} />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

// ── Add / Edit Account Modal ──────────────────────────────

const AccountFormModal = ({ visible, account, userId, onClose }) => {
  const { Colors } = useTheme();
  const isEdit = !!account;

  const [name,           setName]           = useState(account?.name    || '');
  const [emoji,          setEmoji]          = useState(account?.emoji   || '💰');
  const [color,          setColor]          = useState(account?.color   || COLOR_OPTIONS[0]);
  const [initialBalance, setInitialBalance] = useState(
    isEdit ? String(account.balance ?? 0) : '0'
  );
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  const handleSave = async () => {
    if (!name.trim()) { setError('Account name is required'); return; }
    setError('');
    setLoading(true);
    try {
      if (isEdit) {
        await updateAccount(account.id, { name, emoji, color });
      } else {
        await createAccount(userId, { name, emoji, color, initialBalance: parseFloat(initialBalance) || 0 });
      }
      onClose();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalBox, { backgroundColor: Colors.bgCard, borderColor: Colors.border }]}>
          <Text style={[styles.modalTitle, { color: Colors.textPrimary }]}>
            {isEdit ? 'Edit Account' : 'New Account'}
          </Text>

          {/* Emoji picker */}
          <Text style={[styles.formLabel, { color: Colors.textSecondary }]}>Icon</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: Spacing.md }}>
            {EMOJI_OPTIONS.map((e) => (
              <TouchableOpacity
                key={e}
                onPress={() => setEmoji(e)}
                style={[styles.emojiBtn,
                  { borderColor: emoji === e ? Colors.accent : Colors.border,
                    backgroundColor: emoji === e ? Colors.accentDim : Colors.bgCardHover }
                ]}
              >
                <Text style={{ fontSize: 22 }}>{e}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Color picker */}
          <Text style={[styles.formLabel, { color: Colors.textSecondary }]}>Color</Text>
          <View style={styles.colorRow}>
            {COLOR_OPTIONS.map((c) => (
              <TouchableOpacity
                key={c}
                onPress={() => setColor(c)}
                style={[styles.colorDot,
                  { backgroundColor: c, borderWidth: color === c ? 3 : 0, borderColor: Colors.white }
                ]}
              />
            ))}
          </View>

          {/* Name */}
          <Text style={[styles.formLabel, { color: Colors.textSecondary }]}>Account Name</Text>
          <TextInput
            style={[styles.formInput, { backgroundColor: Colors.bgInput, borderColor: Colors.border, color: Colors.textPrimary }]}
            value={name}
            onChangeText={(v) => { setName(v); setError(''); }}
            placeholder="e.g. HDFC Savings"
            placeholderTextColor={Colors.textMuted}
            autoCapitalize="words"
          />

          {/* Initial balance — only for new accounts */}
          {!isEdit && (
            <>
              <Text style={[styles.formLabel, { color: Colors.textSecondary }]}>Opening Balance</Text>
              <View style={[styles.balanceInput, { borderColor: Colors.border, backgroundColor: Colors.bgInput }]}>
                <Text style={[styles.rupeeSmall, { color: Colors.accent }]}>₹</Text>
                <TextInput
                  style={[{ flex: 1, color: Colors.textPrimary, fontSize: Typography.lg, fontWeight: '700', paddingVertical: Spacing.sm }]}
                  value={initialBalance}
                  onChangeText={setInitialBalance}
                  keyboardType="numeric"
                  placeholderTextColor={Colors.textMuted}
                />
              </View>
            </>
          )}

          {/* Preview */}
          <View style={[styles.preview, { backgroundColor: color + '18', borderColor: color + '44' }]}>
            <Text style={{ fontSize: 28 }}>{emoji}</Text>
            <Text style={[styles.previewName, { color: Colors.textPrimary }]}>{name || 'Account Name'}</Text>
            {!isEdit && (
              <Text style={[styles.previewBal, { color: Colors.textSecondary }]}>
                {formatCurrency(parseFloat(initialBalance) || 0)}
              </Text>
            )}
          </View>

          <ErrorText message={error} />

          <View style={styles.modalBtns}>
            <Button title="Cancel" variant="ghost" onPress={onClose} style={{ flex: 1 }} />
            <Button title={isEdit ? 'Update' : 'Create'} onPress={handleSave} loading={loading} style={{ flex: 1 }} />
          </View>
        </View>
      </View>
    </Modal>
  );
};

// ── Transfer Modal ────────────────────────────────────────

const TransferModal = ({ visible, accounts, onClose }) => {
  const { Colors } = useTheme();
  const [fromId,   setFromId]   = useState('');
  const [toId,     setToId]     = useState('');
  const [amount,   setAmount]   = useState('');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');

  const handleTransfer = async () => {
    if (!fromId || !toId)         { setError('Select both accounts'); return; }
    if (fromId === toId)           { setError('Cannot transfer to same account'); return; }
    const n = parseFloat(amount);
    if (!n || n <= 0)              { setError('Enter a valid amount'); return; }
    setError('');
    setLoading(true);
    try {
      await transferBetweenAccounts(fromId, toId, n);
      setAmount(''); setFromId(''); setToId('');
      onClose();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const fromAcc = accounts.find((a) => a.id === fromId);
  const toAcc   = accounts.find((a) => a.id === toId);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalBox, { backgroundColor: Colors.bgCard, borderColor: Colors.border }]}>
          <Text style={[styles.modalTitle, { color: Colors.textPrimary }]}>Transfer Funds</Text>

          <Text style={[styles.formLabel, { color: Colors.textSecondary }]}>From Account</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: Spacing.md }}>
            {accounts.map((acc) => (
              <TouchableOpacity
                key={acc.id}
                onPress={() => setFromId(acc.id)}
                style={[styles.accPill,
                  { backgroundColor: fromId === acc.id ? acc.color + '22' : Colors.bgCardHover,
                    borderColor: fromId === acc.id ? acc.color : Colors.border }
                ]}
              >
                <Text>{acc.emoji} </Text>
                <Text style={{ color: fromId === acc.id ? acc.color : Colors.textPrimary, fontWeight: '600', fontSize: Typography.sm }}>
                  {acc.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={[styles.formLabel, { color: Colors.textSecondary }]}>To Account</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: Spacing.md }}>
            {accounts.filter((a) => a.id !== fromId).map((acc) => (
              <TouchableOpacity
                key={acc.id}
                onPress={() => setToId(acc.id)}
                style={[styles.accPill,
                  { backgroundColor: toId === acc.id ? acc.color + '22' : Colors.bgCardHover,
                    borderColor: toId === acc.id ? acc.color : Colors.border }
                ]}
              >
                <Text>{acc.emoji} </Text>
                <Text style={{ color: toId === acc.id ? acc.color : Colors.textPrimary, fontWeight: '600', fontSize: Typography.sm }}>
                  {acc.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {fromAcc && toAcc && (
            <Text style={[styles.transferArrow, { color: Colors.textSecondary }]}>
              {fromAcc.emoji} {fromAcc.name}  →  {toAcc.emoji} {toAcc.name}
            </Text>
          )}

          <View style={[styles.adjRow, { borderColor: Colors.accent, backgroundColor: Colors.bgInput }]}>
            <Text style={[styles.adjRupee, { color: Colors.accent }]}>₹</Text>
            <TextInput
              style={[styles.adjInput, { color: Colors.textPrimary }]}
              value={amount}
              onChangeText={setAmount}
              keyboardType="numeric"
              placeholder="Amount"
              placeholderTextColor={Colors.textMuted}
            />
          </View>

          <ErrorText message={error} />

          <View style={styles.modalBtns}>
            <Button title="Cancel" variant="ghost" onPress={onClose} style={{ flex: 1 }} />
            <Button title="Transfer" onPress={handleTransfer} loading={loading} style={{ flex: 1 }} />
          </View>
        </View>
      </View>
    </Modal>
  );
};

// ── Main AccountsScreen ───────────────────────────────────

const AccountsScreen = () => {
  const { Colors } = useTheme();
  const { user }   = useAuth();
  const { accounts, totalBalance, loading } = useAccounts(user?.uid);

  const [selectedAccount, setSelectedAccount] = useState(null); // detail view
  const [showForm,        setShowForm]        = useState(false);
  const [editingAccount,  setEditingAccount]  = useState(null);
  const [showTransfer,    setShowTransfer]    = useState(false);

  const totalIncome  = accounts.reduce((s, a) => s + Math.max(0, a.balance || 0), 0);
  const totalNeg     = accounts.reduce((s, a) => s + Math.min(0, a.balance || 0), 0);

  const handleLongPress = useCallback((account) => {
    if (account.isDefault) {
      // Default accounts can only be edited, not deleted
      Alert.alert(account.name, 'What would you like to do?', [
        { text: 'Cancel', style: 'cancel' },
        { text: '✏️ Edit', onPress: () => { setEditingAccount(account); setShowForm(true); } },
      ]);
      return;
    }
    Alert.alert(account.name, 'What would you like to do?', [
      { text: 'Cancel', style: 'cancel' },
      { text: '✏️ Edit',   onPress: () => { setEditingAccount(account); setShowForm(true); } },
      {
        text: '🗑️ Delete',
        style: 'destructive',
        onPress: () => {
          Alert.alert('Delete Account', `Delete "${account.name}"? This cannot be undone.`, [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete', style: 'destructive', onPress: () => deleteAccount(account.id) },
          ]);
        },
      },
    ]);
  }, []);

  if (loading) return <LoadingOverlay message="Loading accounts…" />;

  // ── Detail sub-view ──────────────────────────────────
  if (selectedAccount) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: Colors.bg }]} edges={['top']}>
        <AccountDetail
          account={selectedAccount}
          userId={user?.uid}
          onBack={() => setSelectedAccount(null)}
        />
      </SafeAreaView>
    );
  }

  // ── Main list view ───────────────────────────────────
  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: Colors.bg }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

        {/* ── Header ── */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.title, { color: Colors.textPrimary }]}>Accounts</Text>
            <Text style={[styles.subtitle, { color: Colors.textSecondary }]}>
              {accounts.length} account{accounts.length !== 1 ? 's' : ''}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.headerBtn, { backgroundColor: Colors.accentDim, borderColor: Colors.accent }]}
            onPress={() => { setEditingAccount(null); setShowForm(true); }}
          >
            <Text style={[styles.headerBtnText, { color: Colors.accent }]}>+ New</Text>
          </TouchableOpacity>
        </View>

        {/* ── Net Worth summary bar ── */}
        <Card style={styles.netWorthCard}>
          <Text style={[styles.netLabel, { color: Colors.textSecondary }]}>Total Net Worth</Text>
          <Text style={[styles.netValue, {
            color: totalBalance >= 0 ? Colors.accent : Colors.danger,
          }]}>
            {totalBalance >= 0 ? '' : '−'}{formatCurrency(Math.abs(totalBalance))}
          </Text>
          <View style={styles.netRow}>
            <View style={styles.netStat}>
              <View style={[styles.dot, { backgroundColor: Colors.safe }]} />
              <Text style={[styles.netStatText, { color: Colors.textSecondary }]}>
                Positive  {formatCurrency(totalIncome)}
              </Text>
            </View>
            <View style={styles.netStat}>
              <View style={[styles.dot, { backgroundColor: Colors.danger }]} />
              <Text style={[styles.netStatText, { color: Colors.textSecondary }]}>
                Negative  {formatCurrency(Math.abs(totalNeg))}
              </Text>
            </View>
          </View>
        </Card>

        {/* ── Action buttons ── */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: Colors.bgCard, borderColor: Colors.border }]}
            onPress={() => setShowTransfer(true)}
          >
            <Text style={{ fontSize: 18 }}>🔄</Text>
            <Text style={[styles.actionBtnText, { color: Colors.textPrimary }]}>Transfer</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: Colors.bgCard, borderColor: Colors.border }]}
            onPress={() => { setEditingAccount(null); setShowForm(true); }}
          >
            <Text style={{ fontSize: 18 }}>➕</Text>
            <Text style={[styles.actionBtnText, { color: Colors.textPrimary }]}>Add Account</Text>
          </TouchableOpacity>
        </View>

        {/* ── Account cards scroll ── */}
        {accounts.length === 0 ? (
          <EmptyState
            emoji="🏦"
            title="No accounts yet"
            subtitle="Tap '+ New' to create your first account"
          />
        ) : (
          <>
            <Text style={[styles.sectionLabel, { color: Colors.textSecondary }]}>All Accounts</Text>
            {/* 2-column grid */}
            <View style={styles.grid}>
              {accounts.map((acc) => (
                <View key={acc.id} style={styles.gridItem}>
                  <AccountCard
                    account={acc}
                    onPress={() => setSelectedAccount(acc)}
                    onLongPress={() => handleLongPress(acc)}
                  />
                </View>
              ))}
            </View>
          </>
        )}

        {/* ── Tips ── */}
        <Card style={[styles.tip, { borderColor: Colors.accentDim }]}>
          <Text style={[styles.tipTitle, { color: Colors.textPrimary }]}>💡 How balances work</Text>
          <Text style={[styles.tipBody, { color: Colors.textSecondary }]}>
            When you add an <Text style={{ color: Colors.safe, fontWeight: '700' }}>income</Text> transaction,
            the linked account balance increases.{'\n'}
            When you add an <Text style={{ color: Colors.danger, fontWeight: '700' }}>expense</Text>,
            it decreases automatically.{'\n'}
            Deleting a transaction reverses the effect.{'\n'}
            Long-press any account to edit or delete it.
          </Text>
        </Card>
      </ScrollView>

      {/* ── Modals ── */}
      <AccountFormModal
        visible={showForm}
        account={editingAccount}
        userId={user?.uid}
        onClose={() => { setShowForm(false); setEditingAccount(null); }}
      />
      <TransferModal
        visible={showTransfer}
        accounts={accounts}
        onClose={() => setShowTransfer(false)}
      />
    </SafeAreaView>
  );
};

// ── Styles ────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { paddingHorizontal: Spacing.base, paddingBottom: Spacing['3xl'] },

  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingTop: Spacing.lg, paddingBottom: Spacing.base,
  },
  title:    { fontSize: Typography['2xl'], fontWeight: '900' },
  subtitle: { fontSize: Typography.sm, marginTop: 2 },
  headerBtn: {
    borderWidth: 1, borderRadius: Radius.full,
    paddingHorizontal: Spacing.base, paddingVertical: Spacing.sm,
  },
  headerBtnText: { fontSize: Typography.sm, fontWeight: '700' },

  // Net worth card
  netWorthCard: { padding: Spacing.xl, marginBottom: Spacing.md, alignItems: 'center' },
  netLabel: { fontSize: Typography.sm, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 },
  netValue: { fontSize: Typography['4xl'], fontWeight: '900', marginBottom: Spacing.md },
  netRow: { flexDirection: 'row', gap: Spacing.xl },
  netStat: { flexDirection: 'row', alignItems: 'center' },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: Spacing.xs },
  netStatText: { fontSize: Typography.sm },

  // Action row
  actionRow: { flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.base },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderRadius: Radius.md, paddingVertical: Spacing.md, gap: Spacing.sm,
  },
  actionBtnText: { fontSize: Typography.sm, fontWeight: '700' },

  sectionLabel: {
    fontSize: Typography.xs, fontWeight: '700', textTransform: 'uppercase',
    letterSpacing: 1, marginBottom: Spacing.sm,
  },

  // 2-col grid
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md, marginBottom: Spacing.lg },
  gridItem: { width: '47.5%' },

  tip: { marginTop: Spacing.md },
  tipTitle: { fontSize: Typography.base, fontWeight: '700', marginBottom: Spacing.sm },
  tipBody: { fontSize: Typography.sm, lineHeight: 22 },

  // Detail
  detailHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.base, paddingVertical: Spacing.md, borderBottomWidth: 1,
  },
  backBtn: { padding: Spacing.xs },
  detailTitle: { fontSize: Typography.md, fontWeight: '800' },
  balanceHero: {
    alignItems: 'center', borderRadius: Radius.xl, borderWidth: 1,
    padding: Spacing.xl, marginBottom: Spacing.lg,
  },
  heroLabel:   { fontSize: Typography.sm, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.8, marginTop: Spacing.md },
  heroBalance: { fontSize: Typography['4xl'], fontWeight: '900', marginTop: 2, marginBottom: Spacing.md },
  heroStats:   { flexDirection: 'row', alignItems: 'center' },
  heroStat:    { alignItems: 'center', paddingHorizontal: Spacing.xl },
  heroStatLabel: { fontSize: Typography.xs, textTransform: 'uppercase', letterSpacing: 0.8 },
  heroStatVal:   { fontSize: Typography.lg, fontWeight: '800', marginTop: 2 },
  statDivider: { width: 1, height: 36 },
  sectionTitle: {
    fontSize: Typography.xs, fontWeight: '700', textTransform: 'uppercase',
    letterSpacing: 1, marginBottom: Spacing.sm,
  },

  // Modal
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalBox: {
    borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl,
    borderWidth: 1, borderBottomWidth: 0, padding: Spacing.xl,
    paddingBottom: Spacing['3xl'],
  },
  modalTitle: { fontSize: Typography.xl, fontWeight: '900', marginBottom: 4 },
  modalSub:   { fontSize: Typography.sm, marginBottom: Spacing.lg },
  modalBtns:  { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.lg },

  formLabel: {
    fontSize: Typography.xs, fontWeight: '700', textTransform: 'uppercase',
    letterSpacing: 0.8, marginBottom: Spacing.sm,
  },
  formInput: {
    borderWidth: 1, borderRadius: Radius.md, paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md, fontSize: Typography.base, marginBottom: Spacing.md,
  },
  emojiBtn: {
    width: 46, height: 46, borderRadius: Radius.md, borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center', marginRight: Spacing.sm,
  },
  colorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.md },
  colorDot: { width: 32, height: 32, borderRadius: 16 },
  balanceInput: {
    flexDirection: 'row', alignItems: 'center', borderWidth: 1,
    borderRadius: Radius.md, paddingHorizontal: Spacing.base, marginBottom: Spacing.md,
  },
  rupeeSmall: { fontSize: Typography.xl, fontWeight: '800', marginRight: Spacing.sm },
  preview: {
    flexDirection: 'row', alignItems: 'center', borderRadius: Radius.md,
    borderWidth: 1, padding: Spacing.md, gap: Spacing.md, marginBottom: Spacing.sm,
  },
  previewName: { flex: 1, fontSize: Typography.base, fontWeight: '700' },
  previewBal:  { fontSize: Typography.sm },

  // Adjust balance
  adjRow: {
    flexDirection: 'row', alignItems: 'center', borderWidth: 2,
    borderRadius: Radius.lg, paddingHorizontal: Spacing.base, marginBottom: Spacing.md,
  },
  adjRupee: { fontSize: Typography.xl, fontWeight: '800', marginRight: Spacing.sm },
  adjInput: {
    flex: 1, fontSize: Typography['2xl'], fontWeight: '700',
    paddingVertical: Spacing.md,
  },

  // Transfer
  accPill: {
    flexDirection: 'row', alignItems: 'center', borderWidth: 1.5,
    borderRadius: Radius.full, paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md, marginRight: Spacing.sm,
  },
  transferArrow: {
    textAlign: 'center', fontSize: Typography.base, marginBottom: Spacing.md,
  },
});

export default AccountsScreen;
