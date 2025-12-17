import React, { useRef, useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { Bootpay } from 'react-native-bootpay-api';
import {
  ANDROID_APPLICATION_ID,
  IOS_APPLICATION_ID,
  APP_SCHEME,
  SUBSCRIPTION_PG_LIST,
} from '../../utils/BootpayConfig';

interface SubscriptionResultData {
  billing_key?: string;
  pg?: string;
  method_symbol?: string;
  card_name?: string;
}

interface SubscriptionScreenProps {
  onBack: () => void;
}

export function SubscriptionScreen({ onBack }: SubscriptionScreenProps) {
  const bootpay = useRef<Bootpay>(null);

  // 상품 정보
  const productName = '프리미엄 멤버십 (월간)';
  const productDescription = '매월 자동으로 결제되는 프리미엄 멤버십입니다.\n다양한 혜택과 할인을 제공합니다.';
  const productPrice = 9900;

  const [selectedPg, setSelectedPg] = useState('나이스페이');
  const [showResult, setShowResult] = useState(false);
  const [subscriptionResult, setSubscriptionResult] = useState<SubscriptionResultData | null>(null);

  const formatPrice = (price: number) => `${price.toLocaleString()}원`;

  const requestSubscription = useCallback(() => {
    const payload = {
      pg: selectedPg,
      order_name: productName,
      subscription_id: `sub_${Date.now()}`,
      price: productPrice,
    };

    const items = [
      {
        name: productName,
        qty: 1,
        id: 'ITEM_MEMBERSHIP',
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
      app_scheme: APP_SCHEME,
    };

    bootpay.current?.requestSubscription(payload, items, user, extra);
  }, [selectedPg]);

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
    return true;
  }, []);

  const onDone = useCallback((data: unknown) => {
    console.log('------- onDone:', data);
    setSubscriptionResult(data as SubscriptionResultData);
    setShowResult(true);
  }, []);

  const onClose = useCallback(() => {
    console.log('------- onClose');
  }, []);

  if (showResult && subscriptionResult) {
    return (
      <SubscriptionResultScreen
        result={subscriptionResult}
        onConfirm={() => {
          setShowResult(false);
          setSubscriptionResult(null);
          onBack();
        }}
      />
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>정기결제 (인증)</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView style={styles.content}>
        {/* 상품 이미지 */}
        <View style={[styles.productImage, { backgroundColor: '#fff3e0' }]}>
          <Text style={styles.productIcon}>💳</Text>
          <Text style={styles.premiumBadge}>PREMIUM</Text>
        </View>

        {/* 상품 정보 */}
        <Text style={styles.productName}>{productName}</Text>
        <Text style={[styles.productPrice, { color: '#ff9800' }]}>{formatPrice(productPrice)} / 월</Text>
        <Text style={styles.productDescription}>{productDescription}</Text>

        {/* 안내 */}
        <View style={[styles.infoBox, { backgroundColor: '#fff3e0' }]}>
          <View style={styles.infoHeader}>
            <Text style={styles.infoIcon}>ℹ️</Text>
            <Text style={[styles.infoTitle, { color: '#e65100' }]}>인증 정기결제 안내</Text>
          </View>
          <Text style={[styles.infoText, { color: '#bf360c' }]}>
            • PG사에서 제공하는 카드 등록 UI를 사용합니다{'\n'}
            • 3DS 인증을 통한 안전한 카드 등록{'\n'}
            • 등록된 빌링키로 정기 결제 가능
          </Text>
        </View>

        <View style={styles.divider} />

        {/* PG사 선택 */}
        <Text style={styles.sectionLabel}>PG사 선택</Text>
        {SUBSCRIPTION_PG_LIST.map((pg) => (
          <TouchableOpacity
            key={pg}
            style={[styles.radioTile, selectedPg === pg && styles.radioTileSelectedOrange]}
            onPress={() => setSelectedPg(pg)}
          >
            <View style={[styles.radioCircle, selectedPg === pg && styles.radioCircleSelectedOrange]}>
              {selectedPg === pg && <View style={styles.radioInnerOrange} />}
            </View>
            <Text style={[styles.radioLabel, selectedPg === pg && styles.radioLabelSelected]}>
              {pg}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* 등록 버튼 */}
      <View style={styles.payButtonContainer}>
        <TouchableOpacity style={[styles.payButton, { backgroundColor: '#ff9800' }]} onPress={requestSubscription}>
          <Text style={styles.payButtonText}>카드 등록하기 (인증)</Text>
        </TouchableOpacity>
      </View>

      <Bootpay
        ref={bootpay}
        ios_application_id={IOS_APPLICATION_ID}
        android_application_id={ANDROID_APPLICATION_ID}
        onCancel={onCancel}
        onError={onError}
        onIssued={onIssued}
        onConfirm={onConfirm}
        onDone={onDone}
        onClose={onClose}
      />
    </SafeAreaView>
  );
}

// 정기결제 결과 화면
function SubscriptionResultScreen({
  result,
  onConfirm,
}: {
  result: SubscriptionResultData;
  onConfirm: () => void;
}) {
  return (
    <SafeAreaView style={styles.resultContainer}>
      <View style={styles.header}>
        <View style={styles.backButton} />
        <Text style={styles.headerTitle}>등록 완료</Text>
        <View style={styles.headerRight} />
      </View>

      <View style={styles.resultContent}>
        <View style={styles.resultIcon}>
          <Text style={styles.resultIconText}>✓</Text>
        </View>
        <Text style={styles.resultTitle}>카드 등록 완료</Text>
        <Text style={styles.resultSubtitle}>빌링키가 발급되었습니다</Text>

        <View style={styles.resultDetails}>
          {result.pg && (
            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>PG사</Text>
              <Text style={styles.resultValue}>{result.pg}</Text>
            </View>
          )}
          {result.method_symbol && (
            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>결제수단</Text>
              <Text style={styles.resultValue}>{result.method_symbol}</Text>
            </View>
          )}
          {result.card_name && (
            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>카드명</Text>
              <Text style={styles.resultValue}>{result.card_name}</Text>
            </View>
          )}
          {result.billing_key && (
            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>빌링키</Text>
              <Text style={styles.resultValue} numberOfLines={1}>{result.billing_key}</Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.payButtonContainer}>
        <TouchableOpacity style={[styles.payButton, { backgroundColor: '#ff9800' }]} onPress={onConfirm}>
          <Text style={styles.payButtonText}>확인</Text>
        </TouchableOpacity>
      </View>
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
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  productIcon: {
    fontSize: 60,
    marginBottom: 8,
  },
  premiumBadge: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#e65100',
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
    marginBottom: 16,
  },
  productDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 21,
  },
  infoBox: {
    borderRadius: 12,
    padding: 16,
    marginTop: 24,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  infoText: {
    fontSize: 13,
    lineHeight: 22,
  },
  divider: {
    height: 1,
    backgroundColor: '#eee',
    marginVertical: 24,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  radioTile: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    marginBottom: 8,
  },
  radioTileSelectedOrange: {
    borderColor: '#ff9800',
    borderWidth: 2,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#999',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  radioCircleSelectedOrange: {
    borderColor: '#ff9800',
  },
  radioInnerOrange: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#ff9800',
  },
  radioLabel: {
    fontSize: 14,
    color: '#333',
  },
  radioLabelSelected: {
    fontWeight: '600',
  },
  payButtonContainer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  payButton: {
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
    marginBottom: 8,
  },
  resultSubtitle: {
    fontSize: 14,
    color: '#666',
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
