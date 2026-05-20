// screens/AddExpenseScreen.js
// ─────────────────────────────────────────────────────────
// The core "fast add" screen.
// Single input field with WhatsApp-style parsing:
//   "200 food"  →  amount=200, category=food
// Category chips for quick selection.
// Target: logged in < 3 seconds.
// ─────────────────────────────────────────────────────────

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

import { Colors, Typography, Spacing, Radius } from '../utils/theme';
import { parseExpenseInput, validateExpenseInput } from '../utils/expenseParser';
import { formatCurrency, getCategoryEmoji } from '../utils/formatters';
import { addExpense } from '../services/expenseService';
import { Button, ErrorText } from '../components/UI';
import useAuth from '../hooks/useAuth';

// Quick-tap category chips — most common Indian daily expenses
const QUICK_CATEGORIES = [
  { label: 'Food', value: 'food' },
  { label: 'Auto', value: 'transport' },
  { label: 'Grocery', value: 'groceries' },
  { label: 'Chai', value: 'food' },
  { label: 'Petrol', value: 'fuel' },
  { label: 'Medicine', value: 'health' },
  { label: 'Movie', value: 'entertainment' },
  { label: 'Other', value: 'other' },
];

const AddExpenseScreen = () => {
  const navigation = useNavigation();
  const { user } = useAuth();

  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [parsed, setParsed] = useState(null); // live preview
  const [success, setSuccess] = useState(false);

  // Success animation
  const successScale = useRef(new Animated.Value(0)).current;

  const inputRef = useRef(null);

  // Auto-focus the input when screen mounts
  useEffect(() => {
    const timer = setTimeout(() => inputRef.current?.focus(), 200);
    return () => clearTimeout(timer);
  }, []);

  // Live-parse input to show preview
  useEffect(() => {
    if (!input.trim()) {
      setParsed(null);
      setError('');
      return;
    }
    const result = parseExpenseInput(input);
    setParsed(result);
    setError('');
  }, [input]);

  // Tap a chip to append category to an existing amount
  const handleChipPress = (category) => {
    const currentTokens = input.trim().split(/\s+/);
    if (currentTokens.length >= 1 && !isNaN(parseFloat(currentTokens[0]))) {
      // Amount already typed — replace/set category
      setInput(`${currentTokens[0]} ${category}`);
    } else {
      // No amount yet — set category and position cursor
      setInput(`${input.trim()} ${category}`.trim());
    }
    inputRef.current?.focus();
  };

  // ── Submit ───────────────────────────────────────────────
  const handleAdd = async () => {
    Keyboard.dismiss();

    const validationError = validateExpenseInput(input);
    if (validationError) {
      setError(validationError);
      return;
    }

    const result = parseExpenseInput(input);
    if (!result) {
      setError('Could not parse input. Try "200 food"');
      return;
    }

    setLoading(true);

    try {
      await addExpense(user.uid, result.amount, result.category, result.note);

      // Show success state
      setSuccess(true);
      Animated.spring(successScale, {
        toValue: 1,
        useNativeDriver: true,
        tension: 80,
        friction: 5,
      }).start();

      // Reset after 1.2s
      setTimeout(() => {
        setInput('');
        setParsed(null);
        setSuccess(false);
        successScale.setValue(0);
        setLoading(false);
        navigation.navigate('Home');
      }, 1200);
    } catch (e) {
      console.error('Add expense error:', e);
      setError('Failed to save. Check your connection and try again.');
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Header ── */}
          <View style={styles.header}>
            <Text style={styles.title}>Add Expense</Text>
            <Text style={styles.sub}>Type amount + category</Text>
          </View>

          {/* ── Main Input ── */}
          <View style={styles.inputWrapper}>
            <Text style={styles.rupeeSymbol}>₹</Text>
            <TextInput
              ref={inputRef}
              style={styles.input}
              value={input}
              onChangeText={setInput}
              placeholder="200 food"
              placeholderTextColor={Colors.textMuted}
              onSubmitEditing={handleAdd}
              returnKeyType="done"
              autoCapitalize="none"
              autoCorrect={false}
            />
            {input.length > 0 && (
              <TouchableOpacity
                onPress={() => { setInput(''); setParsed(null); inputRef.current?.focus(); }}
                style={styles.clearBtn}
              >
                <Text style={styles.clearBtnText}>✕</Text>
              </TouchableOpacity>
            )}
          </View>

          <ErrorText message={error} />

          {/* ── Live Preview ── */}
          {parsed && !error && (
            <View style={styles.preview}>
              <Text style={styles.previewEmoji}>
                {getCategoryEmoji(parsed.category)}
              </Text>
              <View style={styles.previewText}>
                <Text style={styles.previewAmount}>
                  {formatCurrency(parsed.amount)}
                </Text>
                <Text style={styles.previewCat}>
                  in <Text style={{ color: Colors.accent }}>{parsed.category}</Text>
                  {parsed.note ? ` · ${parsed.note}` : ''}
                </Text>
              </View>
            </View>
          )}

          {/* ── Quick Category Chips ── */}
          <Text style={styles.chipsLabel}>Quick categories</Text>
          <View style={styles.chipsGrid}>
            {QUICK_CATEGORIES.map((chip) => (
              <TouchableOpacity
                key={chip.label}
                style={styles.chip}
                onPress={() => handleChipPress(chip.value)}
                activeOpacity={0.7}
              >
                <Text style={styles.chipEmoji}>
                  {getCategoryEmoji(chip.value)}
                </Text>
                <Text style={styles.chipLabel}>{chip.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* ── Format Guide ── */}
          <View style={styles.guide}>
            <Text style={styles.guideTitle}>Format guide</Text>
            {[
              { ex: '200 food', desc: '₹200 in food' },
              { ex: '50 auto', desc: '₹50 transport' },
              { ex: '1500 rent', desc: '₹1500 rent' },
              { ex: '120 grocery dal', desc: '₹120 groceries · "dal"' },
            ].map((g) => (
              <View key={g.ex} style={styles.guideRow}>
                <Text style={styles.guideEx}>"{g.ex}"</Text>
                <Text style={styles.guideArrow}>→</Text>
                <Text style={styles.guideDesc}>{g.desc}</Text>
              </View>
            ))}
          </View>

          {/* ── Success overlay ── */}
          {success && (
            <Animated.View
              style={[styles.successOverlay, { transform: [{ scale: successScale }] }]}
            >
              <Text style={styles.successEmoji}>✅</Text>
              <Text style={styles.successText}>Saved!</Text>
            </Animated.View>
          )}
        </ScrollView>

        {/* ── Bottom Add Button ── */}
        <View style={styles.bottomBar}>
          <Button
            title="Add Expense"
            onPress={handleAdd}
            loading={loading}
            disabled={!input.trim()}
            style={styles.addBtn}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  flex: { flex: 1 },

  container: {
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing['2xl'],
  },

  header: {
    marginBottom: Spacing.xl,
  },
  title: {
    color: Colors.textPrimary,
    fontSize: Typography['2xl'],
    fontWeight: '900',
  },
  sub: {
    color: Colors.textSecondary,
    fontSize: Typography.sm,
    marginTop: 2,
  },

  // Main input
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.lg,
    borderWidth: 2,
    borderColor: Colors.accent,
    paddingHorizontal: Spacing.base,
    marginBottom: Spacing.sm,
  },
  rupeeSymbol: {
    color: Colors.accent,
    fontSize: Typography['2xl'],
    fontWeight: '800',
    marginRight: Spacing.sm,
  },
  input: {
    flex: 1,
    color: Colors.textPrimary,
    fontSize: Typography['2xl'],
    fontWeight: '700',
    paddingVertical: Spacing.base,
  },
  clearBtn: {
    padding: Spacing.sm,
  },
  clearBtnText: {
    color: Colors.textMuted,
    fontSize: Typography.base,
  },

  // Live preview
  preview: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.accentDim,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    gap: Spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: Colors.accent,
  },
  previewEmoji: { fontSize: 28 },
  previewText: { flex: 1 },
  previewAmount: {
    color: Colors.textPrimary,
    fontSize: Typography.xl,
    fontWeight: '800',
  },
  previewCat: {
    color: Colors.textSecondary,
    fontSize: Typography.sm,
    marginTop: 2,
  },

  // Chips
  chipsLabel: {
    color: Colors.textSecondary,
    fontSize: Typography.xs,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: Spacing.sm,
    marginTop: Spacing.md,
  },
  chipsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.full,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.xs,
  },
  chipEmoji: { fontSize: 16 },
  chipLabel: {
    color: Colors.textPrimary,
    fontSize: Typography.sm,
    fontWeight: '600',
  },

  // Format guide
  guide: {
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.md,
    padding: Spacing.base,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  guideTitle: {
    color: Colors.textSecondary,
    fontSize: Typography.xs,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: Spacing.sm,
  },
  guideRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: 3,
  },
  guideEx: {
    color: Colors.accent,
    fontSize: Typography.sm,
    fontWeight: '600',
    width: 140,
  },
  guideArrow: {
    color: Colors.textMuted,
    fontSize: Typography.sm,
  },
  guideDesc: {
    color: Colors.textSecondary,
    fontSize: Typography.sm,
    flex: 1,
  },

  // Success
  successOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: Colors.bg + 'EE',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.lg,
  },
  successEmoji: { fontSize: 64 },
  successText: {
    color: Colors.safe,
    fontSize: Typography['2xl'],
    fontWeight: '900',
    marginTop: Spacing.sm,
  },

  // Bottom bar
  bottomBar: {
    padding: Spacing.base,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.bg,
  },
  addBtn: { width: '100%' },
});

export default AddExpenseScreen;
