import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { fs, cardStyle } from '../../utils/responsive';

export default function TenantListPager({ page, pageSize, totalCount, onPageChange, colors }) {
  const pageCount = Math.max(1, Math.ceil(totalCount / pageSize));
  const firstItem = totalCount === 0 ? 0 : page * pageSize + 1;
  const lastItem = Math.min((page + 1) * pageSize, totalCount);
  const canGoBack = page > 0;
  const canGoForward = page + 1 < pageCount;

  return (
    <View
      style={{
        ...cardStyle,
        backgroundColor: colors.card,
        borderColor: colors.cardBorder,
        paddingHorizontal: 12,
        paddingVertical: 8,
        marginBottom: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="Previous page"
        disabled={!canGoBack}
        onPress={() => onPageChange(page - 1)}
        style={{
          width: 40,
          height: 40,
          borderRadius: 12,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.bg,
          opacity: canGoBack ? 1 : 0.45,
        }}
      >
        <Ionicons name="chevron-back" size={20} color={colors.text} />
      </TouchableOpacity>

      <Text style={{ fontSize: fs(13), color: colors.textSecondary, fontWeight: '700' }}>
        {firstItem}-{lastItem} of {totalCount}
      </Text>

      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="Next page"
        disabled={!canGoForward}
        onPress={() => onPageChange(page + 1)}
        style={{
          width: 40,
          height: 40,
          borderRadius: 12,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.bg,
          opacity: canGoForward ? 1 : 0.45,
        }}
      >
        <Ionicons name="chevron-forward" size={20} color={colors.text} />
      </TouchableOpacity>
    </View>
  );
}
