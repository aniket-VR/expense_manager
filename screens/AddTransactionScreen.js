// screens/AddTransactionScreen.js
// ─────────────────────────────────────────────────────────
// Full Income + Expense entry screen.
//
// Features:
//   • Income / Expense toggle with distinct colours
//   • Amount input with live formatted preview
//   • Built-in category grid (expense + income)
//   • Custom category creation (stored in AsyncStorage)
//   • Account picker (real Firestore balances)
//   • Optional note
//   • Success animation before navigating home
// ─────────────────────────────────────────────────────────

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, StyleSheet, TouchableOpacity,
  ScrollView, KeyboardAvoidingView, Platform, Keyboard,
  Animated, Modal, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation }  from '@react-navigation/native';
import AsyncStorage        from '@react-native-async-storage/async-storage';

import { useTheme }       from '../context/ThemeContext';
import { Typography, Spacing, Radius } from '../utils/theme';
import { addTransaction } from '../services/transactionService';
import { addExpense }     from '../services/expenseService';
import { Button, ErrorText } from '../components/UI';
import AccountPicker      from '../components/AccountPicker';
import { formatCurrency } from '../utils/formatters';
import {
  TXN_TYPE, EXPENSE_CATEGORIES, INCOME_CATEGORIES, getCategoryMeta,
} from '../utils/constants';
import useAuth     from '../hooks/useAuth';
import useAccounts from '../hooks/useAccounts';

// ── Custom category storage keys ─────────────────────────
const CUSTOM_EXPENSE_KEY = 'custom_expense_categories';
const CUSTOM_INCOME_KEY  = 'custom_income_categories';

// ── Emoji palette for custom categories ──────────────────
const EMOJI_PALETTE = [
  '🎯','🎮','🎵','🎨','🏖️','🏔️','🚀','💡','🔧','📱',
  '🍕','☕','🚌','🎓','💈','🏡','🌿','⚡','🎁','💎',
];

// ── Custom Category Modal ─────────────────────────────────
const CustomCategoryModal = ({ visible, onClose, onSave, existingNames = [] }) => {
  const { Colors } = useTheme();
  const [name,  setName]  = useState('');
  const [emoji, setEmoji] = useState('🎯');
  const [error, setError] = useState('');

  const reset = () => { setName(''); setEmoji('🎯'); setError(''); };

  const handleSave = () => {
    const trimmed = name.trim();
    if (!trimmed)                          { setError('Enter a category name'); return; }
    if (trimmed.length > 20)               { setError('Max 20 characters'); return; }
    if (existingNames.includes(trimmed.toLowerCase())) {
      setError('Category already exists'); return;
    }
    onSave({ id: trimmed.toLowerCase().replace(/\s+/g, '_'), name: trimmed, emoji, color: '#8B949E' });
    reset();
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={[ccStyles.overlay]}>
        <View style={[ccStyles.box, { backgroundColor: Colors.bgCard, borderColor: Colors.border }]}>
          <Text style={[ccStyles.title, { color: Colors.textPrimary }]}>New Category</Text>

          {/* Emoji picker */}
          <Text style={[ccStyles.label, { color: Colors.textSecondary }]}>Icon</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={ccStyles.emojiScroll}>
            {EMOJI_PALETTE.map((e) => (
              <TouchableOpacity
                key={e}
                onPress={() => setEmoji(e)}
                style={[ccStyles.emojiBtn,
                  { borderColor: emoji === e ? Colors.accent : Colors.border,
                    backgroundColor: emoji === e ? Colors.accentDim : Colors.bgCardHover }]}
              >
                <Text style={{ fontSize: 22 }}>{e}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Name input */}
          <Text style={[ccStyles.label, { color: Colors.textSecondary }]}>Name</Text>
          <TextInput
            style={[ccStyles.input, { backgroundColor: Colors.bgInput, borderColor: Colors.border, color: Colors.textPrimary }]}
            value={name}
            onChangeText={(v) => { setName(v); setError(''); }}
            placeholder="e.g. Pet Care"
            placeholderTextColor={Colors.textMuted}
            autoCapitalize="words"
            maxLength={20}
            autoFocus
          />

          {/* Preview */}
          <View style={[ccStyles.preview, { backgroundColor: Colors.bgCardHover, borderColor: Colors.border }]}>
            <Text style={{ fontSize: 26 }}>{emoji}</Text>
            <Text style={[ccStyles.previewName, { color: Colors.textPrimary }]}>
              {name || 'Category name'}
            </Text>
          </View>

          {error ? <Text style={[ccStyles.error, { color: Colors.danger }]}>{error}</Text> : null}

          <View style={ccStyles.btnRow}>
            <TouchableOpacity style={[ccStyles.btn, { borderColor: Colors.border }]}
              onPress={() => { reset(); onClose(); }}>
              <Text style={[ccStyles.btnText, { color: Colors.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[ccStyles.btn, ccStyles.btnPrimary, { backgroundColor: Colors.accent }]}
              onPress={handleSave}>
              <Text style={[ccStyles.btnText, { color: Colors.black, fontWeight: '700' }]}>Add</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const ccStyles = StyleSheet.create({
  overlay:   { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' },
  box:       { borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl, borderWidth: 1, borderBottomWidth: 0, padding: Spacing.xl, paddingBottom: 48 },
  title:     { fontSize: Typography.xl, fontWeight: '900', marginBottom: Spacing.lg },
  label:     { fontSize: Typography.xs, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: Spacing.sm },
  emojiScroll: { marginBottom: Spacing.md },
  emojiBtn:  { width: 46, height: 46, borderRadius: Radius.md, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', marginRight: Spacing.sm },
  input:     { borderWidth: 1, borderRadius: Radius.md, paddingHorizontal: Spacing.base, paddingVertical: Spacing.md, fontSize: Typography.base, marginBottom: Spacing.md },
  preview:   { flexDirection: 'row', alignItems: 'center', borderRadius: Radius.md, borderWidth: 1, padding: Spacing.md, marginBottom: Spacing.sm },
  previewName: { fontSize: Typography.base, fontWeight: '700', marginLeft: Spacing.md },
  error:     { fontSize: Typography.sm, marginBottom: Spacing.sm },
  btnRow:    { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.md },
  btn:       { flex: 1, paddingVertical: Spacing.md, borderRadius: Radius.md, borderWidth: 1, alignItems: 'center' },
  btnPrimary: { borderWidth: 0 },
  btnText:   { fontSize: Typography.base },
});

// ── Main screen ───────────────────────────────────────────

const AddTransactionScreen = () => {
  const { Colors }   = useTheme();
  const navigation   = useNavigation();
  const { user, profile } = useAuth();
  const { accounts } = useAccounts(user?.uid);

  // ── Form state ─────────────────────────────────────────
  const [txnType,     setTxnType]     = useState(TXN_TYPE.EXPENSE);
  const [amount,      setAmount]      = useState('');
  const [category,    setCategory]    = useState('');
  const [selectedAcc, setSelectedAcc] = useState(null);
  const [note,        setNote]        = useState('');
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState('');
  const [success,     setSuccess]     = useState(false);

  // ── Custom categories ──────────────────────────────────
  const [customExpense, setCustomExpense] = useState([]);
  const [customIncome,  setCustomIncome]  = useState([]);
  const [showCustomModal, setShowCustomModal] = useState(false);

  // ── Animation ──────────────────────────────────────────
  const successScale  = useRef(new Animated.Value(0)).current;
  const amountShake   = useRef(new Animated.Value(0)).current;
  const amountRef     = useRef(null);

  // Derived
  const isExpense   = txnType === TXN_TYPE.EXPENSE;
  const accentColor = isExpense ? Colors.danger : Colors.safe;
  const baseCategories = isExpense ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;
  const customCats     = isExpense ? customExpense : customIncome;
  const allCategories  = [...baseCategories, ...customCats];
  const selectedCatMeta = allCategories.find((c) => c.id === category);

  // ── Load custom categories from AsyncStorage ───────────
  useEffect(() => {
    (async () => {
      try {
        const [exp, inc] = await Promise.all([
          AsyncStorage.getItem(CUSTOM_EXPENSE_KEY),
          AsyncStorage.getItem(CUSTOM_INCOME_KEY),
        ]);
        if (exp) setCustomExpense(JSON.parse(exp));
        if (inc) setCustomIncome(JSON.parse(inc));
      } catch (_) {}
    })();
  }, []);

  // Auto-select first account
  useEffect(() => {
    if (accounts.length > 0 && !selectedAcc) setSelectedAcc(accounts[0]);
  }, [accounts]);

  // Focus amount on mount
  useEffect(() => {
    const t = setTimeout(() => amountRef.current?.focus(), 300);
    return () => clearTimeout(t);
  }, []);

  // Reset category when type changes
  useEffect(() => { setCategory(''); }, [txnType]);

  // ── Save custom category ───────────────────────────────
  const handleSaveCustom = useCallback(async (cat) => {
    try {
      if (isExpense) {
        const updated = [...customExpense, cat];
        setCustomExpense(updated);
        await AsyncStorage.setItem(CUSTOM_EXPENSE_KEY, JSON.stringify(updated));
      } else {
        const updated = [...customIncome, cat];
        setCustomIncome(updated);
        await AsyncStorage.setItem(CUSTOM_INCOME_KEY, JSON.stringify(updated));
      }
      setCategory(cat.id); // auto-select the new category
    } catch (_) {}
  }, [isExpense, customExpense, customIncome]);

  // ── Shake animation for validation error ───────────────
  const shakeAmount = () => {
    Animated.sequence([
      Animated.timing(amountShake, { toValue: 8,  duration: 60,  useNativeDriver: true }),
      Animated.timing(amountShake, { toValue: -8, duration: 60,  useNativeDriver: true }),
      Animated.timing(amountShake, { toValue: 4,  duration: 60,  useNativeDriver: true }),
      Animated.timing(amountShake, { toValue: 0,  duration: 60,  useNativeDriver: true }),
    ]).start();
  };

  // ── Validate ───────────────────────────────────────────
  const validate = () => {
    const n = parseFloat(amount);
    if (!amount || isNaN(n) || n <= 0) return 'Enter a valid amount';
    if (!category)                      return 'Pick a category';
    if (!selectedAcc)                   return 'Select an account';
    return null;
  };

  // ── Submit ─────────────────────────────────────────────
  const handleAdd = async () => {
    Keyboard.dismiss();
    const err = validate();
    if (err) {
      setError(err);
      shakeAmount();
      return;
    }
    setError('');
    setLoading(true);

    try {
      const finalAmount = parseFloat(amount);

      await addTransaction({
        userId:      user.uid,
        amount:      finalAmount,
        type:        txnType,
        category,
        accountId:   selectedAcc.id,
        accountName: selectedAcc.name,
        note:        note.trim(),
        familyId:    profile?.familyId || null,   // propagate family context
      });

      // Keep legacy /expenses in sync for backward compat
      if (isExpense) {
        await addExpense(user.uid, finalAmount, category, note.trim());
      }

      // Success animation
      setSuccess(true);
      Animated.spring(successScale, {
        toValue: 1, useNativeDriver: true, tension: 60, friction: 6,
      }).start();

      setTimeout(() => {
        setAmount(''); setCategory(''); setNote('');
        setSuccess(false); successScale.setValue(0); setLoading(false);
        navigation.navigate('Home');
      }, 1200);
    } catch (e) {
      console.error(e);
      setError('Save failed. Check your connection.');
      setLoading(false);
    }
  };

  // ── Formatted preview ──────────────────────────────────
  const parsedAmount = parseFloat(amount);
  const hasValidAmount = !isNaN(parsedAmount) && parsedAmount > 0;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.bg }} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          contentContainerStyle={[S.container]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Screen title ── */}
          <Text style={[S.screenTitle, { color: Colors.textPrimary }]}>Add Transaction</Text>

          {/* ── Income / Expense toggle ── */}
          <View style={[S.typeToggle, { backgroundColor: Colors.bgCard, borderColor: Colors.border }]}>
            {[TXN_TYPE.EXPENSE, TXN_TYPE.INCOME].map((t) => {
              const active = t === txnType;
              const bg     = t === TXN_TYPE.EXPENSE ? Colors.danger : Colors.safe;
              return (
                <TouchableOpacity
                  key={t}
                  activeOpacity={0.8}
                  onPress={() => { setTxnType(t); setError(''); }}
                  style={[S.typeBtn, active && { backgroundColor: bg }]}
                >
                  <Text style={S.typeBtnIcon}>{t === TXN_TYPE.EXPENSE ? '📤' : '📥'}</Text>
                  <Text style={[S.typeBtnLabel, { color: active ? Colors.white : Colors.textSecondary }]}>
                    {t === TXN_TYPE.EXPENSE ? 'Expense' : 'Income'}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* ── Amount input ── */}
          <Animated.View style={{ transform: [{ translateX: amountShake }] }}>
            <View style={[S.amountCard, {
              backgroundColor: Colors.bgCard,
              borderColor: hasValidAmount ? accentColor : Colors.border,
            }]}>
              <Text style={[S.amountPrefix, { color: accentColor }]}>₹</Text>
              <TextInput
                ref={amountRef}
                style={[S.amountInput, { color: Colors.textPrimary }]}
                value={amount}
                onChangeText={(v) => { setAmount(v.replace(/[^0-9.]/g, '')); setError(''); }}
                placeholder="0.00"
                placeholderTextColor={Colors.textMuted}
                keyboardType="decimal-pad"
                returnKeyType="done"
                onSubmitEditing={handleAdd}
              />
              {amount.length > 0 && (
                <TouchableOpacity onPress={() => setAmount('')} style={S.clearBtn}>
                  <Text style={{ color: Colors.textMuted, fontSize: 18 }}>⌫</Text>
                </TouchableOpacity>
              )}
            </View>
          </Animated.View>

          {/* Live summary strip */}
          {hasValidAmount && selectedCatMeta && (
            <View style={[S.previewStrip, {
              backgroundColor: accentColor + '15',
              borderLeftColor: accentColor,
            }]}>
              <Text style={{ fontSize: 24 }}>{selectedCatMeta.emoji}</Text>
              <View style={S.previewText}>
                <Text style={[S.previewAmount, { color: accentColor }]}>
                  {isExpense ? '−' : '+'}{formatCurrency(parsedAmount)}
                </Text>
                <Text style={[S.previewMeta, { color: Colors.textSecondary }]}>
                  {selectedCatMeta.name}{selectedAcc ? ` · ${selectedAcc.name}` : ''}
                </Text>
              </View>
              {selectedAcc && (
                <View style={[S.afterBalance, { backgroundColor: accentColor + '20' }]}>
                  <Text style={[S.afterBalanceLabel, { color: Colors.textMuted }]}>After</Text>
                  <Text style={[S.afterBalanceValue, { color: accentColor }]}>
                    {formatCurrency((selectedAcc.balance || 0) + (isExpense ? -parsedAmount : parsedAmount))}
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* ── Category grid ── */}
          <View style={S.sectionHeader}>
            <Text style={[S.sectionTitle, { color: Colors.textSecondary }]}>Category</Text>
            <TouchableOpacity
              style={[S.addCatBtn, { borderColor: Colors.accent, backgroundColor: Colors.accentDim }]}
              onPress={() => setShowCustomModal(true)}
            >
              <Text style={[S.addCatBtnText, { color: Colors.accent }]}>+ Custom</Text>
            </TouchableOpacity>
          </View>

          <View style={S.categoryGrid}>
            {allCategories.map((cat) => {
              const selected = category === cat.id;
              const tileColor = cat.color || Colors.accent;
              return (
                <TouchableOpacity
                  key={cat.id}
                  activeOpacity={0.75}
                  onPress={() => { setCategory(cat.id); setError(''); }}
                  style={[S.catTile,
                    { backgroundColor: Colors.bgCard, borderColor: Colors.border },
                    selected && { backgroundColor: tileColor + '20', borderColor: tileColor, borderWidth: 2 },
                  ]}
                >
                  <View style={[S.catIconCircle, { backgroundColor: selected ? tileColor + '30' : Colors.bgCardHover }]}>
                    <Text style={S.catEmoji}>{cat.emoji}</Text>
                  </View>
                  <Text
                    numberOfLines={1}
                    style={[S.catName, { color: selected ? tileColor : Colors.textSecondary }]}
                  >
                    {cat.name}
                  </Text>
                  {selected && (
                    <View style={[S.catCheck, { backgroundColor: tileColor }]}>
                      <Text style={{ color: '#fff', fontSize: 10, fontWeight: '900' }}>✓</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* ── Account picker ── */}
          <Text style={[S.sectionTitle, { color: Colors.textSecondary, marginTop: Spacing.md, marginBottom: Spacing.sm }]}>
            Account
          </Text>
          <AccountPicker
            accounts={accounts}
            selectedId={selectedAcc?.id}
            onSelect={(acc) => { setSelectedAcc(acc); setError(''); }}
          />

          {/* Selected account balance preview */}
          {selectedAcc && (
            <View style={[S.accInfo, {
              backgroundColor: (selectedAcc.color || Colors.accent) + '15',
              borderColor:     (selectedAcc.color || Colors.accent) + '40',
            }]}>
              <Text style={{ fontSize: 18 }}>{selectedAcc.emoji}</Text>
              <Text style={[S.accInfoText, { color: Colors.textSecondary }]}>
                {selectedAcc.name} · Current balance
              </Text>
              <Text style={[S.accInfoBalance, { color: selectedAcc.color || Colors.accent }]}>
                {formatCurrency(selectedAcc.balance || 0)}
              </Text>
            </View>
          )}

          {/* ── Note ── */}
          <Text style={[S.sectionTitle, { color: Colors.textSecondary, marginTop: Spacing.md, marginBottom: Spacing.sm }]}>
            Note (optional)
          </Text>
          <TextInput
            style={[S.noteInput, { backgroundColor: Colors.bgCard, borderColor: Colors.border, color: Colors.textPrimary }]}
            value={note}
            onChangeText={setNote}
            placeholder="What was this for?"
            placeholderTextColor={Colors.textMuted}
            multiline
            maxLength={120}
          />
          {note.length > 0 && (
            <Text style={[S.charCount, { color: Colors.textMuted }]}>{note.length}/120</Text>
          )}

          <ErrorText message={error} />

          {/* Success overlay */}
          {success && (
            <Animated.View style={[S.successOverlay, {
              backgroundColor: Colors.bg + 'F2',
              transform: [{ scale: successScale }],
            }]}>
              <Text style={{ fontSize: 72 }}>{isExpense ? '✅' : '💚'}</Text>
              <Text style={[S.successLabel, { color: accentColor }]}>
                {isExpense ? 'Expense saved!' : 'Income saved!'}
              </Text>
              <Text style={[S.successSub, { color: Colors.textSecondary }]}>
                {isExpense ? '−' : '+'}{formatCurrency(parsedAmount || 0)} · {selectedCatMeta?.name}
              </Text>
            </Animated.View>
          )}
        </ScrollView>

        {/* ── Submit button ── */}
        <View style={[S.bottomBar, { backgroundColor: Colors.bg, borderTopColor: Colors.border }]}>
          <Button
            title={isExpense ? '📤  Save Expense' : '💚  Save Income'}
            onPress={handleAdd}
            loading={loading}
            disabled={!hasValidAmount || !category || !selectedAcc}
            style={{ backgroundColor: accentColor }}
          />
        </View>
      </KeyboardAvoidingView>

      {/* Custom category modal */}
      <CustomCategoryModal
        visible={showCustomModal}
        onClose={() => setShowCustomModal(false)}
        onSave={handleSaveCustom}
        existingNames={allCategories.map((c) => c.name.toLowerCase())}
      />
    </SafeAreaView>
  );
};

// ── Styles ────────────────────────────────────────────────
const S = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.base,
    paddingTop:        Spacing.md,
    paddingBottom:     Spacing['3xl'],
  },

  screenTitle: {
    fontSize:     Typography['2xl'],
    fontWeight:   '900',
    marginBottom: Spacing.base,
  },

  // Type toggle
  typeToggle: {
    flexDirection:  'row',
    borderRadius:   Radius.lg,
    borderWidth:    1,
    overflow:       'hidden',
    marginBottom:   Spacing.base,
    padding:        4,
  },
  typeBtn: {
    flex:           1,
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    borderRadius:   Radius.md,
    gap:            8,
  },
  typeBtnIcon:  { fontSize: 20 },
  typeBtnLabel: { fontSize: Typography.base, fontWeight: '700' },

  // Amount
  amountCard: {
    flexDirection:    'row',
    alignItems:       'center',
    borderRadius:     Radius.xl,
    borderWidth:      2,
    paddingHorizontal: Spacing.lg,
    marginBottom:     Spacing.sm,
  },
  amountPrefix: {
    fontSize:   Typography['3xl'],
    fontWeight: '900',
    marginRight: Spacing.sm,
    lineHeight:  80,
  },
  amountInput: {
    flex:       1,
    fontSize:   Typography['3xl'],
    fontWeight: '900',
    paddingVertical: Spacing.lg,
    lineHeight:  70,
  },
  clearBtn: { paddingHorizontal: Spacing.sm },

  // Preview strip
  previewStrip: {
    flexDirection:  'row',
    alignItems:     'center',
    borderRadius:   Radius.md,
    borderLeftWidth: 4,
    paddingVertical:   Spacing.md,
    paddingHorizontal: Spacing.base,
    marginBottom:   Spacing.md,
    gap:            Spacing.md,
  },
  previewText:   { flex: 1 },
  previewAmount: { fontSize: Typography.xl, fontWeight: '900' },
  previewMeta:   { fontSize: Typography.sm, marginTop: 2 },
  afterBalance:  { alignItems: 'center', paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, borderRadius: Radius.md },
  afterBalanceLabel: { fontSize: Typography.xs, fontWeight: '600' },
  afterBalanceValue: { fontSize: Typography.sm, fontWeight: '800' },

  // Section
  sectionHeader: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'center',
    marginBottom:   Spacing.sm,
    marginTop:      Spacing.md,
  },
  sectionTitle: {
    fontSize:    Typography.xs,
    fontWeight:  '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  addCatBtn: {
    borderWidth:      1,
    borderRadius:     Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical:  Spacing.xs,
  },
  addCatBtnText: { fontSize: Typography.xs, fontWeight: '700' },

  // Category grid — 4 columns
  categoryGrid: {
    flexDirection: 'row',
    flexWrap:      'wrap',
    gap:           Spacing.sm,
    marginBottom:  Spacing.md,
  },
  catTile: {
    width:          '22.5%',
    alignItems:     'center',
    borderRadius:   Radius.lg,
    borderWidth:    1,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xs,
    position:       'relative',
  },
  catIconCircle: {
    width:          42,
    height:         42,
    borderRadius:   Radius.full,
    alignItems:     'center',
    justifyContent: 'center',
    marginBottom:   Spacing.xs,
  },
  catEmoji: { fontSize: 20 },
  catName:  { fontSize: Typography.xs, fontWeight: '600', textAlign: 'center' },
  catCheck: {
    position:     'absolute',
    top:          -4,
    right:        -4,
    width:        18,
    height:       18,
    borderRadius: 9,
    alignItems:   'center',
    justifyContent: 'center',
  },

  // Account
  accInfo: {
    flexDirection: 'row',
    alignItems:    'center',
    borderRadius:  Radius.md,
    borderWidth:   1,
    padding:       Spacing.md,
    marginTop:     Spacing.xs,
    gap:           Spacing.sm,
  },
  accInfoText:    { flex: 1, fontSize: Typography.sm, color: '#8B949E' },
  accInfoBalance: { fontSize: Typography.md, fontWeight: '800' },

  // Note
  noteInput: {
    borderWidth:  1,
    borderRadius: Radius.md,
    padding:      Spacing.md,
    fontSize:     Typography.base,
    minHeight:    70,
    textAlignVertical: 'top',
  },
  charCount: { fontSize: Typography.xs, textAlign: 'right', marginTop: 4 },

  // Success
  successOverlay: {
    position:       'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    alignItems:     'center',
    justifyContent: 'center',
    borderRadius:   Radius.lg,
  },
  successLabel: { fontSize: Typography['2xl'], fontWeight: '900', marginTop: Spacing.md },
  successSub:   { fontSize: Typography.base,  marginTop: Spacing.xs },

  // Bottom
  bottomBar: { padding: Spacing.base, borderTopWidth: 1 },
});

export default AddTransactionScreen;
