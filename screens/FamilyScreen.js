// screens/FamilyScreen.js
// ─────────────────────────────────────────────────────────
// Family Expense Management screen.
//
// State machine (4 views):
//   NO_FAMILY   → prompt to create or join
//   CREATE      → enter family name
//   JOIN        → enter invite code
//   DASHBOARD   → family overview (adapts to role)
//
// Head sees:    member list, invite management, full analytics
// Member sees:  family overview, own contribution, leave option
// ─────────────────────────────────────────────────────────

import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, TextInput, StyleSheet, ScrollView,
  TouchableOpacity, Alert, Share, Clipboard,
  ActivityIndicator, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme }       from '../context/ThemeContext';
import { Typography, Spacing, Radius } from '../utils/theme';
import { formatCurrency } from '../utils/formatters';
import { getCategoryMeta } from '../utils/constants';
import {
  createFamily, joinFamilyWithCode,
  createInvite, revokeInvite,
  removeMember, leaveFamily, deleteFamily, updateFamilyName,
} from '../services/familyService';
import { Button, Card, ErrorText, LoadingOverlay, EmptyState } from '../components/UI';
import useAuth              from '../hooks/useAuth';
import useFamily            from '../hooks/useFamily';
import useFamilyTransactions from '../hooks/useFamilyTransactions';

const SCREEN_W = Dimensions.get('window').width;
const PERIODS  = [
  { key: 'week',  label: 'Week'  },
  { key: 'month', label: 'Month' },
  { key: 'year',  label: 'Year'  },
];

// ── Small reusable sub-components ────────────────────────

const SectionTitle = ({ title, Colors }) => (
  <Text style={[SS.sectionTitle, { color: Colors.textSecondary }]}>{title}</Text>
);

const MemberRow = ({ member, isCurrentUser, isHead, onRemove, Colors }) => {
  const roleColor = member.role === 'head' ? Colors.accent : Colors.safe;
  return (
    <View style={[SS.memberRow, { borderBottomColor: Colors.border }]}>
      <View style={[SS.memberAvatar, { backgroundColor: roleColor + '22' }]}>
        <Text style={[SS.memberInitial, { color: roleColor }]}>
          {(member.name || member.email || '?').charAt(0).toUpperCase()}
        </Text>
      </View>
      <View style={SS.memberInfo}>
        <Text style={[SS.memberName, { color: Colors.textPrimary }]}>
          {member.name || 'Unknown'}
          {isCurrentUser ? '  (you)' : ''}
        </Text>
        <Text style={[SS.memberEmail, { color: Colors.textMuted }]}>{member.email}</Text>
      </View>
      <View style={[SS.roleBadge, { backgroundColor: roleColor + '22' }]}>
        <Text style={[SS.roleText, { color: roleColor }]}>
          {member.role === 'head' ? '👑 Head' : '👤 Member'}
        </Text>
      </View>
      {isHead && !isCurrentUser && member.role !== 'head' && (
        <TouchableOpacity onPress={() => onRemove(member)} style={SS.removeBtn}>
          <Text style={[SS.removeText, { color: Colors.danger }]}>✕</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const InviteRow = ({ invite, onRevoke, Colors }) => {
  const expiresAt = invite.expiresAt?.toDate?.() ?? new Date();
  const daysLeft  = Math.max(0, Math.ceil((expiresAt - new Date()) / 86400000));

  const handleCopy = () => {
    Clipboard.setString(invite.code);
    Alert.alert('Copied!', `Invite code ${invite.code} copied to clipboard.`);
  };

  const handleShare = () => {
    Share.share({
      message: `Join my family on Fast Expense Tracker!\nUse invite code: ${invite.code}\n(Valid for ${daysLeft} more day${daysLeft !== 1 ? 's' : ''})`,
    });
  };

  return (
    <View style={[SS.inviteRow, { backgroundColor: Colors.bgCardHover, borderColor: Colors.border }]}>
      <View style={SS.inviteLeft}>
        <Text style={[SS.inviteCode, { color: Colors.accent, letterSpacing: 3 }]}>
          {invite.code}
        </Text>
        <Text style={[SS.inviteExpiry, { color: Colors.textMuted }]}>
          Expires in {daysLeft} day{daysLeft !== 1 ? 's' : ''}
        </Text>
      </View>
      <View style={SS.inviteActions}>
        <TouchableOpacity onPress={handleCopy}
          style={[SS.inviteBtn, { borderColor: Colors.border }]}>
          <Text style={[SS.inviteBtnText, { color: Colors.textSecondary }]}>Copy</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleShare}
          style={[SS.inviteBtn, { borderColor: Colors.accent, backgroundColor: Colors.accentDim }]}>
          <Text style={[SS.inviteBtnText, { color: Colors.accent }]}>Share</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => onRevoke(invite.code)}
          style={[SS.inviteBtn, { borderColor: Colors.dangerDim }]}>
          <Text style={[SS.inviteBtnText, { color: Colors.danger }]}>Revoke</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// ── NO FAMILY: Create / Join onboarding ──────────────────

const NoFamilyView = ({ userId, userName, onCreated, onJoined, Colors }) => {
  const [view,       setView]       = useState('home'); // 'home'|'create'|'join'
  const [familyName, setFamilyName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState('');

  const handleCreate = async () => {
    if (!familyName.trim()) { setError('Enter a family name'); return; }
    setLoading(true); setError('');
    try {
      const familyId = await createFamily(userId, userName, familyName.trim());
      onCreated(familyId);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    setLoading(true); setError('');
    try {
      await joinFamilyWithCode(userId, inviteCode);
      onJoined();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  if (view === 'create') {
    return (
      <View style={NF.container}>
        <Text style={[NF.title, { color: Colors.textPrimary }]}>Create Family</Text>
        <Text style={[NF.sub, { color: Colors.textSecondary }]}>
          You'll be the Head — you can invite members and see everyone's spending.
        </Text>
        <TextInput
          style={[NF.input, { backgroundColor: Colors.bgCard, borderColor: Colors.border, color: Colors.textPrimary }]}
          value={familyName}
          onChangeText={(v) => { setFamilyName(v); setError(''); }}
          placeholder="e.g. The Sharma Family"
          placeholderTextColor={Colors.textMuted}
          autoCapitalize="words"
          autoFocus
          maxLength={40}
        />
        <ErrorText message={error} />
        <Button title="Create Family" onPress={handleCreate} loading={loading} style={{ marginTop: Spacing.sm }} />
        <Button title="Cancel" variant="ghost" onPress={() => { setView('home'); setError(''); }} style={{ marginTop: Spacing.sm }} />
      </View>
    );
  }

  if (view === 'join') {
    return (
      <View style={NF.container}>
        <Text style={[NF.title, { color: Colors.textPrimary }]}>Join a Family</Text>
        <Text style={[NF.sub, { color: Colors.textSecondary }]}>
          Enter the 8-character invite code shared by the family head.
        </Text>
        <TextInput
          style={[NF.input, NF.codeInput, { backgroundColor: Colors.bgCard, borderColor: Colors.accent, color: Colors.accent }]}
          value={inviteCode}
          onChangeText={(v) => { setInviteCode(v.toUpperCase()); setError(''); }}
          placeholder="ABCD1234"
          placeholderTextColor={Colors.textMuted}
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={8}
          autoFocus
        />
        <ErrorText message={error} />
        <Button title="Join Family" onPress={handleJoin} loading={loading} style={{ marginTop: Spacing.sm }} />
        <Button title="Cancel" variant="ghost" onPress={() => { setView('home'); setError(''); }} style={{ marginTop: Spacing.sm }} />
      </View>
    );
  }

  return (
    <View style={NF.container}>
      <Text style={NF.heroEmoji}>👨‍👩‍👧‍👦</Text>
      <Text style={[NF.title, { color: Colors.textPrimary }]}>Family Expenses</Text>
      <Text style={[NF.sub, { color: Colors.textSecondary }]}>
        Track spending together. The Head sees everyone's transactions. Members see their own.
      </Text>

      {[
        { emoji: '👑', label: 'Head sees all family transactions & analytics' },
        { emoji: '👤', label: 'Members see only their own transactions' },
        { emoji: '🔗', label: 'Invite members with a shareable code' },
        { emoji: '📊', label: 'Combined analytics and category breakdown' },
      ].map((f) => (
        <View key={f.label} style={[NF.featureRow, { backgroundColor: Colors.bgCard, borderColor: Colors.border }]}>
          <Text style={{ fontSize: 20 }}>{f.emoji}</Text>
          <Text style={[NF.featureText, { color: Colors.textSecondary }]}>{f.label}</Text>
        </View>
      ))}

      <Button title="👑  Create a Family" onPress={() => setView('create')} style={{ marginTop: Spacing.xl }} />
      <Button
        title="🔗  Join with Invite Code"
        variant="secondary"
        onPress={() => setView('join')}
        style={{ marginTop: Spacing.sm, borderColor: Colors.border, borderWidth: 1 }}
      />
    </View>
  );
};

const NF = StyleSheet.create({
  container: { flex: 1, padding: Spacing.xl },
  heroEmoji: { fontSize: 64, textAlign: 'center', marginBottom: Spacing.md },
  title:     { fontSize: Typography['2xl'], fontWeight: '900', textAlign: 'center', marginBottom: Spacing.sm },
  sub:       { fontSize: Typography.sm, textAlign: 'center', lineHeight: 22, marginBottom: Spacing.xl },
  input:     {
    borderWidth: 1.5, borderRadius: Radius.md, padding: Spacing.base,
    fontSize: Typography.base, marginBottom: Spacing.sm,
  },
  codeInput: {
    fontSize: Typography['2xl'], fontWeight: '900', textAlign: 'center',
    letterSpacing: 6, paddingVertical: Spacing.lg,
  },
  featureRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    borderRadius: Radius.md, borderWidth: 1, padding: Spacing.md, marginBottom: Spacing.sm,
  },
  featureText: { flex: 1, fontSize: Typography.sm, lineHeight: 20 },
});

// ── DASHBOARD ─────────────────────────────────────────────

const FamilyDashboard = ({ user, profile, family, members, invites, isHead, Colors }) => {
  const [period,         setPeriod]         = useState('month');
  const [generatingCode, setGeneratingCode] = useState(false);
  const [editingName,    setEditingName]    = useState(false);
  const [newName,        setNewName]        = useState('');
  const [nameError,      setNameError]      = useState('');

  const { transactions, totalExpense, totalIncome, balance, byCategory, byMember, loading } =
    useFamilyTransactions(user.uid, family?.familyId, profile?.role, period);

  const myStats   = byMember[user.uid] || { expense: 0, income: 0, count: 0 };
  const myShare   = totalExpense > 0 ? (myStats.expense / totalExpense) * 100 : 0;
  const savingsRate = totalIncome > 0 ? (balance / totalIncome) * 100 : 0;

  const memberMap = {};
  members.forEach((m) => { memberMap[m.userId || m.id] = m; });

  const handleGenerateInvite = async () => {
    setGeneratingCode(true);
    try {
      const code = await createInvite(
        family.familyId,
        family.familyName,
        user.uid,
        profile?.name
      );
      Alert.alert('Invite Code Created', `Share this code:\n\n${code}\n\nValid for 7 days.`, [
        { text: 'Copy', onPress: () => Clipboard.setString(code) },
        { text: 'Share', onPress: () => Share.share({ message: `Join ${family.familyName} on Fast Expense Tracker! Code: ${code}` }) },
        { text: 'OK' },
      ]);
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setGeneratingCode(false);
    }
  };

  const handleRevokeInvite = (code) => {
    Alert.alert('Revoke Invite', `Revoke code ${code}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Revoke', style: 'destructive', onPress: () => revokeInvite(code) },
    ]);
  };

  const handleRemoveMember = (member) => {
    Alert.alert(
      'Remove Member',
      `Remove ${member.name} from the family? Their transactions will be preserved.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: () => removeMember(member.userId || member.id) },
      ]
    );
  };

  const handleLeave = () => {
    Alert.alert(
      'Leave Family',
      `Leave ${family?.familyName}? You'll lose access to family analytics.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Leave', style: 'destructive', onPress: () => leaveFamily(user.uid) },
      ]
    );
  };

  const handleDeleteFamily = () => {
    Alert.alert(
      'Delete Family',
      `Permanently delete "${family?.familyName}"? All members will be removed. This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try { await deleteFamily(family.familyId); }
            catch (e) { Alert.alert('Error', e.message); }
          },
        },
      ]
    );
  };

  const handleSaveName = async () => {
    if (!newName.trim()) { setNameError('Enter a name'); return; }
    try {
      await updateFamilyName(family.familyId, newName.trim());
      setEditingName(false);
      setNameError('');
    } catch (e) {
      setNameError(e.message);
    }
  };

  return (
    <ScrollView contentContainerStyle={DB.container} showsVerticalScrollIndicator={false}>

      {/* ── Family hero card ── */}
      <View style={[DB.heroCard, { backgroundColor: Colors.bgCard, borderColor: Colors.border }]}>
        <View style={DB.heroTop}>
          {editingName ? (
            <View style={DB.editNameRow}>
              <TextInput
                style={[DB.editNameInput, { color: Colors.textPrimary, borderColor: Colors.accent }]}
                value={newName}
                onChangeText={setNewName}
                autoFocus
                maxLength={40}
              />
              <TouchableOpacity onPress={handleSaveName} style={[DB.editSave, { backgroundColor: Colors.accent }]}>
                <Text style={[DB.editSaveText, { color: Colors.black }]}>Save</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => { setEditingName(false); setNameError(''); }}>
                <Text style={[DB.editCancel, { color: Colors.textMuted }]}>✕</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              onPress={isHead ? () => { setNewName(family?.familyName || ''); setEditingName(true); } : undefined}
              activeOpacity={isHead ? 0.7 : 1}
              style={DB.familyNameRow}
            >
              <Text style={DB.heroEmoji}>👨‍👩‍👧‍👦</Text>
              <Text style={[DB.familyName, { color: Colors.textPrimary }]}>{family?.familyName}</Text>
              {isHead && <Text style={[DB.editHint, { color: Colors.textMuted }]}> ✏️</Text>}
            </TouchableOpacity>
          )}
          {nameError ? <Text style={[{ color: Colors.danger, fontSize: Typography.xs }]}>{nameError}</Text> : null}
          <Text style={[DB.memberCount, { color: Colors.textMuted }]}>
            {members.length} member{members.length !== 1 ? 's' : ''} ·{' '}
            <Text style={[{ color: isHead ? Colors.accent : Colors.safe }]}>
              {isHead ? '👑 Head' : '👤 Member'}
            </Text>
          </Text>
        </View>

        {/* Period selector */}
        <View style={[DB.periodRow, { backgroundColor: Colors.bgCardHover }]}>
          {PERIODS.map((p) => (
            <TouchableOpacity
              key={p.key}
              onPress={() => setPeriod(p.key)}
              style={[DB.periodBtn, period === p.key && { backgroundColor: Colors.accent }]}
            >
              <Text style={[DB.periodLabel, { color: period === p.key ? Colors.black : Colors.textSecondary }]}>
                {p.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* ── Financial summary ── */}
      <View style={DB.statsGrid}>
        {[
          { label: 'Family Income',  value: formatCurrency(totalIncome),  color: Colors.safe,   emoji: '📥' },
          { label: 'Family Expense', value: formatCurrency(totalExpense), color: Colors.danger, emoji: '📤' },
          { label: 'Net Balance',    value: formatCurrency(balance),      color: balance >= 0 ? Colors.safe : Colors.danger, emoji: balance >= 0 ? '💰' : '⚠️' },
          { label: 'Savings Rate',   value: `${Math.max(savingsRate,0).toFixed(1)}%`, color: savingsRate >= 20 ? Colors.safe : Colors.warning, emoji: '📊' },
        ].map((s) => (
          <View key={s.label} style={[DB.statCard, { backgroundColor: Colors.bgCard, borderColor: Colors.border }]}>
            <Text style={{ fontSize: 22, marginBottom: 4 }}>{s.emoji}</Text>
            <Text style={[DB.statLabel, { color: Colors.textMuted }]}>{s.label}</Text>
            <Text style={[DB.statValue, { color: s.color }]}>{s.value}</Text>
          </View>
        ))}
      </View>

      {/* ── My contribution (member view) ── */}
      {!isHead && (
        <>
          <SectionTitle title="My Contribution" Colors={Colors} />
          <View style={[DB.contributionCard, { backgroundColor: Colors.bgCard, borderColor: Colors.border }]}>
            <View style={DB.contribRow}>
              <View style={DB.contribStat}>
                <Text style={[DB.contribLabel, { color: Colors.textMuted }]}>My Expense</Text>
                <Text style={[DB.contribValue, { color: Colors.danger }]}>{formatCurrency(myStats.expense)}</Text>
              </View>
              <View style={[DB.contribDiv, { backgroundColor: Colors.border }]} />
              <View style={DB.contribStat}>
                <Text style={[DB.contribLabel, { color: Colors.textMuted }]}>My Income</Text>
                <Text style={[DB.contribValue, { color: Colors.safe }]}>{formatCurrency(myStats.income)}</Text>
              </View>
              <View style={[DB.contribDiv, { backgroundColor: Colors.border }]} />
              <View style={DB.contribStat}>
                <Text style={[DB.contribLabel, { color: Colors.textMuted }]}>Family Share</Text>
                <Text style={[DB.contribValue, { color: Colors.accent }]}>{myShare.toFixed(1)}%</Text>
              </View>
            </View>
            <View style={[DB.shareTrack, { backgroundColor: Colors.bgCardHover }]}>
              <View style={[DB.shareFill, { width: `${Math.min(myShare, 100)}%`, backgroundColor: Colors.accent }]} />
            </View>
          </View>
        </>
      )}

      {/* ── Per-member breakdown (head only) ── */}
      {isHead && members.length > 1 && (
        <>
          <SectionTitle title="Member Breakdown" Colors={Colors} />
          <View style={[DB.membersBreakCard, { backgroundColor: Colors.bgCard, borderColor: Colors.border }]}>
            {members.map((member) => {
              const uid      = member.userId || member.id;
              const stats    = byMember[uid] || { expense: 0, income: 0, count: 0 };
              const share    = totalExpense > 0 ? (stats.expense / totalExpense) * 100 : 0;
              const roleColor = member.role === 'head' ? Colors.accent : Colors.safe;
              return (
                <View key={uid} style={[DB.memberBreakRow, { borderBottomColor: Colors.border }]}>
                  <View style={[DB.memberBreakAvatar, { backgroundColor: roleColor + '22' }]}>
                    <Text style={[DB.memberBreakInitial, { color: roleColor }]}>
                      {(member.name || '?').charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={DB.memberBreakMid}>
                    <Text style={[DB.memberBreakName, { color: Colors.textPrimary }]}>{member.name}</Text>
                    <View style={[DB.memberBreakTrack, { backgroundColor: Colors.bgCardHover }]}>
                      <View style={[DB.memberBreakFill, { width: `${Math.min(share, 100)}%`, backgroundColor: Colors.danger }]} />
                    </View>
                  </View>
                  <View style={DB.memberBreakRight}>
                    <Text style={[DB.memberBreakExp, { color: Colors.danger }]}>{formatCurrency(stats.expense)}</Text>
                    <Text style={[DB.memberBreakShare, { color: Colors.textMuted }]}>{share.toFixed(1)}%</Text>
                  </View>
                </View>
              );
            })}
          </View>
        </>
      )}

      {/* ── Top categories ── */}
      {byCategory.length > 0 && (
        <>
          <SectionTitle title="Top Categories" Colors={Colors} />
          <View style={[DB.catCard, { backgroundColor: Colors.bgCard, borderColor: Colors.border }]}>
            {byCategory.slice(0, 6).map((row) => {
              const meta = getCategoryMeta(row.category, 'expense');
              const pct  = totalExpense > 0 ? (row.total / totalExpense) * 100 : 0;
              return (
                <View key={row.category} style={[DB.catRow, { borderBottomColor: Colors.border }]}>
                  <View style={[DB.catIcon, { backgroundColor: (meta.color || Colors.danger) + '22' }]}>
                    <Text style={{ fontSize: 16 }}>{meta.emoji}</Text>
                  </View>
                  <View style={DB.catMid}>
                    <View style={DB.catLabelRow}>
                      <Text style={[DB.catName, { color: Colors.textPrimary }]}>{meta.name}</Text>
                      <Text style={[DB.catPct, { color: Colors.textMuted }]}>{pct.toFixed(1)}%</Text>
                    </View>
                    <View style={[DB.catTrack, { backgroundColor: Colors.bgCardHover }]}>
                      <View style={[DB.catFill, { width: `${pct}%`, backgroundColor: meta.color || Colors.danger }]} />
                    </View>
                  </View>
                  <Text style={[DB.catAmt, { color: Colors.danger }]}>{formatCurrency(row.total)}</Text>
                </View>
              );
            })}
          </View>
        </>
      )}

      {/* ── Members list ── */}
      <SectionTitle title="Members" Colors={Colors} />
      <View style={[DB.membersCard, { backgroundColor: Colors.bgCard, borderColor: Colors.border }]}>
        {members.map((member) => (
          <MemberRow
            key={member.userId || member.id}
            member={member}
            isCurrentUser={(member.userId || member.id) === user.uid}
            isHead={isHead}
            onRemove={handleRemoveMember}
            Colors={Colors}
          />
        ))}
      </View>

      {/* ── Invites section (Head only) ── */}
      {isHead && (
        <>
          <SectionTitle title="Invite Members" Colors={Colors} />
          <Button
            title={generatingCode ? 'Generating…' : '🔗  Generate Invite Code'}
            onPress={handleGenerateInvite}
            loading={generatingCode}
            style={{ marginBottom: Spacing.sm }}
          />
          {invites.length > 0 && (
            <View style={DB.inviteList}>
              {invites.map((inv) => (
                <InviteRow key={inv.code} invite={inv} onRevoke={handleRevokeInvite} Colors={Colors} />
              ))}
            </View>
          )}
        </>
      )}

      {/* ── Danger zone ── */}
      <SectionTitle title={isHead ? 'Danger Zone' : 'Leave Family'} Colors={Colors} />
      {!isHead && (
        <Button
          title="Leave Family"
          variant="danger"
          onPress={handleLeave}
          style={{ marginBottom: Spacing.sm }}
        />
      )}
      {isHead && (
        <TouchableOpacity
          onPress={handleDeleteFamily}
          style={[DB.dangerBtn, { borderColor: Colors.danger }]}
        >
          <Text style={[DB.dangerText, { color: Colors.danger }]}>🗑️  Delete Family</Text>
          <Text style={[DB.dangerSub, { color: Colors.danger }]}>
            Removes all members. Cannot be undone.
          </Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
};

// ── Styles: Dashboard ─────────────────────────────────────
const DB = StyleSheet.create({
  container: { padding: Spacing.base, paddingBottom: Spacing['3xl'] },

  heroCard: { borderRadius: Radius.xl, borderWidth: 1, marginBottom: Spacing.md, overflow: 'hidden' },
  heroTop:  { padding: Spacing.base, paddingBottom: Spacing.sm },
  familyNameRow:  { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  heroEmoji:      { fontSize: 24, marginRight: Spacing.sm },
  familyName:     { fontSize: Typography.xl, fontWeight: '900', flex: 1 },
  editHint:       { fontSize: Typography.sm },
  memberCount:    { fontSize: Typography.sm },
  editNameRow:    { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: 4 },
  editNameInput:  { flex: 1, borderWidth: 1.5, borderRadius: Radius.md, padding: Spacing.sm, fontSize: Typography.base, fontWeight: '700' },
  editSave:       { borderRadius: Radius.md, paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs },
  editSaveText:   { fontSize: Typography.sm, fontWeight: '700' },
  editCancel:     { fontSize: 18, paddingHorizontal: Spacing.xs },

  periodRow: { flexDirection: 'row', margin: Spacing.sm, borderRadius: Radius.md, overflow: 'hidden', padding: 3 },
  periodBtn:  { flex: 1, alignItems: 'center', paddingVertical: Spacing.xs, borderRadius: Radius.sm },
  periodLabel:{ fontSize: Typography.sm, fontWeight: '700' },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.md },
  statCard:  { width: '47.5%', borderRadius: Radius.lg, borderWidth: 1, padding: Spacing.md, alignItems: 'center' },
  statLabel: { fontSize: Typography.xs, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.6, textAlign: 'center' },
  statValue: { fontSize: Typography.lg, fontWeight: '900', marginTop: 2, textAlign: 'center' },

  sectionTitle: { fontSize: Typography.xs, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: Spacing.sm, marginTop: Spacing.md },

  contributionCard: { borderRadius: Radius.xl, borderWidth: 1, padding: Spacing.base, marginBottom: Spacing.md },
  contribRow:  { flexDirection: 'row', marginBottom: Spacing.md },
  contribStat: { flex: 1, alignItems: 'center' },
  contribDiv:  { width: 1, marginHorizontal: Spacing.xs },
  contribLabel:{ fontSize: Typography.xs, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.6 },
  contribValue:{ fontSize: Typography.md, fontWeight: '900', marginTop: 2 },
  shareTrack:  { height: 6, borderRadius: 3, overflow: 'hidden' },
  shareFill:   { height: '100%', borderRadius: 3 },

  membersBreakCard:   { borderRadius: Radius.xl, borderWidth: 1, overflow: 'hidden', marginBottom: Spacing.md },
  memberBreakRow:     { flexDirection: 'row', alignItems: 'center', padding: Spacing.base, borderBottomWidth: 1 },
  memberBreakAvatar:  { width: 36, height: 36, borderRadius: Radius.full, alignItems: 'center', justifyContent: 'center', marginRight: Spacing.md },
  memberBreakInitial: { fontSize: Typography.base, fontWeight: '900' },
  memberBreakMid:     { flex: 1 },
  memberBreakName:    { fontSize: Typography.sm, fontWeight: '700', marginBottom: 4 },
  memberBreakTrack:   { height: 5, borderRadius: 3, overflow: 'hidden' },
  memberBreakFill:    { height: '100%', borderRadius: 3 },
  memberBreakRight:   { alignItems: 'flex-end', marginLeft: Spacing.md },
  memberBreakExp:     { fontSize: Typography.sm, fontWeight: '800' },
  memberBreakShare:   { fontSize: Typography.xs, marginTop: 1 },

  catCard:   { borderRadius: Radius.xl, borderWidth: 1, overflow: 'hidden', marginBottom: Spacing.md },
  catRow:    { flexDirection: 'row', alignItems: 'center', padding: Spacing.base, borderBottomWidth: 1 },
  catIcon:   { width: 32, height: 32, borderRadius: Radius.sm, alignItems: 'center', justifyContent: 'center', marginRight: Spacing.sm },
  catMid:    { flex: 1 },
  catLabelRow:{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  catName:   { fontSize: Typography.sm, fontWeight: '600' },
  catPct:    { fontSize: Typography.xs },
  catTrack:  { height: 4, borderRadius: 2, overflow: 'hidden' },
  catFill:   { height: '100%', borderRadius: 2 },
  catAmt:    { fontSize: Typography.sm, fontWeight: '800', marginLeft: Spacing.sm },

  membersCard: { borderRadius: Radius.xl, borderWidth: 1, overflow: 'hidden', marginBottom: Spacing.md },

  inviteList: { marginBottom: Spacing.md },

  dangerBtn: { borderWidth: 1.5, borderRadius: Radius.lg, padding: Spacing.base, alignItems: 'center', marginBottom: Spacing.md, borderStyle: 'dashed' },
  dangerText: { fontSize: Typography.base, fontWeight: '700' },
  dangerSub:  { fontSize: Typography.xs, marginTop: 4, opacity: 0.75 },
});

// ── Shared sub-component styles ───────────────────────────
const SS = StyleSheet.create({
  sectionTitle: { fontSize: Typography.xs, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: Spacing.sm, marginTop: Spacing.md },

  memberRow:     { flexDirection: 'row', alignItems: 'center', padding: Spacing.base, borderBottomWidth: 1 },
  memberAvatar:  { width: 40, height: 40, borderRadius: Radius.full, alignItems: 'center', justifyContent: 'center', marginRight: Spacing.md },
  memberInitial: { fontSize: Typography.md, fontWeight: '900' },
  memberInfo:    { flex: 1 },
  memberName:    { fontSize: Typography.sm, fontWeight: '700' },
  memberEmail:   { fontSize: Typography.xs, marginTop: 1 },
  roleBadge:     { borderRadius: Radius.full, paddingHorizontal: Spacing.sm, paddingVertical: 2, marginLeft: Spacing.sm },
  roleText:      { fontSize: Typography.xs, fontWeight: '700' },
  removeBtn:     { width: 28, height: 28, alignItems: 'center', justifyContent: 'center', marginLeft: Spacing.xs },
  removeText:    { fontSize: Typography.lg, fontWeight: '900' },

  inviteRow:     { borderRadius: Radius.md, borderWidth: 1, padding: Spacing.md, marginBottom: Spacing.sm },
  inviteLeft:    { marginBottom: Spacing.sm },
  inviteCode:    { fontSize: Typography.xl, fontWeight: '900' },
  inviteExpiry:  { fontSize: Typography.xs, marginTop: 2 },
  inviteActions: { flexDirection: 'row', gap: Spacing.sm },
  inviteBtn:     { flex: 1, borderWidth: 1, borderRadius: Radius.md, paddingVertical: Spacing.xs, alignItems: 'center' },
  inviteBtnText: { fontSize: Typography.sm, fontWeight: '700' },
});

// ── Root screen ───────────────────────────────────────────

const FamilyScreen = () => {
  const { Colors }      = useTheme();
  const { user, profile, loading: authLoading } = useAuth();
  const { family, members, invites, isHead, isMember, loading: familyLoading } = useFamily(profile);

  if (authLoading || familyLoading) return <LoadingOverlay message="Loading family…" />;

  return (
    <SafeAreaView style={[ROOT.safe, { backgroundColor: Colors.bg }]} edges={['top']}>
      {isMember ? (
        <FamilyDashboard
          user={user}
          profile={profile}
          family={family}
          members={members}
          invites={invites}
          isHead={isHead}
          Colors={Colors}
        />
      ) : (
        <ScrollView>
          <NoFamilyView
            userId={user?.uid}
            userName={profile?.name}
            onCreated={() => {}}
            onJoined={() => {}}
            Colors={Colors}
          />
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const ROOT = StyleSheet.create({
  safe: { flex: 1 },
});

export default FamilyScreen;
