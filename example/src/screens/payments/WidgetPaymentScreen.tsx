import React, { useRef, useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
  Modal,
} from 'react-native';
import {
  BootpayWidget,
  WidgetPayload,
  WidgetData,
} from 'react-native-bootpay-api';
import {
  ANDROID_APPLICATION_ID,
  IOS_APPLICATION_ID,
  APP_SCHEME,
} from '../../utils/BootpayConfig';

interface PaymentResultData {
  receipt_id?: string;
  order_id?: string;
  price?: number;
  method?: string;
  pg?: string;
  purchased_at?: string;
}

interface WidgetPaymentScreenProps {
  onBack: () => void;
}

// 상품 정보
const ORDER_NAME = '테스트 상품';
const PRICE = 1000;

export function WidgetPaymentScreen({ onBack }: WidgetPaymentScreenProps) {
  const bootpayWidget = useRef<BootpayWidget>(null);

  const [widgetHeight, setWidgetHeight] = useState(200);
  const [widgetData, setWidgetData] = useState<WidgetData | null>(null);
  const [widgetTop, setWidgetTop] = useState(0);

  const [showPaymentResult, setShowPaymentResult] = useState(false);
  const [paymentResult, setPaymentResult] = useState<PaymentResultData | null>(null);

  const widgetPlaceholderRef = useRef<View>(null);

  const formatPrice = (price: number) => `${price.toLocaleString()}원`;

  const getWidgetPayload = useCallback((): WidgetPayload => {
    return {
      widget_key: 'default-widget',
      widget_sandbox: true,
      widget_use_terms: true,
      order_name: ORDER_NAME,
      price: PRICE,
      order_id: `order_${Date.now()}`,
      extra: {
        app_scheme: APP_SCHEME,
        separately_confirmed: true,
        display_success_result: false,
        display_error_result: false,
        show_close_button: false,
      },
    };
  }, []);

  const measureWidgetPosition = useCallback(() => {
    if (widgetPlaceholderRef.current) {
      widgetPlaceholderRef.current.measureInWindow((x, y, width, height) => {
        console.log('[Widget] measureInWindow - x:', x, 'y:', y, 'width:', width, 'height:', height);
        if (y > 0) {
          setWidgetTop(y);
        }
      });
    }
  }, []);

  const onWidgetLayout = useCallback(() => {
    setTimeout(measureWidgetPosition, 100);
  }, [measureWidgetPosition]);

  // Widget 콜백들
  const onWidgetReady = useCallback(() => {
    console.log('[Widget] ===== READY =====');
    const payload = getWidgetPayload();
    bootpayWidget.current?.renderWidget(payload);
  }, [getWidgetPayload]);

  const onWidgetResize = useCallback((height: number) => {
    console.log('[Widget] ===== RESIZE:', height);
    setWidgetHeight(height);
  }, []);

  const onWidgetChangePayment = useCallback((data: WidgetData | null) => {
    console.log('[Widget] ===== CHANGE PAYMENT =====');
    setWidgetData(data);
  }, []);

  const onWidgetChangeTerms = useCallback((data: WidgetData | null) => {
    console.log('[Widget] ===== CHANGE TERMS =====');
    setWidgetData(data);
  }, []);

  const onCancel = useCallback((data: unknown) => {
    console.log('[Widget] onCancel:', data);
  }, []);

  const onError = useCallback((data: unknown) => {
    console.log('[Widget] onError:', data);
    const errorData = data as { message?: string };
    Alert.alert('결제 오류', errorData?.message || '결제 중 오류가 발생했습니다.');
  }, []);

  const onIssued = useCallback((data: unknown) => {
    console.log('[Widget] onIssued (가상계좌 발급):', data);
    Alert.alert('가상계좌 발급', '가상계좌가 발급되었습니다. 입금 후 결제가 완료됩니다.');
  }, []);

  const onConfirm = useCallback((data: unknown) => {
    console.log('[Widget] onConfirm:', data);
    bootpayWidget.current?.transactionConfirm();
    return true;
  }, []);

  const onDone = useCallback((data: unknown) => {
    console.log('[Widget] onDone:', data);
    setPaymentResult(data as PaymentResultData);
    setShowPaymentResult(true);
  }, []);

  const onClose = useCallback(() => {
    console.log('[Widget] onClose');
  }, []);

  const closePaymentResult = useCallback(() => {
    setShowPaymentResult(false);
    setPaymentResult(null);
    onBack();
  }, [onBack]);

  const isCompleted =
    (widgetData?.term_passed ?? false) && (widgetData?.completed ?? false);

  const goPayment = useCallback(() => {
    if (!isCompleted) {
      Alert.alert('알림', '결제수단 선택과 약관동의를 완료해주세요.');
      return;
    }
    console.log('[Widget] ===== Go Payment =====');
    bootpayWidget.current?.requestPayment();
  }, [isCompleted]);

  return (
    <SafeAreaView style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>위젯 결제</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollViewContent}>
        {/* 상품 정보 */}
        <View style={styles.productSection}>
          <Text style={styles.sectionTitle}>주문상품</Text>
          <View style={styles.productCard}>
            <Text style={styles.productName}>{ORDER_NAME}</Text>
            <Text style={styles.productPrice}>{formatPrice(PRICE)}</Text>
          </View>
        </View>

        {/* Widget placeholder */}
        <View
          ref={widgetPlaceholderRef}
          style={[styles.widgetWrapper, { minHeight: widgetHeight }]}
          onLayout={onWidgetLayout}
        />
      </ScrollView>

      {/* 결제 버튼 */}
      <View style={styles.payButtonContainer}>
        <TouchableOpacity
          style={[styles.payButton, !isCompleted && styles.payButtonDisabled]}
          onPress={goPayment}
          disabled={!isCompleted}
        >
          <Text style={styles.payButtonText}>
            {formatPrice(PRICE)} 결제하기
          </Text>
        </TouchableOpacity>
      </View>

      {/* BootpayWidget */}
      <BootpayWidget
        ref={bootpayWidget}
        ios_application_id={IOS_APPLICATION_ID}
        android_application_id={ANDROID_APPLICATION_ID}
        height={widgetHeight}
        widgetTop={widgetTop}
        onWidgetReady={onWidgetReady}
        onWidgetResize={onWidgetResize}
        onWidgetChangePayment={onWidgetChangePayment}
        onWidgetChangeTerms={onWidgetChangeTerms}
        onCancel={onCancel}
        onError={onError}
        onIssued={onIssued}
        onConfirm={onConfirm}
        onDone={onDone}
        onClose={onClose}
      />

      {/* 결제 결과 Modal */}
      <Modal
        visible={showPaymentResult}
        animationType="slide"
        transparent={false}
        onRequestClose={closePaymentResult}
      >
        <SafeAreaView style={styles.resultContainer}>
          <View style={styles.resultHeader}>
            <Text style={styles.resultTitle}>결제 완료</Text>
          </View>
          <View style={styles.resultContent}>
            <View style={styles.resultIcon}>
              <Text style={styles.resultIconText}>✓</Text>
            </View>
            <Text style={styles.resultMessage}>
              결제가 성공적으로 완료되었습니다.
            </Text>

            {paymentResult && (
              <View style={styles.resultDetails}>
                {paymentResult.receipt_id && (
                  <View style={styles.resultRow}>
                    <Text style={styles.resultLabel}>영수증 ID</Text>
                    <Text style={styles.resultValue}>{paymentResult.receipt_id}</Text>
                  </View>
                )}
                {paymentResult.order_id && (
                  <View style={styles.resultRow}>
                    <Text style={styles.resultLabel}>주문번호</Text>
                    <Text style={styles.resultValue}>{paymentResult.order_id}</Text>
                  </View>
                )}
                {paymentResult.price && (
                  <View style={styles.resultRow}>
                    <Text style={styles.resultLabel}>결제금액</Text>
                    <Text style={styles.resultValue}>{formatPrice(paymentResult.price)}</Text>
                  </View>
                )}
                {paymentResult.method && (
                  <View style={styles.resultRow}>
                    <Text style={styles.resultLabel}>결제수단</Text>
                    <Text style={styles.resultValue}>{paymentResult.method}</Text>
                  </View>
                )}
                {paymentResult.pg && (
                  <View style={styles.resultRow}>
                    <Text style={styles.resultLabel}>PG사</Text>
                    <Text style={styles.resultValue}>{paymentResult.pg}</Text>
                  </View>
                )}
              </View>
            )}
          </View>
          <View style={styles.resultButtonContainer}>
            <TouchableOpacity
              style={styles.resultButton}
              onPress={closePaymentResult}
            >
              <Text style={styles.resultButtonText}>확인</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  backButtonText: {
    fontSize: 24,
    color: '#333',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  headerRight: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    flexGrow: 1,
  },
  productSection: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  sectionTitle: {
    fontWeight: '700',
    fontSize: 18,
    lineHeight: 26,
    marginBottom: 12,
  },
  productCard: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 16,
  },
  productName: {
    fontWeight: '600',
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 8,
    color: '#333',
  },
  productPrice: {
    color: '#3182f6',
    fontWeight: '600',
    fontSize: 18,
    lineHeight: 26,
  },
  widgetWrapper: {
    backgroundColor: '#fff',
  },
  payButtonContainer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  payButton: {
    backgroundColor: '#3182f6',
    borderRadius: 10,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  payButtonDisabled: {
    backgroundColor: '#ccc',
  },
  payButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  // 결제 결과 화면 스타일
  resultContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  resultHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    alignItems: 'center',
  },
  resultTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  resultContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  resultIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#3182f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  resultIconText: {
    fontSize: 32,
    color: '#fff',
    fontWeight: '700',
  },
  resultMessage: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 24,
    textAlign: 'center',
  },
  resultDetails: {
    width: '100%',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingTop: 16,
  },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  resultLabel: {
    fontSize: 14,
    color: '#666',
  },
  resultValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    maxWidth: '60%',
    textAlign: 'right',
  },
  resultButtonContainer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  resultButton: {
    backgroundColor: '#3182f6',
    borderRadius: 10,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});
