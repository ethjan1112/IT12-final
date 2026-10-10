import React from 'react';
import { ScrollView, View } from 'react-native';
import { useTheme } from '../utils/ThemeContext';
import { getResponsivePadding, isDesktop, isMobile, spacing } from '../utils/responsive';

export default function ScreenSkeleton({ compact = false }) {
  const { colors } = useTheme();
  const padding = getResponsivePadding();
  const bar = (width, height = 12) => (
    <View style={{ width, height, borderRadius: height / 2, backgroundColor: colors.cardBorder }} />
  );

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ paddingHorizontal: padding, paddingTop: isMobile ? 20 : 32, paddingBottom: 32, alignItems: isDesktop ? 'center' : 'stretch' }}
      showsVerticalScrollIndicator={false}
    >
      <View style={{ width: '100%', maxWidth: isDesktop ? 1180 : '100%' }}>
        <View style={{ marginBottom: spacing.lg, gap: 10 }}>
          {bar('38%', 21)}
          {bar('62%', 12)}
        </View>
        <View style={{ height: compact ? 110 : 170, borderRadius: 20, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.cardBorder, padding: 18, justifyContent: 'space-between', marginBottom: spacing.md }}>
          <View style={{ gap: 10 }}>{bar('34%')}{bar('72%')}</View>
          <View style={{ flexDirection: 'row', gap: 12 }}>{bar('28%', 28)}{bar('28%', 28)}{bar('28%', 28)}</View>
        </View>
        {[0, 1, 2].map((item) => (
          <View key={item} style={{ height: compact ? 82 : 112, borderRadius: 16, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.cardBorder, padding: 16, justifyContent: 'space-between', marginBottom: spacing.md }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 14 }}>{bar('42%')}{bar('20%')}</View>
            <View style={{ gap: 8 }}>{bar('88%', 10)}{bar('64%', 10)}</View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}
