// components/UI.js — Reusable themed UI primitives
import React from 'react';
import {
  View, Text, TouchableOpacity, ActivityIndicator, StyleSheet,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { Typography, Spacing, Radius } from '../utils/theme';

// ── Button ────────────────────────────────────────────────
export const Button = ({ title, onPress, variant = 'primary', loading = false, disabled = false, style }) => {
  const { Colors } = useTheme();
  const variants = {
    primary:   { bg: Colors.accent,   text: Colors.black },
    secondary: { bg: Colors.bgCard,   text: Colors.textPrimary },
    danger:    { bg: Colors.danger,   text: Colors.white },
    ghost:     { bg: 'transparent',   text: Colors.textSecondary },
  };
  const v = variants[variant] || variants.primary;
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.75}
      style={[
        styles.button,
        { backgroundColor: v.bg },
        (disabled || loading) && { opacity: 0.5 },
        style,
      ]}
    >
      {loading
        ? <ActivityIndicator color={v.text} size="small" />
        : <Text style={[styles.buttonText, { color: v.text }]}>{title}</Text>
      }
    </TouchableOpacity>
  );
};

// ── Card ──────────────────────────────────────────────────
export const Card = ({ children, style }) => {
  const { Colors } = useTheme();
  return (
    <View style={[
      styles.card,
      { backgroundColor: Colors.bgCard, borderColor: Colors.border },
      style,
    ]}>
      {children}
    </View>
  );
};

// ── Chip ──────────────────────────────────────────────────
export const Chip = ({ label, color }) => {
  const { Colors } = useTheme();
  const c = color || Colors.accent;
  return (
    <View style={[styles.chip, { backgroundColor: c + '25' }]}>
      <Text style={[styles.chipText, { color: c }]}>{label}</Text>
    </View>
  );
};

// ── ErrorText ─────────────────────────────────────────────
export const ErrorText = ({ message }) => {
  const { Colors } = useTheme();
  if (!message) return null;
  return (
    <View style={[styles.errorBox, { backgroundColor: Colors.dangerDim, borderLeftColor: Colors.danger }]}>
      <Text style={[styles.errorText, { color: Colors.danger }]}>⚠️  {message}</Text>
    </View>
  );
};

// ── LoadingOverlay ────────────────────────────────────────
export const LoadingOverlay = ({ message = 'Loading…', Colors: ColorsOverride }) => {
  const theme = useTheme();
  const C = ColorsOverride || theme.Colors;
  return (
    <View style={[styles.loadingContainer, { backgroundColor: C.bg }]}>
      <ActivityIndicator color={C.accent} size="large" />
      <Text style={[styles.loadingText, { color: C.textSecondary }]}>{message}</Text>
    </View>
  );
};

// ── EmptyState ────────────────────────────────────────────
export const EmptyState = ({ emoji = '🪙', title, subtitle }) => {
  const { Colors } = useTheme();
  return (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyEmoji}>{emoji}</Text>
      <Text style={[styles.emptyTitle, { color: Colors.textPrimary }]}>{title}</Text>
      {subtitle ? <Text style={[styles.emptySubtitle, { color: Colors.textSecondary }]}>{subtitle}</Text> : null}
    </View>
  );
};

// ── Divider ───────────────────────────────────────────────
export const Divider = ({ style }) => {
  const { Colors } = useTheme();
  return <View style={[styles.divider, { backgroundColor: Colors.border }, style]} />;
};

// ── SectionHeader ─────────────────────────────────────────
export const SectionHeader = ({ title }) => {
  const { Colors } = useTheme();
  return <Text style={[styles.sectionHeader, { color: Colors.textSecondary }]}>{title}</Text>;
};

// ── ThemeToggle ───────────────────────────────────────────
export const ThemeToggle = () => {
  const { isDark, toggleTheme, Colors } = useTheme();
  return (
    <TouchableOpacity
      onPress={toggleTheme}
      style={[styles.themeToggle, { backgroundColor: Colors.bgCardHover, borderColor: Colors.border }]}
      activeOpacity={0.75}
    >
      <Text style={styles.themeIcon}>{isDark ? '☀️' : '🌙'}</Text>
      <Text style={[styles.themeLabel, { color: Colors.textSecondary }]}>
        {isDark ? 'Light mode' : 'Dark mode'}
      </Text>
    </TouchableOpacity>
  );
};

// ── Styles ────────────────────────────────────────────────
const styles = StyleSheet.create({
  button: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  buttonText: { fontSize: Typography.base, fontWeight: '700', letterSpacing: 0.5 },

  card: {
    borderRadius: Radius.lg,
    padding: Spacing.base,
    borderWidth: 1,
  },

  chip: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.full,
    alignSelf: 'flex-start',
  },
  chipText: { fontSize: Typography.xs, fontWeight: '600', textTransform: 'capitalize' },

  errorBox: {
    borderRadius: Radius.md,
    padding: Spacing.sm,
    marginTop: Spacing.sm,
    borderLeftWidth: 3,
  },
  errorText: { fontSize: Typography.sm },

  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { fontSize: Typography.base, marginTop: Spacing.md },

  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: Spacing['3xl'] },
  emptyEmoji: { fontSize: 52, marginBottom: Spacing.md },
  emptyTitle: { fontSize: Typography.lg, fontWeight: '700', marginBottom: Spacing.xs, textAlign: 'center' },
  emptySubtitle: { fontSize: Typography.sm, textAlign: 'center', lineHeight: 20 },

  divider: { height: 1, marginVertical: Spacing.sm },

  sectionHeader: {
    fontSize: Typography.xs, fontWeight: '700', letterSpacing: 1.2,
    textTransform: 'uppercase', marginBottom: Spacing.sm, marginTop: Spacing.md,
  },

  themeToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
  },
  themeIcon: { fontSize: 20, marginRight: Spacing.sm },
  themeLabel: { fontSize: Typography.base, fontWeight: '600' },
});
