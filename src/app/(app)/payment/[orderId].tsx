/**
 * Post-checkout payment — Paystack card or bank transfer (hosted checkout).
 *
 * Flow:
 *  1. Pick method (or resume via ?method=card|transfer)
 *  2. Initialize → open authorization_url in browser
 *     - Card: full Paystack channels
 *     - Transfer: channels=["bank_transfer"] — temporary account on Paystack page
 *  3. Verify on return → Success → My Orders
 */

import * as WebBrowser from 'expo-web-browser';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from "expo-router/react-navigation";

import { FudsButton } from '@/components/ui/fuds-button';
import {
  FudsColors,
  FudsRadius,
  FudsShadow,
  Spacing,
} from '@/constants/theme';
import {
  ordersApi,
  paymentsApi,
  type InitializePaymentResponse,
  type InitializeTransferResponse,
  type OrderRead,
} from '@/lib/api';
import { safeGoBack } from '@/lib/navigation';

type PayMethod = 'card' | 'transfer';
type Phase =
  | 'loading'
  | 'choose'
  | 'card_ready'
  | 'card_processing'
  | 'transfer_ready'
  | 'transfer_processing'
  | 'success'
  | 'error';

function isPaidStatus(status?: string | null): boolean {
  const s = (status ?? '').toLowerCase();
  return s === 'paid' || s === 'success';
}

export default function PaymentScreen() {
  const params = useLocalSearchParams<{
    orderId: string;
    method?: string;
    total?: string;
  }>();
  const orderId = Number(params.orderId);
  const preferredMethod =
    params.method === 'card' || params.method === 'transfer'
      ? (params.method as PayMethod)
      : null;

  const [phase, setPhase] = useState<Phase>('loading');
  const [order, setOrder] = useState<OrderRead | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [cardPayment, setCardPayment] = useState<InitializePaymentResponse | null>(null);
  const [transferPayment, setTransferPayment] =
    useState<InitializeTransferResponse | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const preferredApplied = useRef(false);
  const orderRef = useRef<OrderRead | null>(null);
  orderRef.current = order;

  const amountLabel = order
    ? `₦${Number(order.total_price).toLocaleString()}`
    : params.total
      ? `₦${Number(params.total).toLocaleString()}`
      : '—';

  const goToOrders = useCallback(() => {
    // Land on My Orders (history), not the Cart segment.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    router.replace({
      pathname: '/(app)/(tabs)/orders' as any,
      params: { tab: 'history' },
    });
  }, []);

  const verifyReference = useCallback(
    async (reference: string) => {
      try {
        setBusy(true);
        const result = await paymentsApi.verify(reference);
        setStatusMessage(result.message);
        if (
          isPaidStatus(result.order_payment_status) ||
          isPaidStatus(result.payment.status)
        ) {
          setPhase('success');
          try {
            setOrder(await ordersApi.getOrder(orderId));
          } catch {
            /* ignore */
          }
          return true;
        }
        return false;
      } catch (err) {
        setStatusMessage(err instanceof Error ? err.message : 'Could not verify payment');
        return false;
      } finally {
        setBusy(false);
      }
    },
    [orderId]
  );

  const startCard = useCallback(async (ord?: OrderRead | null) => {
    const o = ord ?? orderRef.current;
    if (!o) return;
    setBusy(true);
    setError(null);
    setStatusMessage(null);
    try {
      const init = await paymentsApi.initialize({ order_id: o.id });
      setCardPayment(init);
      setTransferPayment(null);
      setPhase('card_ready');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start card payment');
      setPhase('choose');
    } finally {
      setBusy(false);
    }
  }, []);

  const startTransfer = useCallback(async (ord?: OrderRead | null) => {
    const o = ord ?? orderRef.current;
    if (!o) return;
    setBusy(true);
    setError(null);
    setStatusMessage(null);
    try {
      const init = await paymentsApi.initializeTransfer({ order_id: o.id });
      setTransferPayment(init);
      setCardPayment(null);
      setPhase('transfer_ready');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start bank transfer');
      setPhase('choose');
    } finally {
      setBusy(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      (async () => {
        if (!orderId || Number.isNaN(orderId)) {
          setError('Invalid order');
          setPhase('error');
          return;
        }
        try {
          setError(null);
          setPhase('loading');
          const data = await ordersApi.getOrder(orderId);
          if (cancelled) return;
          setOrder(data);
          if (isPaidStatus(data.payment_status)) {
            setPhase('success');
            setStatusMessage('This order is already paid.');
            return;
          }
          setPhase('choose');
          if (preferredMethod && !preferredApplied.current) {
            preferredApplied.current = true;
            if (preferredMethod === 'card') await startCard(data);
            else await startTransfer(data);
          }
        } catch (err) {
          if (!cancelled) {
            setError(err instanceof Error ? err.message : 'Could not load order');
            setPhase('error');
          }
        }
      })();

      return () => {
        cancelled = true;
      };
    }, [orderId, preferredMethod, startCard, startTransfer])
  );

  const openHostedCheckout = async (
    url: string,
    reference: string,
    processingPhase: 'card_processing' | 'transfer_processing',
    readyPhase: 'card_ready' | 'transfer_ready'
  ) => {
    setPhase(processingPhase);
    setBusy(true);
    setStatusMessage(null);
    try {
      await WebBrowser.openBrowserAsync(url, {
        dismissButtonStyle: 'close',
        enableDefaultShareMenuItem: false,
        showTitle: true,
      });
      const ok = await verifyReference(reference);
      if (!ok) {
        setPhase(readyPhase);
        setStatusMessage(
          'Payment not confirmed yet. Tap “Check payment” after completing on Paystack.'
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not open Paystack');
      setPhase(readyPhase);
    } finally {
      setBusy(false);
    }
  };

  if (phase === 'loading') {
    return (
      <SafeAreaView style={styles.centered} edges={['top']}>
        <ActivityIndicator color={FudsColors.primary} size="large" />
        <Text style={styles.loadingText}>Preparing payment…</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => {
            if (phase === 'success') goToOrders();
            else safeGoBack('/(app)/(tabs)/orders');
          }}
          hitSlop={8}
        >
          <Ionicons name="chevron-back" size={22} color={FudsColors.foreground} />
        </TouchableOpacity>
        <Text style={styles.topTitle}>Pay for order</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Order #{orderId}</Text>
          <Text style={styles.summaryAmount}>{amountLabel}</Text>
          <Text style={styles.summaryHint}>
            Paystack · card or bank transfer. FUDS never stores your card.
          </Text>
        </View>

        {error ? (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle" size={16} color={FudsColors.destructive} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {statusMessage && phase !== 'success' ? (
          <View style={styles.infoBanner}>
            <Ionicons name="information-circle" size={16} color={FudsColors.primary} />
            <Text style={styles.infoText}>{statusMessage}</Text>
          </View>
        ) : null}

        {phase === 'success' && (
          <View style={styles.successBlock}>
            <View style={styles.successIcon}>
              <Ionicons name="checkmark-circle" size={56} color={FudsColors.openText} />
            </View>
            <Text style={styles.successTitle}>Payment confirmed</Text>
            <Text style={styles.successSub}>
              {statusMessage ?? 'Your order is paid and being prepared.'}
            </Text>
            <FudsButton label="View my orders" onPress={goToOrders} />
          </View>
        )}

        {(phase === 'choose' || phase === 'error') && (
          <View style={styles.methodBlock}>
            <Text style={styles.sectionTitle}>How do you want to pay?</Text>
            <TouchableOpacity
              style={styles.methodCard}
              activeOpacity={0.88}
              disabled={busy}
              onPress={() => void startCard()}
            >
              <View style={[styles.methodIcon, { backgroundColor: 'rgba(29,158,117,0.12)' }]}>
                <Ionicons name="card" size={22} color={FudsColors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.methodTitle}>Card</Text>
                <Text style={styles.methodBody}>
                  Secure Paystack page — debit/credit card or wallet.
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={FudsColors.mutedForeground} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.methodCard}
              activeOpacity={0.88}
              disabled={busy}
              onPress={() => void startTransfer()}
            >
              <View style={[styles.methodIcon, { backgroundColor: '#FEF3C7' }]}>
                <Ionicons name="business" size={22} color="#B45309" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.methodTitle}>Bank transfer</Text>
                <Text style={styles.methodBody}>
                  Paystack checkout shows a temporary account for this payment.
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={FudsColors.mutedForeground} />
            </TouchableOpacity>

            {busy ? (
              <ActivityIndicator color={FudsColors.primary} style={{ marginTop: 12 }} />
            ) : null}
          </View>
        )}

        {(phase === 'card_ready' || phase === 'card_processing') && cardPayment && (
          <View style={styles.methodBlock}>
            <Text style={styles.sectionTitle}>Card checkout</Text>
            <View style={styles.detailCard}>
              <Row label="Amount" value={`₦${Number(cardPayment.amount).toLocaleString()}`} />
              <Row label="Reference" value={cardPayment.reference} mono />
              <Row label="Status" value={cardPayment.status} last />
            </View>
            <FudsButton
              label={phase === 'card_processing' ? 'Opening Paystack…' : 'Pay with Paystack'}
              loading={busy || phase === 'card_processing'}
              onPress={() =>
                void openHostedCheckout(
                  cardPayment.authorization_url,
                  cardPayment.reference,
                  'card_processing',
                  'card_ready'
                )
              }
            />
            <FudsButton
              label="Check payment"
              variant="ghost"
              disabled={busy}
              onPress={() => void verifyReference(cardPayment.reference)}
            />
            <TouchableOpacity
              onPress={() => {
                setCardPayment(null);
                setPhase('choose');
              }}
              style={styles.switchMethod}
            >
              <Text style={styles.switchMethodText}>Choose another method</Text>
            </TouchableOpacity>
          </View>
        )}

        {(phase === 'transfer_ready' || phase === 'transfer_processing') && transferPayment && (
          <View style={styles.methodBlock}>
            <Text style={styles.sectionTitle}>Bank transfer</Text>
            <View style={styles.detailCard}>
              <Row
                label="Amount"
                value={`₦${Number(transferPayment.amount).toLocaleString()}`}
              />
              <Row label="Reference" value={transferPayment.reference} mono />
              <Row label="Status" value={transferPayment.status} last />
            </View>
            <Text style={styles.instructions}>
              {transferPayment.instructions ||
                'Open Paystack to see a temporary bank account for this payment. Transfer the exact amount, then return here.'}
            </Text>
            <FudsButton
              label={
                phase === 'transfer_processing'
                  ? 'Opening Paystack…'
                  : 'Pay with bank transfer'
              }
              loading={busy || phase === 'transfer_processing'}
              onPress={() =>
                void openHostedCheckout(
                  transferPayment.authorization_url,
                  transferPayment.reference,
                  'transfer_processing',
                  'transfer_ready'
                )
              }
            />
            <FudsButton
              label="Check payment"
              variant="ghost"
              disabled={busy}
              onPress={() => void verifyReference(transferPayment.reference)}
            />
            <TouchableOpacity
              onPress={() => {
                setTransferPayment(null);
                setPhase('choose');
              }}
              style={styles.switchMethod}
            >
              <Text style={styles.switchMethodText}>Choose another method</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({
  label,
  value,
  mono,
  last,
}: {
  label: string;
  value: string;
  mono?: boolean;
  last?: boolean;
}) {
  return (
    <View style={[styles.row, last && styles.rowLast]}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, mono && styles.mono]} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: FudsColors.background },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: FudsColors.background,
    gap: 12,
  },
  loadingText: { fontSize: 13, fontWeight: '600', color: FudsColors.mutedForeground },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.two,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: FudsColors.card,
    borderWidth: 1,
    borderColor: FudsColors.border,
  },
  topTitle: { fontSize: 17, fontWeight: '800', color: FudsColors.foreground },
  scroll: { padding: Spacing.three, paddingBottom: Spacing.six, gap: Spacing.three },
  summaryCard: {
    backgroundColor: FudsColors.card,
    borderRadius: FudsRadius.xl,
    borderWidth: 1,
    borderColor: FudsColors.border,
    padding: Spacing.four,
    ...FudsShadow.sm,
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: FudsColors.mutedForeground,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  summaryAmount: {
    fontSize: 32,
    fontWeight: '900',
    color: FudsColors.foreground,
    marginTop: 6,
  },
  summaryHint: {
    fontSize: 12,
    color: FudsColors.mutedForeground,
    fontWeight: '600',
    marginTop: 8,
    lineHeight: 18,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: Spacing.two,
    backgroundColor: '#FEF2F2',
    borderRadius: FudsRadius.md,
  },
  errorText: { flex: 1, color: FudsColors.destructive, fontSize: 12, fontWeight: '600' },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: Spacing.two,
    backgroundColor: 'rgba(29,158,117,0.1)',
    borderRadius: FudsRadius.md,
  },
  infoText: { flex: 1, color: FudsColors.foreground, fontSize: 12, fontWeight: '600' },
  methodBlock: { gap: Spacing.two },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: FudsColors.foreground,
    marginBottom: 4,
  },
  methodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: FudsColors.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: FudsColors.border,
    padding: Spacing.three,
    ...FudsShadow.sm,
  },
  methodIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  methodTitle: { fontSize: 15, fontWeight: '900', color: FudsColors.foreground },
  methodBody: {
    fontSize: 12,
    color: FudsColors.mutedForeground,
    fontWeight: '600',
    marginTop: 2,
    lineHeight: 17,
  },
  detailCard: {
    backgroundColor: FudsColors.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: FudsColors.border,
    overflow: 'hidden',
    ...FudsShadow.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: Spacing.three,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: FudsColors.border,
  },
  rowLast: { borderBottomWidth: 0 },
  rowLabel: { fontSize: 11, fontWeight: '800', color: FudsColors.mutedForeground },
  rowValue: {
    flex: 1,
    textAlign: 'right',
    fontSize: 14,
    fontWeight: '800',
    color: FudsColors.foreground,
  },
  mono: { fontVariant: ['tabular-nums'], letterSpacing: 0.4 },
  instructions: {
    fontSize: 13,
    color: FudsColors.mutedForeground,
    fontWeight: '600',
    lineHeight: 19,
  },
  switchMethod: { alignItems: 'center', paddingVertical: 8 },
  switchMethodText: { fontSize: 13, fontWeight: '800', color: FudsColors.mutedForeground },
  successBlock: {
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.four,
  },
  successIcon: {
    width: 96,
    height: 96,
    borderRadius: 32,
    backgroundColor: FudsColors.openBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  successTitle: { fontSize: 22, fontWeight: '900', color: FudsColors.foreground },
  successSub: {
    fontSize: 14,
    color: FudsColors.mutedForeground,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: Spacing.two,
    lineHeight: 20,
  },
});
