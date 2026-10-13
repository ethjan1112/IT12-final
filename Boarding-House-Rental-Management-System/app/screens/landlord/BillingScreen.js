import ScreenSkeleton from '../../components/ScreenSkeleton';
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal, TextInput, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { 
  isMobile, 
  isTablet, 
  isDesktop, 
  getResponsivePadding, 
  fs, 
  spacing, 
  cardStyle, 
  cardShadow, 
  safeAreaTop 
} from '../../utils/responsive';
import { useTheme } from '../../utils/ThemeContext';
import {
  getMonthlyInvoicePreview,
  generateMonthlyInvoices,
  getRevenue,
  getRentBilling,
  getUtilityBills,
  updateUtilityBill,
} from '../../services/dataService';

const getCurrentBillingPeriod = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

const formatBillingPeriod = (period) => new Date(`${period}-01T12:00:00`).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

export default function BillingScreen({ navigation }) {
  const { colors } = useTheme();
  const [activeTab, setActiveTab] = useState('rent');
  const [rentBilling, setRentBilling] = useState([]);
  const [utilityBills, setUtilityBills] = useState([]);
  const [revenueSummary, setRevenueSummary] = useState({ collected: 0, outstanding: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingBill, setEditingBill] = useState(null);
  const [editValues, setEditValues] = useState({ monthlyRent: '', electricity: '', water: '' });
  const [additionalCharges, setAdditionalCharges] = useState([]);
  const [editError, setEditError] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [invoiceModalVisible, setInvoiceModalVisible] = useState(false);
  const [invoicePreviewLoading, setInvoicePreviewLoading] = useState(false);
  const [invoiceGenerating, setInvoiceGenerating] = useState(false);
  const [invoicePreview, setInvoicePreview] = useState(null);
  const [invoiceGenerationResult, setInvoiceGenerationResult] = useState(null);
  const [invoiceGenerationError, setInvoiceGenerationError] = useState('');

  const padding = getResponsivePadding();
  const containerMaxWidth = isDesktop ? 1400 : '100%';
  const billingPeriod = getCurrentBillingPeriod();

  const reloadBillingData = async () => {
    const [rentData, utilityData, revenueData] = await Promise.all([
      getRentBilling(billingPeriod),
      getUtilityBills(),
      getRevenue(billingPeriod),
    ]);
    setRentBilling(rentData);
    setUtilityBills(utilityData);
    setRevenueSummary(revenueData);
  };

  useEffect(() => {
    let isMounted = true;
    const fetchBillingData = async () => {
      try {
        setLoading(true);
        setError(null);
        await reloadBillingData();
      } catch (err) {
        if (isMounted) {
          setError('Failed to load billing records. Please try again.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchBillingData();
    return () => {
      isMounted = false;
    };
  }, []);

  const openInvoiceGenerator = async () => {
    setInvoiceModalVisible(true);
    setInvoicePreviewLoading(true);
    setInvoicePreview(null);
    setInvoiceGenerationResult(null);
    setInvoiceGenerationError('');
    try {
      setInvoicePreview(await getMonthlyInvoicePreview(billingPeriod));
    } catch (previewError) {
      setInvoiceGenerationError(previewError.message || 'Could not prepare the invoice preview.');
    } finally {
      setInvoicePreviewLoading(false);
    }
  };

  const handleGenerateMonthlyInvoices = async () => {
    if (!invoicePreview?.invoices?.length || invoiceGenerating) return;
    try {
      setInvoiceGenerating(true);
      setInvoiceGenerationError('');
      const result = await generateMonthlyInvoices(billingPeriod);
      setInvoiceGenerationResult(result);
      await reloadBillingData();
    } catch (generateError) {
      setInvoiceGenerationError(generateError.message || 'Could not generate the monthly invoices.');
    } finally {
      setInvoiceGenerating(false);
    }
  };

  const totalCollected = revenueSummary.collected;
  const totalOutstanding = revenueSummary.outstanding;

  const openBillEditor = (bill) => {
    setEditingBill(bill);
    setEditValues({ monthlyRent: String(bill.rent), electricity: String(bill.electricity), water: String(bill.water) });
    setAdditionalCharges((bill.additionalCharges || []).map((charge, index) => ({ id: charge.id || `charge-${index}`, label: charge.label || charge.name || '', amount: String(charge.amount ?? '') })));
    setEditError('');
  };

  const saveBillEdit = async () => {
    if (!editingBill) return;
    try {
      setSavingEdit(true);
      setEditError('');
      await updateUtilityBill({
        invoiceId: editingBill.invoiceId,
        leaseId: editingBill.leaseId,
        billingPeriod: editingBill.billingPeriod,
        additionalCharges,
        ...editValues,
      });
      await reloadBillingData();
      setEditingBill(null);
    } catch (saveError) {
      setEditError(saveError.message || 'Could not save this bill. Please try again.');
    } finally {
      setSavingEdit(false);
    }
  };

  if (loading) return <ScreenSkeleton />;

  if (error) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg, padding: 20 }}>
        <Text style={{ color: colors.danger, fontSize: fs(16), textAlign: 'center', fontWeight: '600' }}>
          {error}
        </Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Header */}
      <View style={{ 
        paddingHorizontal: padding, 
        paddingTop: isMobile ? 16 : isDesktop ? 40 : 60,
        paddingBottom: spacing.sm,
        alignItems: isDesktop ? 'center' : 'stretch'
      }}>
        <View style={{ maxWidth: containerMaxWidth, width: '100%' }}>
          <Text style={{ fontSize: fs(13), color: colors.textMuted, fontWeight: '500' }}>{formatBillingPeriod(billingPeriod)}</Text>
          <View style={{ flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'stretch' : 'center', justifyContent: 'space-between', gap: spacing.sm }}>
            <Text style={{ fontSize: fs(32), color: colors.text, fontWeight: '700', marginTop: 4 }}>Billing</Text>
            <TouchableOpacity
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={`Preview ${formatBillingPeriod(billingPeriod)} invoices`}
              onPress={openInvoiceGenerator}
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, backgroundColor: colors.accent }}
            >
              <Ionicons name="document-text-outline" size={18} color="#fff" />
              <Text style={{ fontSize: fs(13), fontWeight: '800', color: '#fff' }}>Generate monthly invoices</Text>
            </TouchableOpacity>
          </View>

          {/* Summary Card */}
          <View style={{ 
            ...cardStyle, 
            backgroundColor: colors.card,
            borderColor: colors.cardBorder,
            padding: isDesktop ? 20 : 16,
            marginTop: spacing.md,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            {/* Collected Stat */}
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <View style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                backgroundColor: colors.iconBgGreen,
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <Ionicons name="checkmark-circle" size={20} color={colors.success} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ 
                  fontSize: fs(11), 
                  fontWeight: '600', 
                  color: colors.textSecondary, 
                  textTransform: 'uppercase', 
                  letterSpacing: 0.5 
                }} numberOfLines={1}>
                  Cash Received
                </Text>
                <Text style={{ 
                  fontSize: fs(18), 
                  fontWeight: '800', 
                  color: colors.success, 
                  marginTop: 2 
                }} numberOfLines={1}>
                  ₱{totalCollected.toLocaleString()}
                </Text>
              </View>
            </View>

            {/* Divider */}
            <View style={{ width: 1, height: 36, backgroundColor: colors.cardBorder, marginHorizontal: spacing.sm }} />

            {/* Outstanding Stat */}
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <View style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                backgroundColor: colors.iconBgYellow,
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <Ionicons name="time" size={20} color={colors.warning} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ 
                  fontSize: fs(11), 
                  fontWeight: '600', 
                  color: colors.textSecondary, 
                  textTransform: 'uppercase', 
                  letterSpacing: 0.5 
                }} numberOfLines={1}>
                  Outstanding This Month
                </Text>
                <Text style={{ 
                  fontSize: fs(18), 
                  fontWeight: '800', 
                  color: colors.warning, 
                  marginTop: 2 
                }} numberOfLines={1}>
                  ₱{totalOutstanding.toLocaleString()}
                </Text>
              </View>
            </View>
          </View>

          <TouchableOpacity
            activeOpacity={0.75}
            onPress={() => navigation?.navigate('payment-proofs')}
            accessibilityRole="button"
            accessibilityLabel="Review tenant payment proofs"
            style={{
              ...cardStyle,
              backgroundColor: colors.card,
              borderColor: colors.cardBorder,
              padding: 16,
              marginTop: spacing.md,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: colors.accentBg, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="receipt-outline" size={20} color={colors.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: fs(14), fontWeight: '700', color: colors.text }}>Payment Verification</Text>
              <Text style={{ fontSize: fs(12), color: colors.textMuted, marginTop: 3 }}>Review tenant payment proofs</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </TouchableOpacity>

          {/* Toggle Tabs */}
          <View style={{ 
            flexDirection: 'row', 
            backgroundColor: colors.toggleBg, 
            borderRadius: 12, 
            padding: 4, 
            marginTop: spacing.md,
            borderWidth: 1,
            borderColor: colors.toggleBorder,
            ...cardShadow,
          }}>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setActiveTab('rent')}
              style={{
                flex: 1,
                minHeight: 44,
                paddingVertical: isDesktop ? 14 : 12,
                borderRadius: 10,
                backgroundColor: activeTab === 'rent' ? colors.accent : 'transparent',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ 
                fontSize: fs(14), 
                fontWeight: '700', 
                color: activeTab === 'rent' ? '#ffffff' : colors.textMuted 
              }}>
                Rent Billing
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setActiveTab('utility')}
              style={{
                flex: 1,
                minHeight: 44,
                paddingVertical: isDesktop ? 14 : 12,
                borderRadius: 10,
                backgroundColor: activeTab === 'utility' ? colors.accent : 'transparent',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ 
                fontSize: fs(14), 
                fontWeight: '700', 
                color: activeTab === 'utility' ? '#ffffff' : colors.textMuted 
              }}>
                Utility Bills
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Main Content List */}
      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ 
          paddingHorizontal: padding, 
          paddingTop: spacing.xs,
          paddingBottom: 20,
          gap: spacing.md,
          alignItems: isDesktop ? 'center' : 'stretch'
        }}
      >
        <View style={{ maxWidth: containerMaxWidth, width: '100%', gap: spacing.md }}>
          {/* Section Header */}
          <View style={{ 
            flexDirection: 'row', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: spacing.xs,
          }}>
            <Text style={{ 
              fontSize: fs(13), 
              fontWeight: '700', 
              color: colors.textSecondary, 
              letterSpacing: 0.5,
              textTransform: 'uppercase'
            }}>
              {activeTab === 'rent' ? `Rent Billing (${rentBilling.length})` : `Utility Bills (${utilityBills.length})`}
            </Text>
          </View>

          {activeTab === 'rent' ? (
            // Rent Billing List
            rentBilling.length === 0 ? (
              <View style={{ ...cardStyle, backgroundColor: colors.card, borderColor: colors.cardBorder, padding: 24, alignItems: 'center' }}>
                <Text style={{ color: colors.textMuted, fontSize: fs(14) }}>No rent billing records found.</Text>
              </View>
            ) : (
              rentBilling.map((item) => (
                <TouchableOpacity
                  key={item.id} 
                  activeOpacity={0.7}
                  style={{ 
                    ...cardStyle,
                    backgroundColor: colors.card,
                    borderColor: colors.cardBorder,
                    padding: isDesktop ? 20 : 16, 
                    flexDirection: 'row', 
                    alignItems: 'center',
                    borderLeftWidth: 3,
                    borderLeftColor: item.status === 'paid' ? colors.success : item.status === 'unbilled' ? colors.textMuted : colors.danger,
                  }}
                >
                  {/* Avatar */}
                  <View style={{ 
                    width: isDesktop ? 48 : 44, 
                    height: isDesktop ? 48 : 44, 
                    borderRadius: 12, 
                    backgroundColor: item.color, 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    marginRight: spacing.md 
                  }}>
                    <Text style={{ fontSize: fs(15), fontWeight: '800', color: '#ffffff' }}>{item.initials}</Text>
                  </View>

                  {/* Tenant & Room Info */}
                  <View style={{ flex: 1, marginRight: spacing.sm }}>
                    <Text style={{ fontSize: fs(15), fontWeight: '700', color: colors.text }} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <Text style={{ fontSize: fs(12), fontWeight: '500', color: colors.textMuted, marginTop: 2 }} numberOfLines={1}>
                      {item.status === 'unbilled' ? `${item.room} · No invoice yet` : `${item.room} · Due ${item.dueDate}`}
                    </Text>
                  </View>

                  {/* Amount & Status Badge */}
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ fontSize: fs(17), fontWeight: '800', color: colors.text }}>
                      ₱{item.amount.toLocaleString()}
                    </Text>
                    <View style={{ 
                      flexDirection: 'row', 
                      alignItems: 'center', 
                      gap: 4, 
                      backgroundColor: item.status === 'paid' ? colors.iconBgGreen : item.status === 'unbilled' ? colors.bg : colors.iconBgRed,
                      paddingHorizontal: 8,
                      paddingVertical: 3,
                      borderRadius: 12,
                      marginTop: 4,
                    }}>
                      <Ionicons 
                        name={item.status === 'paid' ? 'checkmark-circle' : item.status === 'unbilled' ? 'remove-circle-outline' : 'close-circle'} 
                        size={12} 
                        color={item.status === 'paid' ? colors.success : item.status === 'unbilled' ? colors.textMuted : colors.danger} 
                      />
                      <Text style={{ 
                        fontSize: fs(11), 
                        fontWeight: '700', 
                        color: item.status === 'paid' ? colors.success : item.status === 'unbilled' ? colors.textMuted : colors.danger,
                        textTransform: 'capitalize' 
                      }}>
                        {item.status}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))
            )
          ) : (
            // Utility Bills List
            utilityBills.length === 0 ? (
              <View style={{ ...cardStyle, backgroundColor: colors.card, borderColor: colors.cardBorder, padding: 24, alignItems: 'center' }}>
                <Text style={{ color: colors.textMuted, fontSize: fs(14) }}>No utility bills found.</Text>
              </View>
            ) : (
              utilityBills.map((item) => (
                <View
                  key={item.id} 
                  style={{ 
                    ...cardStyle,
                    backgroundColor: colors.card,
                    borderColor: colors.cardBorder,
                    padding: isDesktop ? 22 : 16,
                    borderLeftWidth: 3,
                    borderLeftColor: colors.info,
                  }}
                >
                  {/* Header: Avatar, Name, Amount */}
                  <View style={{ 
                    flexDirection: 'row', 
                    alignItems: 'center', 
                    justifyContent: 'space-between', 
                    marginBottom: spacing.md 
                  }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, flex: 1, marginRight: spacing.sm }}>
                      <View style={{ 
                        width: isDesktop ? 48 : 44, 
                        height: isDesktop ? 48 : 44, 
                        borderRadius: 12, 
                        backgroundColor: item.color, 
                        alignItems: 'center', 
                        justifyContent: 'center' 
                      }}>
                        <Text style={{ fontSize: fs(15), fontWeight: '800', color: '#ffffff' }}>{item.initials}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: fs(16), fontWeight: '700', color: colors.text }} numberOfLines={1}>
                          {item.name}
                        </Text>
                        <Text style={{ fontSize: fs(12), fontWeight: '500', color: colors.textMuted, marginTop: 2 }}>
                          Room {item.roomNumber} · {item.billingPeriod || 'Utility billing period'}
                        </Text>
                      </View>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={{ fontSize: fs(18), fontWeight: '800', color: colors.text }}>₱{Number(item.total).toLocaleString()}</Text>
                      <Text style={{ fontSize: fs(11), fontWeight: '600', color: colors.textMuted, marginTop: 2 }}>Total bill</Text>
                    </View>
                  </View>

                  <View style={{ borderTopWidth: 1, borderTopColor: colors.cardBorder, paddingTop: spacing.sm, gap: 7, marginBottom: spacing.md }}>
                    {[
                      ['Rent', item.rent],
                      ['Electricity', item.electricity],
                      ['Water', item.water],
                    ].map(([label, amount]) => (
                      <View key={label} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={{ fontSize: fs(13), color: colors.textSecondary }}>{label}</Text>
                        <Text style={{ fontSize: fs(13), fontWeight: '700', color: colors.text }}>₱{Number(amount || 0).toLocaleString()}</Text>
                      </View>
                    ))}
                    {(item.additionalCharges || []).map((charge, index) => (
                      <View key={charge.id || `${charge.label}-${index}`} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={{ fontSize: fs(13), color: colors.textSecondary }}>{charge.label || 'Additional charge'}</Text>
                        <Text style={{ fontSize: fs(13), fontWeight: '700', color: colors.text }}>₱{Number(charge.amount || 0).toLocaleString()}</Text>
                      </View>
                    ))}
                  </View>

                  {/* kWh Stats Row */}
                  <View style={{ 
                    flexDirection: 'row', 
                    gap: spacing.sm, 
                    paddingTop: spacing.md, 
                    borderTopWidth: 1, 
                    borderTopColor: colors.cardBorder 
                  }}>
                    <View style={{ 
                      flex: 1, 
                      backgroundColor: colors.bg, 
                      borderRadius: 10, 
                      paddingVertical: 10, 
                      paddingHorizontal: 8, 
                      alignItems: 'center',
                      borderWidth: 1,
                      borderColor: colors.cardBorder
                    }}>
                      <Text style={{ fontSize: fs(10), fontWeight: '600', color: colors.textMuted, marginBottom: 4, textTransform: 'uppercase' }}>Prev kWh</Text>
                      <Text style={{ fontSize: fs(14), fontWeight: '700', color: colors.textSecondary }}>{item.prevKwh}</Text>
                    </View>
                    <View style={{ 
                      flex: 1, 
                      backgroundColor: colors.bg, 
                      borderRadius: 10, 
                      paddingVertical: 10, 
                      paddingHorizontal: 8, 
                      alignItems: 'center',
                      borderWidth: 1,
                      borderColor: colors.cardBorder
                    }}>
                      <Text style={{ fontSize: fs(10), fontWeight: '600', color: colors.textMuted, marginBottom: 4, textTransform: 'uppercase' }}>Curr kWh</Text>
                      <Text style={{ fontSize: fs(14), fontWeight: '700', color: colors.textSecondary }}>{item.currKwh}</Text>
                    </View>
                    <View style={{ 
                      flex: 1.2, 
                      backgroundColor: colors.iconBgYellow, 
                      borderRadius: 10, 
                      paddingVertical: 10, 
                      paddingHorizontal: 8, 
                      alignItems: 'center',
                      borderWidth: 1,
                      borderColor: colors.warning
                    }}>
                      <Text style={{ fontSize: fs(10), fontWeight: '700', color: colors.warning, marginBottom: 4, textTransform: 'uppercase' }}>Usage</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Ionicons name="flash" size={16} color={colors.warning} style={{ marginRight: 3 }} />
                        <Text style={{ fontSize: fs(14), fontWeight: '800', color: colors.text }}>{item.usage} kWh</Text>
                      </View>
                    </View>
                  </View>

                  <TouchableOpacity
                    onPress={() => openBillEditor(item)}
                    style={{ alignSelf: 'flex-end', flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.md, paddingHorizontal: 13, paddingVertical: 9, borderRadius: 9, backgroundColor: colors.accentBg }}
                  >
                    <Ionicons name="create-outline" size={16} color={colors.accent} />
                    <Text style={{ fontSize: fs(12), fontWeight: '800', color: colors.accent }}>{item.invoiceId ? 'Edit bill' : 'Create bill'}</Text>
                  </TouchableOpacity>
                </View>
              ))
            )
          )}
        </View>
      </ScrollView>

      <Modal visible={!!editingBill} transparent animationType="fade" onRequestClose={() => !savingEdit && setEditingBill(null)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <View style={{ width: '100%', maxWidth: 460, backgroundColor: colors.card, borderRadius: 18, borderWidth: 1, borderColor: colors.cardBorder, padding: 22 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <Text style={{ fontSize: fs(19), fontWeight: '800', color: colors.text }}>Edit Utility Bill</Text>
              <TouchableOpacity onPress={() => !savingEdit && setEditingBill(null)} disabled={savingEdit} accessibilityLabel="Close edit bill" style={{ padding: 4 }}>
                <Ionicons name="close" size={23} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <Text style={{ fontSize: fs(13), color: colors.textSecondary, marginBottom: 18 }}>
              {editingBill ? `Room ${editingBill.roomNumber} · ${editingBill.name} · ${editingBill.billingPeriod || 'Current period'}` : ''}
            </Text>

            {[
              ['monthlyRent', 'Rent'],
              ['electricity', 'Electricity'],
              ['water', 'Water'],
            ].map(([field, label]) => (
              <View key={field} style={{ marginBottom: 13 }}>
                <Text style={{ fontSize: fs(13), fontWeight: '700', color: colors.text, marginBottom: 6 }}>{label} amount (₱)</Text>
                <TextInput
                  value={editValues[field]}
                  onChangeText={(value) => setEditValues((current) => ({ ...current, [field]: value }))}
                  keyboardType="decimal-pad"
                  placeholder="0"
                  placeholderTextColor={colors.textMuted}
                  editable={!savingEdit}
                  style={{ backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.cardBorder, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11, color: colors.text, fontSize: fs(15) }}
                />
              </View>
            ))}

            <View style={{ marginBottom: 14 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <Text style={{ fontSize: fs(13), fontWeight: '800', color: colors.text }}>Additional charges</Text>
                <TouchableOpacity
                  onPress={() => setAdditionalCharges((current) => [...current, { id: `charge-${Date.now()}-${current.length}`, label: '', amount: '' }])}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 8, backgroundColor: colors.accentBg }}
                >
                  <Ionicons name="add" size={16} color={colors.accent} />
                  <Text style={{ color: colors.accent, fontSize: fs(12), fontWeight: '800' }}>Add charge</Text>
                </TouchableOpacity>
              </View>
              {additionalCharges.map((charge) => (
                <View key={charge.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <TextInput
                    value={charge.label}
                    onChangeText={(value) => setAdditionalCharges((current) => current.map((item) => item.id === charge.id ? { ...item, label: value } : item))}
                    placeholder="Wi-Fi (₱100 per person)"
                    placeholderTextColor={colors.textMuted}
                    editable={!savingEdit}
                    style={{ flex: 1, minWidth: 0, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.cardBorder, borderRadius: 9, paddingHorizontal: 10, paddingVertical: 10, color: colors.text, fontSize: fs(13) }}
                  />
                  <TextInput
                    value={charge.amount}
                    onChangeText={(value) => setAdditionalCharges((current) => current.map((item) => item.id === charge.id ? { ...item, amount: value } : item))}
                    keyboardType="decimal-pad"
                    placeholder="Amount"
                    placeholderTextColor={colors.textMuted}
                    editable={!savingEdit}
                    style={{ width: 94, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.cardBorder, borderRadius: 9, paddingHorizontal: 10, paddingVertical: 10, color: colors.text, fontSize: fs(13) }}
                  />
                  <TouchableOpacity
                    onPress={() => setAdditionalCharges((current) => current.filter((item) => item.id !== charge.id))}
                    disabled={savingEdit}
                    accessibilityRole="button"
                    accessibilityLabel={`Remove ${charge.label || 'additional charge'}`}
                    style={{ width: 36, height: 40, alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Ionicons name="trash-outline" size={18} color={colors.dangerText} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>

            {!!editError && <Text style={{ color: colors.dangerText, fontSize: fs(13), marginBottom: 12 }}>{editError}</Text>}
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
              <TouchableOpacity onPress={() => setEditingBill(null)} disabled={savingEdit} style={{ flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center', backgroundColor: colors.bg }}>
                <Text style={{ fontSize: fs(14), fontWeight: '700', color: colors.text }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={saveBillEdit} disabled={savingEdit} style={{ flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center', backgroundColor: colors.accent, opacity: savingEdit ? 0.6 : 1 }}>
                <Text style={{ fontSize: fs(14), fontWeight: '800', color: '#fff' }}>{savingEdit ? 'Saving…' : 'Save bill'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={invoiceModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => !invoiceGenerating && setInvoiceModalVisible(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center', padding: 18 }}>
          <View style={{ width: isMobile ? '90%' : 520, maxHeight: '85%', backgroundColor: colors.card, borderRadius: 16, borderWidth: 1, borderColor: colors.cardBorder, padding: 24 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <Text style={{ fontSize: fs(19), fontWeight: '800', color: colors.text }}>
                {invoiceGenerationResult ? 'Invoice generation complete' : 'Generate monthly invoices'}
              </Text>
              <TouchableOpacity
                onPress={() => !invoiceGenerating && setInvoiceModalVisible(false)}
                disabled={invoiceGenerating}
                accessibilityRole="button"
                accessibilityLabel="Close invoice generator"
                style={{ padding: 4 }}
              >
                <Ionicons name="close" size={23} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={{ fontSize: fs(13), color: colors.textSecondary, marginBottom: 14 }}>
              {formatBillingPeriod(billingPeriod)} · one invoice for each active lease
            </Text>

            {invoicePreviewLoading ? (
              <View style={{ paddingVertical: 30, alignItems: 'center', gap: 10 }}>
                <ActivityIndicator size="small" color={colors.accent} />
                <Text style={{ color: colors.textSecondary, fontSize: fs(13) }}>Preparing invoice preview…</Text>
              </View>
            ) : invoiceGenerationResult ? (
              <View style={{ paddingVertical: 16, alignItems: 'center' }}>
                <Ionicons name="checkmark-circle" size={42} color={colors.success} />
                <Text style={{ color: colors.text, fontSize: fs(16), fontWeight: '800', marginTop: 10 }}>
                  {invoiceGenerationResult.createdCount} invoice{invoiceGenerationResult.createdCount === 1 ? '' : 's'} created
                </Text>
                <Text style={{ color: colors.textSecondary, fontSize: fs(14), marginTop: 5 }}>
                  Total billed: ₱{invoiceGenerationResult.totalAmount.toLocaleString()}
                </Text>
                {!!invoiceGenerationResult.alreadyBilled && (
                  <Text style={{ color: colors.textMuted, fontSize: fs(12), marginTop: 8, textAlign: 'center' }}>
                    {invoiceGenerationResult.alreadyBilled} active lease{invoiceGenerationResult.alreadyBilled === 1 ? ' already has' : 's already have'} an invoice for this month.
                  </Text>
                )}
              </View>
            ) : invoicePreview ? (
              <>
                <View style={{ flexDirection: 'row', gap: 10, marginBottom: 14 }}>
                  <View style={{ flex: 1, backgroundColor: colors.bg, borderRadius: 12, padding: 13 }}>
                    <Text style={{ color: colors.textMuted, fontSize: fs(11), fontWeight: '700' }}>NEW INVOICES</Text>
                    <Text style={{ color: colors.text, fontSize: fs(20), fontWeight: '900', marginTop: 4 }}>{invoicePreview.invoices.length}</Text>
                  </View>
                  <View style={{ flex: 1, backgroundColor: colors.bg, borderRadius: 12, padding: 13 }}>
                    <Text style={{ color: colors.textMuted, fontSize: fs(11), fontWeight: '700' }}>TOTAL TO BILL</Text>
                    <Text style={{ color: colors.accent, fontSize: fs(20), fontWeight: '900', marginTop: 4 }}>₱{invoicePreview.totalAmount.toLocaleString()}</Text>
                  </View>
                </View>

                <Text style={{ color: colors.textSecondary, fontSize: fs(12), marginBottom: 9 }}>
                  Existing invoices are skipped. Rent and saved electricity readings are included; water and extra charges start at ₱0 and can be edited after generation.
                </Text>
                {invoicePreview.missingReadings > 0 && (
                  <Text style={{ color: colors.warning, fontSize: fs(12), marginBottom: 8 }}>
                    {invoicePreview.missingReadings} room{invoicePreview.missingReadings === 1 ? ' has' : 's have'} no valid electricity reading, so electricity is ₱0 for those invoices.
                  </Text>
                )}
                {invoicePreview.skippedMissingRent > 0 && (
                  <Text style={{ color: colors.dangerText, fontSize: fs(12), marginBottom: 8 }}>
                    {invoicePreview.skippedMissingRent} active lease{invoicePreview.skippedMissingRent === 1 ? ' was' : 's were'} skipped because no monthly rent is configured.
                  </Text>
                )}
                {!!invoicePreview.alreadyBilled && (
                  <Text style={{ color: colors.textMuted, fontSize: fs(12), marginBottom: 8 }}>
                    {invoicePreview.alreadyBilled} active lease{invoicePreview.alreadyBilled === 1 ? ' already has' : 's already have'} an invoice for this month and will be skipped.
                  </Text>
                )}

                <ScrollView style={{ maxHeight: 220, borderTopWidth: 1, borderTopColor: colors.divider }}>
                  {invoicePreview.invoices.map((invoice) => (
                    <View key={invoice.id} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.divider }}>
                      <View style={{ flex: 1, marginRight: 10 }}>
                        <Text style={{ color: colors.text, fontSize: fs(13), fontWeight: '700' }}>{invoice.tenantName}</Text>
                        <Text style={{ color: colors.textMuted, fontSize: fs(12), marginTop: 2 }}>Room {invoice.roomNumber}</Text>
                      </View>
                      <Text style={{ color: colors.text, fontSize: fs(13), fontWeight: '800' }}>₱{invoice.total.toLocaleString()}</Text>
                    </View>
                  ))}
                  {invoicePreview.invoices.length === 0 && (
                    <Text style={{ color: colors.textMuted, fontSize: fs(13), textAlign: 'center', paddingVertical: 22 }}>
                      No new invoices to generate for this month.
                    </Text>
                  )}
                </ScrollView>
              </>
            ) : null}

            {!!invoiceGenerationError && (
              <Text style={{ color: colors.dangerText, fontSize: fs(13), marginTop: 12 }}>{invoiceGenerationError}</Text>
            )}

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
              {invoiceGenerationResult ? (
                <TouchableOpacity onPress={() => setInvoiceModalVisible(false)} style={{ flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center', backgroundColor: colors.accent }}>
                  <Text style={{ fontSize: fs(14), fontWeight: '800', color: '#fff' }}>Done</Text>
                </TouchableOpacity>
              ) : (
                <>
                  <TouchableOpacity onPress={() => setInvoiceModalVisible(false)} disabled={invoiceGenerating} style={{ flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center', backgroundColor: colors.bg }}>
                    <Text style={{ fontSize: fs(14), fontWeight: '700', color: colors.text }}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleGenerateMonthlyInvoices}
                    disabled={!invoicePreview?.invoices?.length || invoiceGenerating || invoicePreviewLoading}
                    style={{ flex: 1.4, paddingVertical: 12, borderRadius: 10, alignItems: 'center', backgroundColor: colors.accent, opacity: !invoicePreview?.invoices?.length || invoiceGenerating ? 0.55 : 1 }}
                  >
                    <Text style={{ fontSize: fs(13), fontWeight: '800', color: '#fff' }}>
                      {invoiceGenerating ? 'Generating…' : `Generate ${invoicePreview?.invoices?.length || 0} invoices`}
                    </Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

