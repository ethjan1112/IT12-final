import ScreenSkeleton from '../../components/ScreenSkeleton';
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Image, Modal, TextInput, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../utils/ThemeContext';
import { isMobile, isDesktop, getResponsivePadding, fs, spacing, cardStyle, safeAreaTop } from '../../utils/responsive';
import { getPendingPaymentProofs, approvePaymentProof, rejectPaymentProof } from '../../services/dataService';

export default function PaymentProofReviewScreen({ navigation, reviewerUserId }) {
  const { colors } = useTheme();
  const padding = getResponsivePadding();

  const [loading, setLoading] = useState(true);
  const [proofs, setProofs] = useState([]);
  const [processingId, setProcessingId] = useState(null);
  const [error, setError] = useState(null);
  const [selectedProof, setSelectedProof] = useState(null);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejectionError, setRejectionError] = useState('');
  const [notice, setNotice] = useState('');

  const containerMaxWidth = isDesktop ? 1400 : '100%';

  const loadProofs = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getPendingPaymentProofs();
      setProofs(Array.isArray(data) ? data.filter((proof) => proof && typeof proof === 'object') : []);
    } catch (err) {
      console.error('Error loading payment proofs:', err);
      setError('Failed to load payment proofs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProofs();
  }, []);

  const handleApprove = (proof) => {
    setError(null);
    setNotice('');
    setSelectedProof(proof);
    setShowApproveModal(true);
  };

  const confirmApprove = async () => {
    if (!selectedProof) return;
    try {
      setProcessingId(selectedProof.id);
      setError(null);
      await approvePaymentProof(selectedProof.id, reviewerUserId || null);
      setShowApproveModal(false);
      setSelectedProof(null);
      setNotice('Payment verified and recorded. The tenant balance has been updated.');
      await loadProofs();
    } catch (err) {
      setError(err.message || 'Failed to approve payment. Please try again.');
      setShowApproveModal(false);
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      setRejectionError('Please provide a reason for rejection.');
      return;
    }

    try {
      setProcessingId(selectedProof.id);
      setRejectionError('');
      setError(null);
      await rejectPaymentProof(selectedProof.id, reviewerUserId || null, rejectionReason.trim());
      setShowRejectModal(false);
      setSelectedProof(null);
      setRejectionReason('');
      setNotice('Payment proof rejected. The tenant has been notified.');
      await loadProofs();
    } catch (err) {
      setRejectionError(err.message || 'Failed to reject payment. Please try again.');
    } finally {
      setProcessingId(null);
    }
  };

  const openRejectModal = (proof) => {
    setError(null);
    setNotice('');
    setSelectedProof(proof);
    setRejectionReason('');
    setRejectionError('');
    setShowRejectModal(true);
  };

  const formatDate = (dateStr) => {
    try {
      return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const getMethodLabel = (method) => {
    switch (method) {
      case 'cash':
        return 'Cash';
      default:
        return method;
    }
  };

  const getMethodIcon = (method) => {
    switch (method) {
      case 'cash':
        return 'cash-outline';
      default:
        return 'wallet-outline';
    }
  };

  if (loading) return <ScreenSkeleton />;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 28, alignItems: isDesktop ? 'center' : 'stretch' }}
      >
        <View style={{ maxWidth: containerMaxWidth, width: '100%' }}>
          {/* Header */}
          <View style={{ paddingHorizontal: padding, paddingTop: isMobile ? 16 : isDesktop ? 40 : 60, paddingBottom: spacing.md }}>
            <TouchableOpacity
              onPress={() => navigation?.goBack?.()}
              accessibilityRole="button"
              accessibilityLabel="Back to tenant finances"
              style={{ alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6, paddingRight: 10, marginBottom: 12 }}
            >
              <Ionicons name="arrow-back" size={18} color={colors.accent} />
              <Text style={{ fontSize: fs(13), color: colors.accent, fontWeight: '700' }}>Tenant Finances</Text>
            </TouchableOpacity>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.accentBg, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="checkmark-done-outline" size={24} color={colors.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: fs(28), color: colors.text, fontWeight: '800' }}>Payment Verification</Text>
                <Text style={{ fontSize: fs(14), color: colors.textSecondary, marginTop: 2 }}>
                  {proofs.length} {proofs.length === 1 ? 'proof' : 'proofs'} awaiting review
                </Text>
              </View>
            </View>
          </View>

          {/* Payment Proofs */}
          <View style={{ paddingHorizontal: padding, gap: spacing.md }}>
            {error ? (
              <View style={{ backgroundColor: colors.dangerBg, padding: 14, borderRadius: 10 }}>
                <Text style={{ fontSize: fs(14), color: colors.dangerText, fontWeight: '600' }}>{error}</Text>
              </View>
            ) : null}

            {notice ? (
              <View style={{ backgroundColor: colors.successBg, padding: 14, borderRadius: 10 }}>
                <Text style={{ fontSize: fs(14), color: colors.successText, fontWeight: '600' }}>{notice}</Text>
              </View>
            ) : null}

            {proofs.length === 0 ? (
              <View
                style={{
                  ...cardStyle,
                  backgroundColor: colors.card,
                  borderColor: colors.cardBorder,
                  padding: 40,
                  alignItems: 'center',
                }}
              >
                <Ionicons name="checkmark-done-circle-outline" size={56} color={colors.success} />
                <Text style={{ fontSize: fs(17), fontWeight: '700', color: colors.text, marginTop: 16 }}>All Caught Up!</Text>
                <Text style={{ fontSize: fs(14), color: colors.textSecondary, marginTop: 6, textAlign: 'center' }}>
                  No payment proofs pending verification
                </Text>
              </View>
            ) : (
              proofs.map((proof) => {
                const isProcessing = processingId === proof.id;

                return (
                  <View
                    key={proof.id}
                    style={{
                      ...cardStyle,
                      backgroundColor: colors.card,
                      borderColor: colors.cardBorder,
                      padding: isMobile ? 16 : 20,
                      borderLeftWidth: 3,
                      borderLeftColor: colors.accent,
                    }}
                  >
                    {/* Tenant Info */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                      <View
                        style={{
                          width: 42,
                          height: 42,
                          borderRadius: 21,
                          backgroundColor: proof.tenantColor,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Text style={{ color: '#ffffff', fontWeight: '800', fontSize: fs(14) }}>{proof.tenantInitials}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: fs(16), fontWeight: '700', color: colors.text }}>{proof.tenantName}</Text>
                        <Text style={{ fontSize: fs(13), color: colors.textMuted }}>Room {proof.roomNumber}</Text>
                      </View>
                      <View style={{ backgroundColor: proof.needsRecording ? colors.dangerBg : colors.warningBg, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 }}>
                        <Text style={{ fontSize: fs(11), fontWeight: '700', color: proof.needsRecording ? colors.dangerText : colors.warningText }}>
                          {proof.needsRecording ? 'RECORD PAYMENT' : 'PENDING'}
                        </Text>
                      </View>
                    </View>

                    {/* Payment Details */}
                    <View style={{ backgroundColor: colors.bg, borderRadius: 12, padding: 14, marginBottom: 14 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
                        <Text style={{ fontSize: fs(13), color: colors.textSecondary }}>Amount</Text>
                        <Text style={{ fontSize: fs(18), fontWeight: '700', color: colors.accent }}>₱{proof.amount.toLocaleString()}</Text>
                      </View>

                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                        <Text style={{ fontSize: fs(13), color: colors.textSecondary }}>Payment Date</Text>
                        <Text style={{ fontSize: fs(14), fontWeight: '600', color: colors.text }}>{formatDate(proof.paymentDate)}</Text>
                      </View>

                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8, alignItems: 'center' }}>
                        <Text style={{ fontSize: fs(13), color: colors.textSecondary }}>Payment Method</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Ionicons name={getMethodIcon(proof.paymentMethod)} size={16} color={colors.text} />
                          <Text style={{ fontSize: fs(14), fontWeight: '600', color: colors.text }}>{getMethodLabel(proof.paymentMethod)}</Text>
                        </View>
                      </View>

                      {proof.referenceNo ? (
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                          <Text style={{ fontSize: fs(13), color: colors.textSecondary }}>Reference No.</Text>
                          <Text style={{ fontSize: fs(14), fontWeight: '600', color: colors.text, fontFamily: 'monospace' }}>
                            {proof.referenceNo}
                          </Text>
                        </View>
                      ) : null}

                      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Text style={{ fontSize: fs(13), color: colors.textSecondary }}>Invoice Period</Text>
                        <Text style={{ fontSize: fs(14), fontWeight: '600', color: colors.text }}>{proof.invoicePeriod}</Text>
                      </View>
                    </View>

                    {/* Notes */}
                    {proof.notes ? (
                      <View style={{ backgroundColor: colors.bg, padding: 12, borderRadius: 10, marginBottom: 14 }}>
                        <Text style={{ fontSize: fs(12), fontWeight: '600', color: colors.textMuted, marginBottom: 4 }}>NOTES</Text>
                        <Text style={{ fontSize: fs(14), color: colors.textSecondary, lineHeight: 20 }}>{proof.notes}</Text>
                      </View>
                    ) : null}

                    {/* Proof Image */}
                    {proof.proofImageUrl ? (
                      <TouchableOpacity
                        onPress={() => {
                          setSelectedProof(proof);
                          setShowImageModal(true);
                        }}
                        style={{
                          backgroundColor: colors.accentBg,
                          padding: 12,
                          borderRadius: 10,
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 10,
                          marginBottom: 14,
                        }}
                      >
                        <Ionicons name="image-outline" size={20} color={colors.accent} />
                        <Text style={{ flex: 1, fontSize: fs(14), fontWeight: '600', color: colors.accent }}>View Payment Proof</Text>
                        <Ionicons name="chevron-forward" size={18} color={colors.accent} />
                      </TouchableOpacity>
                    ) : null}

                    {/* Submission Time */}
                    <Text style={{ fontSize: fs(12), color: colors.textMuted, marginBottom: 14 }}>
                      Submitted {formatDate(proof.submittedAt)}
                    </Text>

                    {/* Action Buttons */}
                    <View style={{ flexDirection: 'row', gap: 10 }}>
                      {!proof.needsRecording && (
                        <TouchableOpacity
                          onPress={() => openRejectModal(proof)}
                          disabled={isProcessing}
                          style={{
                            flex: 1,
                            borderWidth: 1,
                            borderColor: colors.dangerText,
                            borderRadius: 12,
                            paddingVertical: 12,
                            alignItems: 'center',
                            flexDirection: 'row',
                            justifyContent: 'center',
                            gap: 6,
                            opacity: isProcessing ? 0.5 : 1,
                          }}
                        >
                          <Ionicons name="close-circle-outline" size={20} color={colors.dangerText} />
                          <Text style={{ fontSize: fs(14), fontWeight: '700', color: colors.dangerText }}>Reject</Text>
                        </TouchableOpacity>
                      )}

                      <TouchableOpacity
                        onPress={() => handleApprove(proof)}
                        disabled={isProcessing}
                        style={{
                          flex: 1,
                          backgroundColor: colors.accent,
                          borderRadius: 12,
                          paddingVertical: 12,
                          alignItems: 'center',
                          flexDirection: 'row',
                          justifyContent: 'center',
                          gap: 6,
                          opacity: isProcessing ? 0.5 : 1,
                        }}
                      >
                        {isProcessing ? (
                          <ActivityIndicator size="small" color="#ffffff" />
                        ) : (
                          <>
                            <Ionicons name="checkmark-circle-outline" size={20} color="#ffffff" />
                            <Text style={{ fontSize: fs(14), fontWeight: '700', color: '#ffffff' }}>
                              {proof.needsRecording ? 'Record Payment' : 'Approve & Record'}
                            </Text>
                          </>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        </View>
      </ScrollView>

      {/* Approve confirmation */}
      <Modal visible={showApproveModal} transparent animationType="fade" onRequestClose={() => processingId === null && setShowApproveModal(false)}>
        <Pressable
          onPress={() => processingId === null && setShowApproveModal(false)}
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.58)', justifyContent: 'center', alignItems: 'center', padding: 24 }}
        >
          <Pressable
            onPress={(event) => event.stopPropagation()}
            style={{ width: isMobile ? '100%' : 420, backgroundColor: colors.card, borderRadius: 18, borderWidth: 1, borderColor: colors.cardBorder, padding: 24 }}
          >
            <View style={{ alignItems: 'center', marginBottom: 18 }}>
              <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: colors.successBg, alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                <Ionicons name="checkmark-done-circle-outline" size={27} color={colors.successText} />
              </View>
              <Text style={{ fontSize: fs(20), fontWeight: '800', color: colors.text, textAlign: 'center' }}>
                {selectedProof?.needsRecording ? 'Finish recording payment?' : 'Approve this payment?'}
              </Text>
              <Text style={{ fontSize: fs(14), color: colors.textSecondary, textAlign: 'center', marginTop: 7 }}>
                {selectedProof?.needsRecording
                  ? 'The proof was already approved, but the payment did not finish recording. Continue to update the invoice.'
                  : "This records the tenant's payment and updates their invoice balance."}
              </Text>
            </View>
            {selectedProof ? (
              <View style={{ backgroundColor: colors.bg, borderRadius: 12, padding: 14, marginBottom: 20, gap: 9 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
                  <Text style={{ fontSize: fs(14), color: colors.textSecondary }}>Tenant</Text>
                  <Text style={{ flexShrink: 1, fontSize: fs(14), fontWeight: '700', color: colors.text, textAlign: 'right' }}>{selectedProof.tenantName}</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
                  <Text style={{ fontSize: fs(14), color: colors.textSecondary }}>Room</Text>
                  <Text style={{ fontSize: fs(14), fontWeight: '700', color: colors.text }}>Room {selectedProof.roomNumber}</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
                  <Text style={{ fontSize: fs(14), color: colors.textSecondary }}>Amount</Text>
                  <Text style={{ fontSize: fs(14), fontWeight: '700', color: colors.successText }}>₱{Number(selectedProof.amount || 0).toLocaleString()}</Text>
                </View>
              </View>
            ) : null}
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity
                onPress={() => setShowApproveModal(false)}
                disabled={processingId !== null}
                style={{ flex: 1, minHeight: 48, borderRadius: 11, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.cardBorder, alignItems: 'center', justifyContent: 'center' }}
              >
                <Text style={{ fontSize: fs(14), fontWeight: '700', color: colors.text }}>Go back</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={confirmApprove}
                disabled={processingId !== null}
                style={{ flex: 1.25, minHeight: 48, borderRadius: 11, backgroundColor: colors.successText, alignItems: 'center', justifyContent: 'center' }}
              >
                {processingId !== null ? <ActivityIndicator size="small" color="#fff" /> : <Text style={{ fontSize: fs(14), fontWeight: '700', color: '#fff' }}>{selectedProof?.needsRecording ? 'Record payment' : 'Approve & record'}</Text>}
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Receipt image preview */}
      <Modal visible={showImageModal} transparent animationType="fade" onRequestClose={() => setShowImageModal(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center' }}>
          <TouchableOpacity
            onPress={() => setShowImageModal(false)}
            style={{ position: 'absolute', top: 40, right: 20, zIndex: 10 }}
          >
            <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="close" size={24} color="#ffffff" />
            </View>
          </TouchableOpacity>
          {selectedProof?.proofImageUrl ? (
            <Image
              source={{ uri: selectedProof.proofImageUrl }}
              style={{ width: '90%', height: '70%', resizeMode: 'contain' }}
            />
          ) : null}
        </View>
      </Modal>

      {/* Rejection Modal */}
      <Modal visible={showRejectModal} transparent animationType="slide" onRequestClose={() => setShowRejectModal(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: colors.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 }}>
            <Text style={{ fontSize: fs(18), fontWeight: '700', color: colors.text, marginBottom: 16 }}>Reject Payment Proof</Text>

            <Text style={{ fontSize: fs(14), fontWeight: '600', color: colors.text, marginBottom: 8 }}>Reason for Rejection *</Text>
            <TextInput
              value={rejectionReason}
              onChangeText={(value) => {
                setRejectionReason(value);
                setRejectionError('');
              }}
              placeholder="Explain why this payment proof is rejected..."
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              style={{
                backgroundColor: colors.bg,
                borderWidth: 1,
                borderColor: colors.cardBorder,
                borderRadius: 10,
                padding: 12,
                fontSize: fs(15),
                color: colors.text,
                minHeight: 100,
                marginBottom: 16,
              }}
            />

            {rejectionError ? (
              <View style={{ backgroundColor: colors.dangerBg, padding: 11, borderRadius: 9, marginBottom: 14 }}>
                <Text style={{ fontSize: fs(13), color: colors.dangerText, fontWeight: '600' }}>{rejectionError}</Text>
              </View>
            ) : null}

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity
                onPress={() => setShowRejectModal(false)}
                style={{
                  flex: 1,
                  borderWidth: 1,
                  borderColor: colors.cardBorder,
                  borderRadius: 12,
                  paddingVertical: 14,
                  alignItems: 'center',
                }}
              >
                <Text style={{ fontSize: fs(15), fontWeight: '700', color: colors.text }}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleReject}
                disabled={processingId !== null}
                style={{
                  flex: 1,
                  backgroundColor: colors.dangerText,
                  borderRadius: 12,
                  paddingVertical: 14,
                  alignItems: 'center',
                  opacity: processingId !== null ? 0.5 : 1,
                }}
              >
                {processingId !== null ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={{ fontSize: fs(15), fontWeight: '700', color: '#ffffff' }}>Reject Payment</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

