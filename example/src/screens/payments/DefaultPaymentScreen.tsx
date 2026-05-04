import React, { useRef, useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Modal,
} from 'react-native';
import { Bootpay } from 'react-native-bootpay-api';
import {
  CLIENT_KEY,
  APP_SCHEME,
  PG_LIST,
  METHOD_LIST,
} from '../../utils/BootpayConfig';

interface PaymentResultData {
  receipt_id?: string;
  order_id?: string;
  order_name?: string;
  price?: number;
  method?: string;
  pg?: string;
}

interface DefaultPaymentScreenProps {
  onBack: () => void;
}

export function DefaultPaymentScreen({ onBack }: DefaultPaymentScreenProps) {
  const bootpay = useRef<Bootpay>(null);

  // 상품 정보
  const productName = '프리미엄 무선 마우스';
  const productDescription = '인체공학적 디자인의 고급 무선 마우스입니다.\n정밀한 트래킹과 편안한 그립감을 제공합니다.';
  const productPrice = 1000;

  const [quantity, setQuantity] = useState(1);
  const [selectedPg, setSelectedPg] = useState('나이스페이');
  const [selectedMethod, setSelectedMethod] = useState('카드');
  const [showResult, setShowResult] = useState(false);
  const [paymentResult, setPaymentResult] = useState<PaymentResultData | null>(null);

  const totalPrice = productPrice * quantity;

  const formatPrice = (price: number) => `${price.toLocaleString()}원`;

  const requestPayment = useCallback(() => {
    const payload = {
      pg: selectedPg,
      method: selectedMethod,
      order_name: productName,
      order_id: `order_${Date.now()}`,
      price: totalPrice,
    };

    const items = [
      {
        name: productName,
        qty: quantity,
        id: 'ITEM_MOUSE',
        price: productPrice,
      },
    ];

    const user = {
      id: 'user_1234',
      username: '홍길동',
      email: 'test@bootpay.co.kr',
      phone: '01012345678',
    };

    const extra = {
      card_quota: '0,2,3,4,5,6',
      app_scheme: APP_SCHEME,
    };

    bootpay.current?.requestPayment(payload, items, user, extra);
  }, [selectedPg, selectedMethod, totalPrice, quantity]);

  const onCancel = useCallback((data: unknown) => {
    console.log('------- onCancel:', data);
  }, []);

  const onError = useCallback((data: unknown) => {
    console.log('------- onError:', data);
  }, []);

  const onIssued = useCallback((data: unknown) => {
    console.log('------- onIssued:', data);
  }, []);

  const onConfirm = useCallback((data: unknown) => {
    console.log('------- onConfirm:', data);
    bootpay.current?.transactionConfirm();
    return true;
  }, []);

  const onDone = useCallback((data: unknown) => {
    console.log('------- onDone:', data);
    setPaymentResult(data as PaymentResultData);
    setShowResult(true);
  }, []);

  const onClose = useCallback(() => {
    console.log('------- onClose');
  }, []);

  const closePaymentResult = useCallback(() => {
    setShowResult(false);
    setPaymentResult(null);
    onBack();
  }, [onBack]);

  return (
    <SafeAreaView style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>일반 결제</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView style={styles.content}>
        {/* 상품 이미지 */}
        <View style={styles.productImage}>
          <Text style={styles.productIcon}>🖱️</Text>
        </View>

        {/* 상품 정보 */}
        <Text style={styles.productName}>{productName}</Text>
        <Text style={styles.productPrice}>{formatPrice(productPrice)}</Text>
        <Text style={styles.productDescription}>{productDescription}</Text>

        <View style={styles.divider} />

        {/* 수량 선택 */}
        <View style={styles.quantityRow}>
          <Text style={styles.sectionLabel}>수량</Text>
          <View style={styles.quantitySelector}>
            <TouchableOpacity
              style={styles.quantityButton}
              onPress={() => quantity > 1 && setQuantity(quantity - 1)}
            >
              <Text style={styles.quantityButtonText}>-</Text>
            </TouchableOpacity>
            <Text style={styles.quantityValue}>{quantity}</Text>
            <TouchableOpacity
              style={styles.quantityButton}
              onPress={() => setQuantity(quantity + 1)}
            >
              <Text style={styles.quantityButtonText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* PG사 선택 */}
        <Text style={styles.sectionLabel}>PG사 선택</Text>
        <View style={styles.chipContainer}>
          {PG_LIST.map((pg) => (
            <TouchableOpacity
              key={pg}
              style={[styles.chip, selectedPg === pg && styles.chipSelected]}
              onPress={() => setSelectedPg(pg)}
            >
              <Text style={[styles.chipText, selectedPg === pg && styles.chipTextSelected]}>
                {pg}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* 결제수단 선택 */}
        <Text style={styles.sectionLabel}>결제수단 선택</Text>
        <View style={styles.chipContainer}>
          {METHOD_LIST.map((method) => (
            <TouchableOpacity
              key={method}
              style={[styles.chip, selectedMethod === method && styles.chipSelected]}
              onPress={() => setSelectedMethod(method)}
            >
              <Text style={[styles.chipText, selectedMethod === method && styles.chipTextSelected]}>
                {method}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* 결제 버튼 */}
      <View style={styles.payButtonContainer}>
        <TouchableOpacity style={styles.payButton} onPress={requestPayment}>
          <Text style={styles.payButtonText}>{formatPrice(totalPrice)} 결제하기</Text>
        </TouchableOpacity>
      </View>

      <Bootpay
        ref={bootpay}
        client_key={CLIENT_KEY}
        onCancel={onCancel}
        onError={onError}
        onIssued={onIssued}
        onConfirm={onConfirm}
        onDone={onDone}
        onClose={onClose}
      />

      {/* 결제 결과 Modal */}
      <Modal
        visible={showResult}
        animationType="slide"
        transparent={false}
        onRequestClose={closePaymentResult}
      >
        <SafeAreaView style={styles.resultContainer}>
          <View style={styles.header}>
            <View style={styles.backButton} />
            <Text style={styles.headerTitle}>결제 완료</Text>
            <View style={styles.headerRight} />
          </View>

          <View style={styles.resultContent}>
            <View style={styles.resultIcon}>
              <Text style={styles.resultIconText}>✓</Text>
            </View>
            <Text style={styles.resultTitle}>결제가 완료되었습니다</Text>

            {paymentResult && (
              <View style={styles.resultDetails}>
                {paymentResult.order_name && (
                  <View style={styles.resultRow}>
                    <Text style={styles.resultLabel}>주문명</Text>
                    <Text style={styles.resultValue}>{paymentResult.order_name}</Text>
                  </View>
                )}
                {paymentResult.price && (
                  <View style={styles.resultRow}>
                    <Text style={styles.resultLabel}>결제금액</Text>
                    <Text style={styles.resultValue}>{formatPrice(paymentResult.price)}</Text>
                  </View>
                )}
                {paymentResult.pg && paymentResult.method && (
                  <View style={styles.resultRow}>
                    <Text style={styles.resultLabel}>결제수단</Text>
                    <Text style={styles.resultValue}>{paymentResult.pg} - {paymentResult.method}</Text>
                  </View>
                )}
                {paymentResult.order_id && (
                  <View style={styles.resultRow}>
                    <Text style={styles.resultLabel}>주문번호</Text>
                    <Text style={styles.resultValue}>{paymentResult.order_id}</Text>
                  </View>
                )}
                {paymentResult.receipt_id && (
                  <View style={styles.resultRow}>
                    <Text style={styles.resultLabel}>영수증ID</Text>
                    <Text style={styles.resultValue}>{paymentResult.receipt_id}</Text>
                  </View>
                )}
              </View>
            )}
          </View>

          <View style={styles.payButtonContainer}>
            <TouchableOpacity style={styles.payButton} onPress={closePaymentResult}>
              <Text style={styles.payButtonText}>확인</Text>
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
  content: {
    flex: 1,
    padding: 20,
  },
  productImage: {
    width: '100%',
    height: 200,
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  productIcon: {
    fontSize: 60,
  },
  productName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  productPrice: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#3182f6',
    marginBottom: 16,
  },
  productDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 21,
  },
  divider: {
    height: 1,
    backgroundColor: '#eee',
    marginVertical: 24,
  },
  quantityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  quantitySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
  },
  quantityButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityButtonText: {
    fontSize: 20,
    color: '#333',
  },
  quantityValue: {
    width: 40,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 20,
    backgroundColor: '#fff',
  },
  chipSelected: {
    backgroundColor: '#3182f6',
    borderColor: '#3182f6',
  },
  chipText: {
    fontSize: 14,
    color: '#333',
  },
  chipTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  payButtonContainer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  payButton: {
    backgroundColor: '#3182f6',
    borderRadius: 12,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  payButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  // 결과 화면 스타일
  resultContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  resultContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  resultIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  resultIconText: {
    fontSize: 40,
    color: '#fff',
  },
  resultTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 32,
  },
  resultDetails: {
    width: '100%',
  },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
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
});
