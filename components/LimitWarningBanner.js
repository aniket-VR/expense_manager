// components/LimitWarningBanner.js
import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { Typography, Spacing, Radius } from '../utils/theme';
import { formatCurrency } from '../utils/formatters';

const LimitWarningBanner = ({ exceeded, overage }) => {
  const { Colors } = useTheme();
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!exceeded) return;
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.82, duration: 750, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1,    duration: 750, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [exceeded]);

  if (!exceeded) return null;

  return (
    <Animated.View style={[
      styles.banner,
      {
        backgroundColor: Colors.dangerBg,
        borderLeftColor: Colors.danger,
        opacity: pulse,
      },
    ]}>
      <Text style={styles.icon}>🚨</Text>
      <View style={styles.textGroup}>
        <Text style={[styles.title, { color: Colors.danger }]}>Daily Limit Exceeded!</Text>
        <Text style={[styles.sub, { color: Colors.danger }]}>
          You're over by {formatCurrency(overage)}
        </Text>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginHorizontal: Spacing.base,
    marginBottom: Spacing.base,
    borderLeftWidth: 4,
  },
  icon: { fontSize: 24, marginRight: Spacing.md },
  textGroup: { flex: 1 },
  title: { fontSize: Typography.base, fontWeight: '700' },
  sub: { fontSize: Typography.sm, opacity: 0.85, marginTop: 2 },
});

export default LimitWarningBanner;
