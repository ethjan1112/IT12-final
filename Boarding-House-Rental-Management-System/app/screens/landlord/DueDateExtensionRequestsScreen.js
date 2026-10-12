import ScreenSkeleton from '../../components/ScreenSkeleton';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Modal, RefreshControl, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../utils/ThemeContext';
import { isMobile, getResponsivePadding, fs, spacing, cardStyle } from '../../utils/responsive';
import {
  getPendingDueDateExtensionRequests,
  reviewDueDateExtensionRequest,
} from '../../services/dataService';

export default function DueDateExtensionRequestsScreen({ onRequestReviewed }) {
  const { colors } = useTheme();
  const padding = getResponsivePadding();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processingId, setProcessingId] = useState(null);
  const [error, setError] = useState('');
  const [requestToReject, setRequestToReject] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const loadRequests = async () => {
    try {
      setError('');
      setRequests(await getPendingDueDateExtensionRequests());
    } catch (loadError) {
      console.error('Error loading due-date extension requests:', loadError);
      setError(loadError.message || 'Could not load due-date extension requests.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadRequests();
  }, []);

  const reviewRequest = async (request, decision, reason = '') => {
    const action = decision === 'approved' ? 'approve' : 'reject';
    try {
      setProcessingId(request.id);
      await reviewDueDateExtensionRequest({
        requestId: request.id,
        decision,
        rejectionReason: reason,
      });
      await loadRequests();
      onRequestReviewed?.();
      setRequestToReject(null);
      setRejectionReason('');
    } catch (reviewError) {
      console.error(`Error ${action}ing due-date extension request:`, reviewError);
      Alert.alert('Could not update request', reviewError.message || `Failed to ${action} the request.`);
    } finally {
      setProcessingId(null);
    }
  };

  const confirmReview = (request, decision) => {
    if (decision === 'rejected') {
      setRequestToReject(request);
      setRejectionReason('');
      return;
    }
    const approved = decision === 'approved';
    Alert.alert(
      approved ? 'Approve Extension' : 'Reject Extension',
      approved
        ? `Approve ${request.tenantName}'s request? The invoice due date will change to ${request.requestedDueDate}.`
        : `Reject ${request.tenantName}'s due-date extension request?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: approved ? 'Approve' : 'Reject',
          style: approved ? 'default' : 'destructive',
          onPress: () => reviewRequest(request, decision),
        },
      ],
    );
  };

  if (loading) return <ScreenSkeleton />;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView
        contentContainerStyle={{ padding, paddingTop: isMobile ? 16 : 40, paddingBottom: 36, gap: spacing.md }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
      >
        <View style={{ marginBottom: spacing.sm }}>
          <Text style={{ fontSize: fs(12), fontWeight: '700', letterSpacing: 1.5, color: colors.textSecondary }}>
            LANDLORD PORTAL
          </Text>
          <Text style={{ fontSize: fs(28), fontWeight: '800', color: colors.text, marginTop: 4 }}>
            Due Date Requests
          </Text>
          <Text style={{ fontSize: fs(14), color: colors.textSecondary, marginTop: 4 }}>
            Review tenant requests to extend their payment due dates.
          </Text>
        </View>

        {error ? (
          <View style={{ ...cardStyle, backgroundColor: colors.dangerBg, borderColor: colors.dangerText, padding: 16 }}>
            <Text style={{ color: colors.dangerText, fontSize: fs(14) }}>{error}</Text>
            <TouchableOpacity onPress={loadRequests} style={{ marginTop: 12 }}>
              <Text style={{ color: colors.dangerText, fontWeight: '700' }}>Try again</Text>
            </TouchableOpacity>
          </View>
        ) : requests.length === 0 ? (
          <View style={{ ...cardStyle, backgroundColor: colors.card, borderColor: colors.cardBorder, padding: 36, alignItems: 'center' }}>
            <Ionicons name="checkmark-done-circle-outline" size={52} color={colors.textMuted} />
            <Text style={{ color: colors.text, fontWeight: '700', fontSize: fs(17), marginTop: 12 }}>No pending requests</Text>
            <Text style={{ color: colors.textMuted, fontSize: fs(13), textAlign: 'center', marginTop: 6 }}>
              New tenant extension requests will appear here.
            </Text>
          </View>
        ) : requests.map((request) => {
          const isProcessing = processingId === request.id;
          return (
            <View key={request.id} style={{ ...cardStyle, backgroundColor: colors.card, borderColor: colors.cardBorder, padding: 18 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: colors.warningBg, alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="calendar-outline" size={22} color={colors.warningText} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.text, fontSize: fs(16), fontWeight: '800' }}>{request.tenantName}</Text>
                  <Text style={{ color: colors.textMuted, fontSize: fs(13), marginTop: 3 }}>Room {request.roomNumber}</Text>
                </View>
              </View>

              <View style={{ backgroundColor: colors.bg, borderRadius: 12, padding: 13, marginTop: 16, gap: 8 }}>
                <Text style={{ color: colors.textSecondary, fontSize: fs(13) }}>
                  Current due date: <Text style={{ color: colors.text, fontWeight: '700' }}>{request.currentDueDate}</Text>
                </Text>
                <Text style={{ color: colors.textSecondary, fontSize: fs(13) }}>
                  Requested date: <Text style={{ color: colors.accent, fontWeight: '800' }}>{request.requestedDueDate}</Text>
                </Text>
                {!!request.reason && (
                  <Text style={{ color: colors.textSecondary, fontSize: fs(13), lineHeight: 19 }}>
                    Reason: <Text style={{ color: colors.text }}>{request.reason}</Text>
                  </Text>
                )}
              </View>

              <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
                <TouchableOpacity
                  disabled={isProcessing}
                  onPress={() => confirmReview(request, 'rejected')}
                  style={{ flex: 1, minHeight: 46, borderWidth: 1, borderColor: colors.dangerText, borderRadius: 11, alignItems: 'center', justifyContent: 'center', opacity: isProcessing ? 0.5 : 1 }}
                >
                  <Text style={{ color: colors.dangerText, fontSize: fs(14), fontWeight: '700' }}>Reject</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  disabled={isProcessing}
                  onPress={() => confirmReview(request, 'approved')}
                  style={{ flex: 1, minHeight: 46, backgroundColor: colors.accent, borderRadius: 11, flexDirection: 'row', gap: 7, alignItems: 'center', justifyContent: 'center', opacity: isProcessing ? 0.7 : 1 }}
                >
                  {isProcessing && <ActivityIndicator size="small" color="#fff" />}
                  <Text style={{ color: '#fff', fontSize: fs(14), fontWeight: '700' }}>Approve</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })}
      </ScrollView>
      <Modal
        visible={Boolean(requestToReject)}
        transparent
        animationType="fade"
        onRequestClose={() => setRequestToReject(null)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', padding: 24 }}>
          <View style={{ ...cardStyle, backgroundColor: colors.card, borderColor: colors.cardBorder, padding: 22 }}>
            <Text style={{ color: colors.text, fontSize: fs(18), fontWeight: '800' }}>Reject Extension Request</Text>
            <Text style={{ color: colors.textSecondary, fontSize: fs(14), lineHeight: 20, marginTop: 8 }}>
              Add a reason for {requestToReject?.tenantName}. The tenant will receive it with the rejection notice.
            </Text>
            <TextInput
              value={rejectionReason}
              onChangeText={setRejectionReason}
              placeholder="Reason for rejection (optional)"
              placeholderTextColor={colors.textMuted}
              multiline
              textAlignVertical="top"
              style={{
                minHeight: 96,
                marginTop: 16,
                padding: 12,
                borderWidth: 1,
                borderColor: colors.cardBorder,
                borderRadius: 12,
                color: colors.text,
                backgroundColor: colors.bg,
                fontSize: fs(14),
              }}
            />
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
              <TouchableOpacity
                onPress={() => setRequestToReject(null)}
                disabled={Boolean(processingId)}
                style={{ flex: 1, minHeight: 46, borderWidth: 1, borderColor: colors.cardBorder, borderRadius: 11, alignItems: 'center', justifyContent: 'center' }}
              >
                <Text style={{ color: colors.text, fontSize: fs(14), fontWeight: '700' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => requestToReject && reviewRequest(requestToReject, 'rejected', rejectionReason)}
                disabled={!requestToReject || Boolean(processingId)}
                style={{ flex: 1, minHeight: 46, backgroundColor: colors.dangerText, borderRadius: 11, flexDirection: 'row', gap: 7, alignItems: 'center', justifyContent: 'center', opacity: processingId ? 0.7 : 1 }}
              >
                {processingId && <ActivityIndicator size="small" color="#fff" />}
                <Text style={{ color: '#fff', fontSize: fs(14), fontWeight: '700' }}>Reject Request</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
