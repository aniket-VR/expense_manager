// components/CategoryLimitCard.js
// ─────────────────────────────────────────────────────────
// A single category budget card with:
//   • Category icon + name
//   • Spent / Limit amounts
//   • Animated progress bar (green → amber → red)
//   • "Exceeded" badge when over limit
//   • Optional onEdit / onDelete action buttons
//
// Used in:
//   • CategoryLimitsScreen (full card with actions)
//   • HomeScreen (compact = true, read-only)
// ─────────────────────────────────────────────────────────

import React, { useEffect, useRef } from 'react';
import {
  View, Text, Animated, TouchableOpacity, StyleSheet,
} from 'react-native';
import { useTheme }       from '../context/ThemeContext';
import { Typography, Spacing, Radius } from '../utils/theme';
import { formatCurrency } from '../utils/formatters';

// Colour thresholds
const getBarColor = (pct, Colors) => {
  if (pct >= 100) return Colors.danger;
  if (pct >= 80)  return Colors.warning;
  return Colors.safe;
};

const CategoryLimitCard = ({
  item,          // enriched item from useCategoryLimits
  onEdit,        // () => void — opens edit modal
  onDelete,      // () => void — triggers delete confirmation
  compact = false,
}) => {
  const { Colors } = useTheme();

  const { meta, spent, limit, remaining, pct, exceeded, overBy } = item;
  const barColor  = getBarColor(pct, Colors);
  const barWidth  = useRef(new Animated.Value(0)).current;

  // Animate bar width on mount or when pct changes
  useEffect(() => {
    Animated.timing(barWidth, {
      toValue:         Math.min(pct, 100),
      duration:        600,
      useNativeDriver: false,
    }).start();
  }, [pct]);

  const animatedWidth = barWidth.interpolate({
    inputRange:  [0, 100],
    outputRange: ['0%', '100%'],
  });

  if (compact) {
    // ── Compact variant for HomeScreen ──────────────────
    return (
      <View style={[CS.row, { borderBottomColor: Colors.border }]}>
        {/* Icon */}
        <View style={[CS.icon, { backgroundColor: (meta.color || Colors.accent) + '22' }]}>
          <Text style={{ fontSize: 18 }}>{meta.emoji}</Text>
        </View>

        {/* Middle */}
        <View style={CS.mid}>
          <View style={CS.labelRow}>
            <Text style={[CS.name, { color: Colors.textPrimary }]}>{meta.name}</Text>
            {exceeded && (
              <View style={[CS.badge, { backgroundColor: Colors.danger + '22' }]}>
                <Text style={[CS.badgeText, { color: Colors.danger }]}>Over!</Text>
              </View>
            )}
            <Text style={[CS.amounts, { color: Colors.textMuted }]}>
              {formatCurrency(spent)} / {formatCurrency(limit)}
            </Text>
          </View>

          {/* Progress bar */}
          <View style={[CS.track, { backgroundColor: Colors.bgCardHover }]}>
            <Animated.View style={[CS.fill, { width: animatedWidth, backgroundColor: barColor }]} />
          </View>
        </View>

        {/* Right: percentage */}
        <Text style={[CS.pct, { color: barColor }]}>
          {pct.toFixed(0)}%
        </Text>
      </View>
    );
  }

  // ── Full card variant for CategoryLimitsScreen ─────────
  return (
    <View style={[FS.card, {
      backgroundColor: Colors.bgCard,
      borderColor:     exceeded ? Colors.danger + '60' : Colors.border,
      borderLeftColor: barColor,
    }]}>
      {/* ── Top row: icon + name + actions ── */}
      <View style={FS.topRow}>
        <View style={[FS.iconCircle, { backgroundColor: (meta.color || Colors.accent) + '22' }]}>
          <Text style={{ fontSize: 22 }}>{meta.emoji}</Text>
        </View>

        <View style={FS.nameCol}>
          <Text style={[FS.catName, { color: Colors.textPrimary }]}>{meta.name}</Text>
          <Text style={[FS.period, { color: Colors.textMuted }]}>Monthly budget</Text>
        </View>

        {/* Action buttons */}
        {(onEdit || onDelete) && (
          <View style={FS.actions}>
            {onEdit && (
              <TouchableOpacity
                onPress={onEdit}
                style={[FS.actionBtn, { backgroundColor: Colors.accentDim, borderColor: Colors.accent }]}
              >
                <Text style={[FS.actionText, { color: Colors.accent }]}>Edit</Text>
              </TouchableOpacity>
            )}
            {onDelete && (
              <TouchableOpacity
                onPress={onDelete}
                style={[FS.actionBtn, { backgroundColor: Colors.dangerDim, borderColor: Colors.danger }]}
              >
                <Text style={[FS.actionText, { color: Colors.danger }]}>Remove</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      {/* ── Amount row ── */}
      <View style={FS.amountRow}>
        <View style={FS.amountBlock}>
          <Text style={[FS.amountLabel, { color: Colors.textMuted }]}>Spent</Text>
          <Text style={[FS.amountValue, { color: exceeded ? Colors.danger : Colors.textPrimary }]}>
            {formatCurrency(spent)}
          </Text>
        </View>

        <View style={[FS.amountDivider, { backgroundColor: Colors.border }]} />

        <View style={FS.amountBlock}>
          <Text style={[FS.amountLabel, { color: Colors.textMuted }]}>Limit</Text>
          <Text style={[FS.amountValue, { color: Colors.textPrimary }]}>
            {formatCurrency(limit)}
          </Text>
        </View>

        <View style={[FS.amountDivider, { backgroundColor: Colors.border }]} />

        <View style={FS.amountBlock}>
          <Text style={[FS.amountLabel, { color: Colors.textMuted }]}>
            {exceeded ? 'Over by' : 'Remaining'}
          </Text>
          <Text style={[FS.amountValue, { color: exceeded ? Colors.danger : Colors.safe }]}>
            {exceeded ? formatCurrency(overBy) : formatCurrency(remaining)}
          </Text>
        </View>
      </View>

      {/* ── Progress bar ── */}
      <View style={FS.barSection}>
        <View style={[FS.track, { backgroundColor: Colors.bgCardHover }]}>
          <Animated.View style={[FS.fill, { width: animatedWidth, backgroundColor: barColor }]} />
          {/* 80% warning marker */}
          <View style={[FS.marker, { left: '80%', backgroundColor: Colors.border }]} />
        </View>

        <View style={FS.barFooter}>
          <Text style={[FS.pctLabel, { color: barColor, fontWeight: '800' }]}>
            {pct.toFixed(1)}% used
          </Text>
          {exceeded ? (
            <View style={[FS.exceededBadge, { backgroundColor: Colors.danger + '22' }]}>
              <Text style={[FS.exceededText, { color: Colors.danger }]}>
                🚨 Budget exceeded!
              </Text>
            </View>
          ) : pct >= 80 ? (
            <View style={[FS.warningBadge, { backgroundColor: Colors.warning + '22' }]}>
              <Text style={[FS.warningText, { color: Colors.warning }]}>
                ⚠️ Nearing limit
              </Text>
            </View>
          ) : (
            <Text style={[FS.okText, { color: Colors.safe }]}>✓ On track</Text>
          )}
        </View>
      </View>
    </View>
  );
};

// ── Compact styles ────────────────────────────────────────
const CS = StyleSheet.create({
  row:       { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.md, borderBottomWidth: 1 },
  icon:      { width: 36, height: 36, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center', marginRight: Spacing.sm },
  mid:       { flex: 1 },
  labelRow:  { flexDirection: 'row', alignItems: 'center', marginBottom: 5 },
  name:      { fontSize: Typography.sm, fontWeight: '700', flex: 1 },
  badge:     { borderRadius: Radius.full, paddingHorizontal: 6, paddingVertical: 1, marginHorizontal: 4 },
  badgeText: { fontSize: 10, fontWeight: '800' },
  amounts:   { fontSize: Typography.xs },
  track:     { height: 5, borderRadius: 3, overflow: 'hidden' },
  fill:      { height: '100%', borderRadius: 3 },
  pct:       { fontSize: Typography.sm, fontWeight: '800', width: 38, textAlign: 'right' },
});

// ── Full card styles ──────────────────────────────────────
const FS = StyleSheet.create({
  card: {
    borderRadius:  Radius.xl,
    borderWidth:   1,
    borderLeftWidth: 4,
    marginBottom:  Spacing.md,
    overflow:      'hidden',
  },

  topRow: {
    flexDirection:  'row',
    alignItems:     'center',
    padding:        Spacing.base,
    paddingBottom:  Spacing.sm,
  },
  iconCircle: {
    width: 48, height: 48, borderRadius: Radius.full,
    alignItems: 'center', justifyContent: 'center', marginRight: Spacing.md,
  },
  nameCol:  { flex: 1 },
  catName:  { fontSize: Typography.md, fontWeight: '800' },
  period:   { fontSize: Typography.xs, marginTop: 2 },

  actions:    { flexDirection: 'row', gap: Spacing.xs },
  actionBtn:  { borderWidth: 1, borderRadius: Radius.full, paddingHorizontal: Spacing.sm, paddingVertical: 3 },
  actionText: { fontSize: Typography.xs, fontWeight: '700' },

  amountRow: {
    flexDirection:  'row',
    alignItems:     'center',
    marginHorizontal: Spacing.base,
    marginBottom:   Spacing.md,
    padding:        Spacing.sm,
    borderRadius:   Radius.md,
  },
  amountBlock:   { flex: 1, alignItems: 'center' },
  amountDivider: { width: 1, height: 32, marginHorizontal: Spacing.xs },
  amountLabel:   { fontSize: Typography.xs, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.6 },
  amountValue:   { fontSize: Typography.base, fontWeight: '900', marginTop: 2 },

  barSection: { paddingHorizontal: Spacing.base, paddingBottom: Spacing.base },
  track:      { height: 10, borderRadius: 5, overflow: 'hidden', position: 'relative', marginBottom: Spacing.sm },
  fill:       { height: '100%', borderRadius: 5 },
  marker:     { position: 'absolute', top: 0, bottom: 0, width: 1.5 },

  barFooter:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pctLabel:      { fontSize: Typography.sm },
  exceededBadge: { borderRadius: Radius.full, paddingHorizontal: Spacing.sm, paddingVertical: 3 },
  exceededText:  { fontSize: Typography.xs, fontWeight: '700' },
  warningBadge:  { borderRadius: Radius.full, paddingHorizontal: Spacing.sm, paddingVertical: 3 },
  warningText:   { fontSize: Typography.xs, fontWeight: '700' },
  okText:        { fontSize: Typography.xs, fontWeight: '700' },
});

export default CategoryLimitCard;
