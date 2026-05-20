// screens/CategoryLimitsScreen.js
// ─────────────────────────────────────────────────────────
// Full category budget management screen.
//
// Sections:
//   1. Overview bar — total budget, total spent, overall %
//   2. Exceeded alert banner (if any)
//   3. Budget cards — one per set limit (with edit/delete)
//   4. "Unbudgeted spending" — categories with spend but no limit
//   5. "Add / Edit" modal — category picker + amount input
// ─────────────────────────────────────────────────────────

import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Modal, TextInput, Alert, FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme }         from '../context/ThemeContext';
import { Typography, Spacing, Radius } from '../utils/theme';
import { formatCurrency }   from '../utils/formatters';
import { setCategoryLimit, removeCategoryLimit } from '../services/categoryLimitService';
import { EXPENSE_CATEGORIES, getCategoryMeta }   from '../utils/constants';
import { Button, ErrorText, LoadingOverlay, EmptyState } from '../components/UI';
import CategoryLimitCard    from '../components/CategoryLimitCard';
import useAuth              from '../hooks/useAuth';
import useCategoryLimits    from '../hooks/useCategoryLimits';

// ── Quick preset amounts ──────────────────────────────────
const PRESETS = [500, 1000, 2000, 3000, 5000, 10000];

// ── Add / Edit modal ──────────────────────────────────────
const LimitModal = ({ visible, editItem, userId, onClose, existingCategories }) => {
  const { Colors } = useTheme();

  const isEdit       = !!editItem;
  const [category,   setCategory]  = useState(editItem?.categoryId || '');
  const [amount,     setAmount]    = useState(editItem ? String(editItem.limit) : '');
  const [loading,    setLoading]   = useState(false);
  const [error,      setError]     = useState('');
  const [step,       setStep]      = useState(isEdit ? 2 : 1); // 1 = pick cat, 2 = set amount

  // Reset when modal opens/closes
  React.useEffect(() => {
    if (visible) {
      setCategory(editItem?.categoryId || '');
      setAmount(editItem ? String(editItem.limit) : '');
      setError('');
      setStep(isEdit ? 2 : 1);
    }
  }, [visible, editItem]);

  const handleSave = async () => {
    const n = parseFloat(amount);
    if (!category)          { setError('Select a category'); return; }
    if (isNaN(n) || n <= 0) { setError('Enter a valid limit amount'); return; }
    if (n > 10000000)       { setError('Amount is too large'); return; }

    setError('');
    setLoading(true);
    try {
      await setCategoryLimit(userId, category, n);
      onClose();
    } catch (e) {
      setError(e.message || 'Failed to save. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const selectedMeta = category ? getCategoryMeta(category, 'expense') : null;

  // Categories not yet budgeted (for step 1)
  const availableCategories = EXPENSE_CATEGORIES.filter(
    (c) => !existingCategories.includes(c.id) || c.id === editItem?.categoryId
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={[M.overlay]}>
        <View style={[M.sheet, { backgroundColor: Colors.bgCard, borderColor: Colors.border }]}>

          <Text style={[M.title, { color: Colors.textPrimary }]}>
            {isEdit ? `Edit — ${selectedMeta?.name}` : 'Set Category Budget'}
          </Text>

          {/* ── STEP 1: Pick category ── */}
          {step === 1 && (
            <>
              <Text style={[M.label, { color: Colors.textSecondary }]}>Choose a category</Text>
              <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 320 }}>
                <View style={M.catGrid}>
                  {availableCategories.map((cat) => {
                    const sel = category === cat.id;
                    return (
                      <TouchableOpacity
                        key={cat.id}
                        onPress={() => setCategory(cat.id)}
                        style={[M.catTile,
                          { backgroundColor: Colors.bgCardHover, borderColor: Colors.border },
                          sel && { backgroundColor: cat.color + '22', borderColor: cat.color, borderWidth: 2 },
                        ]}
                      >
                        <Text style={{ fontSize: 22 }}>{cat.emoji}</Text>
                        <Text style={[M.catLabel, { color: sel ? cat.color : Colors.textSecondary }]}
                          numberOfLines={1}>
                          {cat.name}
                        </Text>
                        {sel && (
                          <View style={[M.check, { backgroundColor: cat.color }]}>
                            <Text style={{ color: '#fff', fontSize: 10, fontWeight: '900' }}>✓</Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </ScrollView>

              <ErrorText message={error} />
              <View style={M.btnRow}>
                <Button title="Cancel" variant="ghost" onPress={onClose} style={{ flex: 1 }} />
                <Button
                  title="Next →"
                  onPress={() => { if (!category) { setError('Select a category'); return; } setError(''); setStep(2); }}
                  style={{ flex: 1 }}
                  disabled={!category}
                />
              </View>
            </>
          )}

          {/* ── STEP 2: Set amount ── */}
          {step === 2 && (
            <>
              {/* Selected category preview */}
              {selectedMeta && (
                <View style={[M.preview, { backgroundColor: (selectedMeta.color || Colors.accent) + '18', borderColor: (selectedMeta.color || Colors.accent) + '40' }]}>
                  <Text style={{ fontSize: 28 }}>{selectedMeta.emoji}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[M.previewName, { color: Colors.textPrimary }]}>{selectedMeta.name}</Text>
                    <Text style={[M.previewSub, { color: Colors.textMuted }]}>Monthly spending limit</Text>
                  </View>
                  {!isEdit && (
                    <TouchableOpacity onPress={() => setStep(1)}>
                      <Text style={[{ color: Colors.accent, fontSize: Typography.sm, fontWeight: '700' }]}>Change</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}

              {/* Amount input */}
              <Text style={[M.label, { color: Colors.textSecondary, marginTop: Spacing.md }]}>
                Monthly limit (₹)
              </Text>
              <View style={[M.amtRow, { borderColor: Colors.accent, backgroundColor: Colors.bgCardHover }]}>
                <Text style={[M.rupee, { color: Colors.accent }]}>₹</Text>
                <TextInput
                  style={[M.amtInput, { color: Colors.textPrimary }]}
                  value={amount}
                  onChangeText={(v) => { setAmount(v.replace(/[^0-9.]/g, '')); setError(''); }}
                  keyboardType="decimal-pad"
                  placeholder="e.g. 3000"
                  placeholderTextColor={Colors.textMuted}
                  autoFocus={isEdit}
                  returnKeyType="done"
                  onSubmitEditing={handleSave}
                />
              </View>

              {/* Preset chips */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={M.presetScroll}>
                {PRESETS.map((p) => (
                  <TouchableOpacity
                    key={p}
                    onPress={() => setAmount(String(p))}
                    style={[M.preset,
                      { borderColor: Colors.border, backgroundColor: Colors.bgCardHover },
                      amount === String(p) && { backgroundColor: Colors.accent, borderColor: Colors.accent },
                    ]}
                  >
                    <Text style={[M.presetText, { color: amount === String(p) ? Colors.black : Colors.textSecondary }]}>
                      ₹{p.toLocaleString('en-IN')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Live preview */}
              {parseFloat(amount) > 0 && (
                <View style={[M.livePrev, { backgroundColor: Colors.accentDim, borderLeftColor: Colors.accent }]}>
                  <Text style={[{ color: Colors.textSecondary, fontSize: Typography.sm }]}>
                    Budget:{' '}
                    <Text style={[{ color: Colors.accent, fontWeight: '900' }]}>
                      {formatCurrency(parseFloat(amount))}
                    </Text>
                    {' '}/ month for {selectedMeta?.name}
                  </Text>
                </View>
              )}

              <ErrorText message={error} />

              <View style={M.btnRow}>
                {!isEdit && (
                  <Button title="← Back" variant="ghost" onPress={() => setStep(1)} style={{ flex: 1 }} />
                )}
                {isEdit && (
                  <Button title="Cancel" variant="ghost" onPress={onClose} style={{ flex: 1 }} />
                )}
                <Button
                  title={isEdit ? 'Update Budget' : 'Set Budget'}
                  onPress={handleSave}
                  loading={loading}
                  disabled={!amount || parseFloat(amount) <= 0}
                  style={{ flex: 1 }}
                />
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
};

// ── Main screen ───────────────────────────────────────────

const CategoryLimitsScreen = () => {
  const { Colors }   = useTheme();
  const { user }     = useAuth();
  const { enriched, unbudgeted, exceededCount, loading } = useCategoryLimits(user?.uid);

  const [showModal,  setShowModal]  = useState(false);
  const [editItem,   setEditItem]   = useState(null);

  // Total budget health
  const totalBudget = enriched.reduce((s, e) => s + e.limit,   0);
  const totalSpent  = enriched.reduce((s, e) => s + e.spent,   0);
  const overallPct  = totalBudget > 0 ? Math.min((totalSpent / totalBudget) * 100, 100) : 0;
  const overallColor = overallPct >= 100 ? Colors.danger : overallPct >= 80 ? Colors.warning : Colors.safe;
  const existingCategories = enriched.map((e) => e.categoryId);

  const handleEdit = useCallback((item) => {
    setEditItem(item);
    setShowModal(true);
  }, []);

  const handleDelete = useCallback((item) => {
    Alert.alert(
      'Remove Budget',
      `Remove the ₹${item.limit.toLocaleString('en-IN')} limit for "${item.meta.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try { await removeCategoryLimit(item.id); }
            catch (e) { Alert.alert('Error', 'Could not remove limit. Try again.'); }
          },
        },
      ]
    );
  }, []);

  const openAdd = () => { setEditItem(null); setShowModal(true); };

  if (loading) return <LoadingOverlay message="Loading budgets…" />;

  return (
    <SafeAreaView style={[S.safe, { backgroundColor: Colors.bg }]} edges={['top']}>
      <ScrollView contentContainerStyle={S.container} showsVerticalScrollIndicator={false}>

        {/* ── Header ── */}
        <View style={S.header}>
          <View>
            <Text style={[S.title, { color: Colors.textPrimary }]}>Category Budgets</Text>
            <Text style={[S.subtitle, { color: Colors.textSecondary }]}>
              Monthly spending limits per category
            </Text>
          </View>
          <TouchableOpacity
            onPress={openAdd}
            style={[S.addBtn, { backgroundColor: Colors.accentDim, borderColor: Colors.accent }]}
          >
            <Text style={[S.addBtnText, { color: Colors.accent }]}>+ Add</Text>
          </TouchableOpacity>
        </View>

        {/* ── Overall health card ── */}
        {enriched.length > 0 && (
          <View style={[S.overallCard, { backgroundColor: Colors.bgCard, borderColor: Colors.border }]}>
            <View style={S.overallTop}>
              <View>
                <Text style={[S.overallLabel, { color: Colors.textMuted }]}>Total Monthly Budget</Text>
                <Text style={[S.overallBudget, { color: Colors.textPrimary }]}>
                  {formatCurrency(totalBudget)}
                </Text>
              </View>
              <View style={S.overallRight}>
                <Text style={[S.overallPct, { color: overallColor }]}>
                  {overallPct.toFixed(0)}%
                </Text>
                <Text style={[S.overallSpent, { color: Colors.textMuted }]}>
                  {formatCurrency(totalSpent)} used
                </Text>
              </View>
            </View>

            <View style={[S.overallTrack, { backgroundColor: Colors.bgCardHover }]}>
              <View style={[S.overallFill, { width: `${overallPct}%`, backgroundColor: overallColor }]} />
            </View>

            <View style={S.overallStats}>
              <Text style={[S.overallStat, { color: Colors.textMuted }]}>
                {enriched.length} budgeted · {exceededCount} exceeded
              </Text>
              <Text style={[S.overallStat, { color: Colors.safe }]}>
                {formatCurrency(Math.max(totalBudget - totalSpent, 0))} remaining
              </Text>
            </View>
          </View>
        )}

        {/* ── Exceeded alert banner ── */}
        {exceededCount > 0 && (
          <View style={[S.alertBanner, { backgroundColor: Colors.dangerBg, borderColor: Colors.danger }]}>
            <Text style={{ fontSize: 22 }}>🚨</Text>
            <View style={{ flex: 1 }}>
              <Text style={[S.alertTitle, { color: Colors.danger }]}>
                {exceededCount} categor{exceededCount > 1 ? 'ies' : 'y'} over budget!
              </Text>
              <Text style={[S.alertSub, { color: Colors.danger }]}>
                Review your spending in{' '}
                {enriched.filter((e) => e.exceeded).map((e) => e.meta.name).join(', ')}.
              </Text>
            </View>
          </View>
        )}

        {/* ── Budget cards ── */}
        {enriched.length === 0 ? (
          <View style={S.emptyWrap}>
            <EmptyState
              emoji="🎯"
              title="No budgets set"
              subtitle={"Tap '+ Add' to set your first category budget.\nYou'll get a warning when you're close to the limit."}
            />
          </View>
        ) : (
          <>
            <Text style={[S.sectionLabel, { color: Colors.textSecondary }]}>Your Budgets</Text>
            {enriched.map((item) => (
              <CategoryLimitCard
                key={item.categoryId}
                item={item}
                onEdit={() => handleEdit(item)}
                onDelete={() => handleDelete(item)}
              />
            ))}
          </>
        )}

        {/* ── Unbudgeted categories ── */}
        {unbudgeted.length > 0 && (
          <>
            <Text style={[S.sectionLabel, { color: Colors.textSecondary, marginTop: Spacing.md }]}>
              Spending without a budget
            </Text>
            <View style={[S.unbudgetedCard, { backgroundColor: Colors.bgCard, borderColor: Colors.border }]}>
              <Text style={[S.unbudgetedHint, { color: Colors.textMuted }]}>
                These categories have spending this month but no limit set. Tap to add one.
              </Text>
              {unbudgeted.map((item, i) => (
                <TouchableOpacity
                  key={item.categoryId}
                  onPress={() => {
                    setEditItem(null);
                    setShowModal(true);
                  }}
                  style={[S.unbudRow,
                    { borderBottomColor: Colors.border },
                    i === unbudgeted.length - 1 && { borderBottomWidth: 0 },
                  ]}
                >
                  <Text style={{ fontSize: 20, marginRight: Spacing.sm }}>{item.meta.emoji}</Text>
                  <Text style={[S.unbudName, { color: Colors.textPrimary }]}>{item.meta.name}</Text>
                  <Text style={[S.unbudAmt, { color: Colors.danger }]}>
                    {formatCurrency(item.spent)}
                  </Text>
                  <Text style={[S.unbudAdd, { color: Colors.accent }]}>+ Set limit</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {/* ── Info tip ── */}
        <View style={[S.tipCard, { backgroundColor: Colors.bgCard, borderColor: Colors.accentDim }]}>
          <Text style={[S.tipTitle, { color: Colors.textPrimary }]}>💡 How budgets work</Text>
          <Text style={[S.tipBody, { color: Colors.textSecondary }]}>
            Limits are compared against your <Text style={{ fontWeight: '700' }}>current month's</Text> expenses per category.{'\n\n'}
            <Text style={{ color: Colors.safe, fontWeight: '700' }}>Green</Text> — under 80% of limit.{'\n'}
            <Text style={{ color: Colors.warning, fontWeight: '700' }}>Amber</Text> — 80–99% used.{'\n'}
            <Text style={{ color: Colors.danger, fontWeight: '700' }}>Red</Text> — limit exceeded.
          </Text>
        </View>

      </ScrollView>

      {/* ── Modal ── */}
      <LimitModal
        visible={showModal}
        editItem={editItem}
        userId={user?.uid}
        existingCategories={existingCategories}
        onClose={() => { setShowModal(false); setEditItem(null); }}
      />
    </SafeAreaView>
  );
};

// ── Modal styles ──────────────────────────────────────────
const M = StyleSheet.create({
  overlay:   { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' },
  sheet:     { borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl, borderWidth: 1, borderBottomWidth: 0, padding: Spacing.xl, paddingBottom: 48 },
  title:     { fontSize: Typography.xl, fontWeight: '900', marginBottom: Spacing.base },
  label:     { fontSize: Typography.xs, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: Spacing.sm },

  catGrid:   { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  catTile:   { width: '22%', alignItems: 'center', borderRadius: Radius.lg, borderWidth: 1, paddingVertical: Spacing.md, paddingHorizontal: Spacing.xs, position: 'relative' },
  catLabel:  { fontSize: Typography.xs, fontWeight: '600', textAlign: 'center', marginTop: 4 },
  check:     { position: 'absolute', top: -4, right: -4, width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },

  preview:   { flexDirection: 'row', alignItems: 'center', borderRadius: Radius.md, borderWidth: 1, padding: Spacing.md, gap: Spacing.md, marginBottom: Spacing.sm },
  previewName: { fontSize: Typography.base, fontWeight: '700' },
  previewSub:  { fontSize: Typography.xs, marginTop: 2 },

  amtRow:    { flexDirection: 'row', alignItems: 'center', borderWidth: 2, borderRadius: Radius.lg, paddingHorizontal: Spacing.base, marginBottom: Spacing.md },
  rupee:     { fontSize: Typography['2xl'], fontWeight: '900', marginRight: Spacing.sm },
  amtInput:  { flex: 1, fontSize: Typography['2xl'], fontWeight: '900', paddingVertical: Spacing.md },

  presetScroll: { marginBottom: Spacing.md },
  preset:    { borderWidth: 1, borderRadius: Radius.full, paddingVertical: Spacing.xs, paddingHorizontal: Spacing.md, marginRight: Spacing.sm },
  presetText:{ fontSize: Typography.sm, fontWeight: '700' },

  livePrev:  { borderRadius: Radius.md, borderLeftWidth: 3, padding: Spacing.md, marginBottom: Spacing.sm },

  btnRow:    { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.md },
});

// ── Screen styles ─────────────────────────────────────────
const S = StyleSheet.create({
  safe:      { flex: 1 },
  container: { paddingHorizontal: Spacing.base, paddingBottom: Spacing['3xl'] },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: Spacing.lg, paddingBottom: Spacing.base },
  title:    { fontSize: Typography['2xl'], fontWeight: '900' },
  subtitle: { fontSize: Typography.sm, marginTop: 2 },
  addBtn:   { borderWidth: 1, borderRadius: Radius.full, paddingHorizontal: Spacing.base, paddingVertical: Spacing.sm },
  addBtnText:{ fontSize: Typography.sm, fontWeight: '700' },

  overallCard: { borderRadius: Radius.xl, borderWidth: 1, padding: Spacing.base, marginBottom: Spacing.md },
  overallTop:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.md },
  overallLabel: { fontSize: Typography.xs, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8 },
  overallBudget:{ fontSize: Typography['2xl'], fontWeight: '900', marginTop: 2 },
  overallRight: { alignItems: 'flex-end' },
  overallPct:   { fontSize: Typography['2xl'], fontWeight: '900' },
  overallSpent: { fontSize: Typography.xs, marginTop: 2 },
  overallTrack: { height: 10, borderRadius: 5, overflow: 'hidden', marginBottom: Spacing.sm },
  overallFill:  { height: '100%', borderRadius: 5 },
  overallStats: { flexDirection: 'row', justifyContent: 'space-between' },
  overallStat:  { fontSize: Typography.xs, fontWeight: '600' },

  alertBanner:  { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md, borderRadius: Radius.md, borderWidth: 1, borderLeftWidth: 4, padding: Spacing.md, marginBottom: Spacing.md },
  alertTitle:   { fontSize: Typography.base, fontWeight: '800' },
  alertSub:     { fontSize: Typography.sm, marginTop: 3, opacity: 0.85 },

  sectionLabel: { fontSize: Typography.xs, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: Spacing.sm },
  emptyWrap:    { paddingVertical: Spacing['2xl'] },

  unbudgetedCard: { borderRadius: Radius.xl, borderWidth: 1, padding: Spacing.base, marginBottom: Spacing.md },
  unbudgetedHint: { fontSize: Typography.xs, marginBottom: Spacing.sm },
  unbudRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.md, borderBottomWidth: 1 },
  unbudName:{ flex: 1, fontSize: Typography.sm, fontWeight: '600' },
  unbudAmt: { fontSize: Typography.sm, fontWeight: '700', marginRight: Spacing.sm },
  unbudAdd: { fontSize: Typography.xs, fontWeight: '700' },

  tipCard:  { borderRadius: Radius.xl, borderWidth: 1, padding: Spacing.base, marginTop: Spacing.sm },
  tipTitle: { fontSize: Typography.base, fontWeight: '800', marginBottom: Spacing.sm },
  tipBody:  { fontSize: Typography.sm, lineHeight: 22 },
});

export default CategoryLimitsScreen;
