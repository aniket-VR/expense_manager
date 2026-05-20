// screens/SettingsScreen.js — fully themed + category limits nav

import React, { useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, TouchableOpacity,
  Alert, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

import { useTheme }         from '../context/ThemeContext';
import { Typography, Spacing, Radius } from '../utils/theme';
import { Button, Divider, ErrorText, ThemeToggle } from '../components/UI';
import { logoutUser }       from '../services/authService';
import { updateDailyLimit } from '../services/expenseService';
import { formatCurrency }   from '../utils/formatters';
import useAuth              from '../hooks/useAuth';
import useCategoryLimits    from '../hooks/useCategoryLimits';

const LIMIT_PRESETS = [200, 500, 1000, 2000, 5000];

const SettingsScreen = () => {
  const { Colors }    = useTheme();
  const navigation    = useNavigation();
  const { user, profile } = useAuth();
  const { enriched, exceededCount } = useCategoryLimits(user?.uid);

  const [limitInput,    setLimitInput]    = useState('');
  const [limitLoading,  setLimitLoading]  = useState(false);
  const [limitError,    setLimitError]    = useState('');
  const [limitSuccess,  setLimitSuccess]  = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);

  const handleUpdateLimit = async (override) => {
    const raw   = override !== undefined ? String(override) : limitInput;
    const value = parseFloat(raw);
    if (isNaN(value) || value <= 0) { setLimitError('Enter a valid amount greater than ₹0'); return; }
    if (value > 1000000)             { setLimitError('Amount too large'); return; }
    setLimitError('');
    setLimitLoading(true);
    try {
      await updateDailyLimit(user.uid, value);
      setLimitInput('');
      setLimitSuccess(true);
      setTimeout(() => setLimitSuccess(false), 2500);
    } catch { setLimitError('Failed to update. Try again.'); }
    finally  { setLimitLoading(false); }
  };

  const handleLogout = () =>
    Alert.alert('Log Out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out', style: 'destructive',
        onPress: async () => {
          setLogoutLoading(true);
          try { await logoutUser(); }
          catch { Alert.alert('Error', 'Could not log out.'); setLogoutLoading(false); }
        },
      },
    ]);

  const SectionLabel = ({ title }) => (
    <Text style={[S.sectionLabel, { color: Colors.textSecondary }]}>{title}</Text>
  );

  const NavRow = ({ emoji, label, sub, badge, onPress }) => (
    <TouchableOpacity onPress={onPress}
      style={[S.navRow, { borderBottomColor: Colors.border }]} activeOpacity={0.7}>
      <Text style={S.navEmoji}>{emoji}</Text>
      <View style={S.navMid}>
        <Text style={[S.navLabel, { color: Colors.textPrimary }]}>{label}</Text>
        {sub ? <Text style={[S.navSub, { color: Colors.textMuted }]}>{sub}</Text> : null}
      </View>
      {badge ? (
        <View style={[S.badge, { backgroundColor: Colors.danger + '22' }]}>
          <Text style={[S.badgeText, { color: Colors.danger }]}>{badge}</Text>
        </View>
      ) : null}
      <Text style={[S.arrow, { color: Colors.textMuted }]}>›</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[S.safe, { backgroundColor: Colors.bg }]} edges={['top']}>
      <ScrollView contentContainerStyle={S.container} showsVerticalScrollIndicator={false}>

        <Text style={[S.title, { color: Colors.textPrimary }]}>Settings</Text>

        {/* Profile */}
        <SectionLabel title="Profile" />
        <View style={[S.card, { backgroundColor: Colors.bgCard, borderColor: Colors.border }]}>
          <View style={S.profileRow}>
            <View style={[S.avatar, { backgroundColor: Colors.accent }]}>
              <Text style={[S.avatarText, { color: Colors.black }]}>
                {profile?.name?.charAt(0)?.toUpperCase() || '?'}
              </Text>
            </View>
            <View>
              <Text style={[S.profileName, { color: Colors.textPrimary }]}>{profile?.name || 'User'}</Text>
              <Text style={[S.profileEmail, { color: Colors.textSecondary }]}>{profile?.email || user?.email}</Text>
            </View>
          </View>
        </View>

        {/* Budget & Limits */}
        <SectionLabel title="Budget & Limits" />
        <View style={[S.navCard, { backgroundColor: Colors.bgCard, borderColor: Colors.border }]}>
          <NavRow
            emoji="🎯"
            label="Category Budgets"
            sub={enriched.length > 0 ? `${enriched.length} budget${enriched.length > 1 ? 's' : ''} active` : 'Tap to set spending limits'}
            badge={exceededCount > 0 ? `${exceededCount} exceeded` : null}
            onPress={() => navigation.navigate('CategoryLimits')}
          />
          <NavRow
            emoji="📤"
            label="Export Data"
            sub="PDF and CSV — share or download your reports"
            onPress={() => navigation.navigate('Export')}
          />
          <NavRow
            emoji="👨\u200d👩\u200d👧\u200d👦"
            label="Family"
            sub={profile?.familyId ? `Member of ${profile?.familyName || 'a family'}` : 'Create or join a family'}
            badge={profile?.role === 'head' ? '👑 Head' : profile?.familyId ? '👤 Member' : null}
            onPress={() => navigation.navigate('Family')}
          />
        </View>

        {/* Daily limit */}
        <SectionLabel title="Daily Spending Limit" />
        <View style={[S.card, { backgroundColor: Colors.bgCard, borderColor: Colors.border }]}>
          <Text style={[S.limitCurrent, { color: Colors.textSecondary }]}>
            Current: <Text style={[S.limitCurrentVal, { color: Colors.accent }]}>{formatCurrency(profile?.dailyLimit || 0)}</Text>/day
          </Text>

          <View style={S.presetRow}>
            {LIMIT_PRESETS.map((p) => (
              <TouchableOpacity key={p} onPress={() => handleUpdateLimit(p)}
                style={[S.preset,
                  { borderColor: Colors.border, backgroundColor: Colors.bgCardHover },
                  profile?.dailyLimit === p && { backgroundColor: Colors.accent, borderColor: Colors.accent },
                ]}>
                <Text style={[S.presetText,
                  { color: profile?.dailyLimit === p ? Colors.black : Colors.textSecondary }]}>
                  ₹{p}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[S.customLabel, { color: Colors.textSecondary }]}>Custom amount</Text>
          <View style={[S.inputRow, { backgroundColor: Colors.bgCardHover, borderColor: Colors.border }]}>
            <Text style={[S.rupee, { color: Colors.accent }]}>₹</Text>
            <TextInput
              style={[S.limitInput, { color: Colors.textPrimary }]}
              value={limitInput}
              onChangeText={(v) => { setLimitInput(v); setLimitError(''); setLimitSuccess(false); }}
              placeholder="e.g. 750"
              placeholderTextColor={Colors.textMuted}
              keyboardType="numeric"
              returnKeyType="done"
              onSubmitEditing={() => handleUpdateLimit()}
            />
            <Button title="Set" onPress={() => handleUpdateLimit()} loading={limitLoading}
              disabled={!limitInput.trim()} style={S.setBtn} />
          </View>

          <ErrorText message={limitError} />
          {limitSuccess && <Text style={[S.successText, { color: Colors.safe }]}>✅ Daily limit updated!</Text>}
        </View>

        {/* Appearance */}
        <SectionLabel title="Appearance" />
        <View style={[S.card, { backgroundColor: Colors.bgCard, borderColor: Colors.border }]}>
          <ThemeToggle />
        </View>

        {/* About */}
        <SectionLabel title="About" />
        <View style={[S.card, { backgroundColor: Colors.bgCard, borderColor: Colors.border }]}>
          {[{ l: 'Version', v: '3.0.0' }, { l: 'Made for', v: 'India 🇮🇳' }].map(({ l, v }, i, arr) => (
            <React.Fragment key={l}>
              <View style={S.infoRow}>
                <Text style={[S.infoLabel, { color: Colors.textSecondary }]}>{l}</Text>
                <Text style={[S.infoValue, { color: Colors.textPrimary }]}>{v}</Text>
              </View>
              {i < arr.length - 1 && <Divider />}
            </React.Fragment>
          ))}
        </View>

        <Button
          title={logoutLoading ? 'Logging out…' : 'Log Out'}
          variant="danger"
          onPress={handleLogout}
          loading={logoutLoading}
          style={{ marginTop: Spacing.xl }}
        />
      </ScrollView>
    </SafeAreaView>
  );
};

const S = StyleSheet.create({
  safe:         { flex: 1 },
  container:    { paddingHorizontal: Spacing.base, paddingBottom: Spacing['3xl'] },
  title:        { fontSize: Typography['2xl'], fontWeight: '900', marginTop: Spacing.lg, marginBottom: Spacing.xs },
  sectionLabel: { fontSize: Typography.xs, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginTop: Spacing.lg, marginBottom: Spacing.sm },

  card:        { borderRadius: Radius.xl, borderWidth: 1, padding: Spacing.base, marginBottom: Spacing.xs },
  profileRow:  { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  avatar:      { width: 52, height: 52, borderRadius: Radius.full, alignItems: 'center', justifyContent: 'center' },
  avatarText:  { fontSize: Typography.xl, fontWeight: '900' },
  profileName: { fontSize: Typography.md, fontWeight: '700' },
  profileEmail:{ fontSize: Typography.sm, marginTop: 2 },

  navCard:   { borderRadius: Radius.xl, borderWidth: 1, overflow: 'hidden', marginBottom: Spacing.xs },
  navRow:    { flexDirection: 'row', alignItems: 'center', padding: Spacing.base, borderBottomWidth: 1 },
  navEmoji:  { fontSize: 22, marginRight: Spacing.md },
  navMid:    { flex: 1 },
  navLabel:  { fontSize: Typography.base, fontWeight: '700' },
  navSub:    { fontSize: Typography.xs, marginTop: 2 },
  badge:     { borderRadius: Radius.full, paddingHorizontal: Spacing.sm, paddingVertical: 2, marginRight: Spacing.sm },
  badgeText: { fontSize: Typography.xs, fontWeight: '800' },
  arrow:     { fontSize: 22, fontWeight: '300' },

  limitCurrent:    { fontSize: Typography.sm, marginBottom: Spacing.md },
  limitCurrentVal: { fontWeight: '700', fontSize: Typography.base },
  presetRow:       { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.md },
  preset:          { paddingVertical: Spacing.xs, paddingHorizontal: Spacing.md, borderRadius: Radius.full, borderWidth: 1 },
  presetText:      { fontSize: Typography.sm, fontWeight: '600' },
  customLabel:     { fontSize: Typography.xs, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: Spacing.sm },
  inputRow:        { flexDirection: 'row', alignItems: 'center', borderRadius: Radius.md, borderWidth: 1, paddingHorizontal: Spacing.md, marginBottom: Spacing.sm },
  rupee:           { fontSize: Typography.xl, fontWeight: '800', marginRight: Spacing.sm },
  limitInput:      { flex: 1, fontSize: Typography.xl, fontWeight: '700', paddingVertical: Spacing.md },
  setBtn:          { paddingHorizontal: Spacing.base, paddingVertical: Spacing.sm, minHeight: 0, height: 40 },
  successText:     { fontSize: Typography.sm, fontWeight: '600', marginTop: Spacing.sm },

  infoRow:   { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: Spacing.xs },
  infoLabel: { fontSize: Typography.sm },
  infoValue: { fontSize: Typography.sm, fontWeight: '600' },
});

export default SettingsScreen;
