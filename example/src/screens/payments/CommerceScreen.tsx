import React, { useRef, useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Modal,
  Switch,
} from 'react-native';
import {
  BootpayCommerce,
  CommercePayload,
  CommerceUser,
  CommerceProduct,
  CommerceExtra,
} from 'react-native-bootpay-api';

// 환경별 설정 (iOS SDK와 동일)
const ENV_CONFIG: Record<string, { client_key: string; plans: Record<string, { monthly_product_id: string; yearly_product_id: string }> }> = {
  development: {
    client_key: 'hxS-Up--5RvT6oU6QJE0JA',
    plans: {
      starter: {
        monthly_product_id: '69268625d8df8fa1837cf661',
        yearly_product_id: '692686c4d8df8fa1837cf666',
      },
      pro: {
        monthly_product_id: '692686e5d8df8fa1837cf66b',
        yearly_product_id: '69268721d8df8fa1837cf670',
      },
      enterprise: {
        monthly_product_id: '69268783d8df8fa1837cf675',
        yearly_product_id: '692687a2d8df8fa1837cf67a',
      },
    },
  },
  production: {
    client_key: 'sEN72kYZBiyMNytA8nUGxQ',
    plans: {
      starter: {
        monthly_product_id: '6927d893ff30795ff003d374',
        yearly_product_id: '6927d8c310561eabadddcfae',
      },
      pro: {
        monthly_product_id: '6927d8f9ff30795ff003d379',
        yearly_product_id: '6927d9167f65277ba9ddcf71',
      },
      enterprise: {
        monthly_product_id: '6927d8f9ff30795ff003d379',
        yearly_product_id: '6927d9167f65277ba9ddcf71',
      },
    },
  },
};

// 플랜 정보
const PLAN_INFO: Record<string, { name: string; monthly_price: number; yearly_price: number; features: string[] }> = {
  starter: {
    name: 'Starter',
    monthly_price: 9900,
    yearly_price: 7900,
    features: ['5GB 클라우드 스토리지', '최대 3개 프로젝트', '기본 분석 대시보드'],
  },
  pro: {
    name: 'Professional',
    monthly_price: 29900,
    yearly_price: 23900,
    features: ['100GB 클라우드 스토리지', '무제한 프로젝트', '고급 분석 및 리포트'],
  },
  enterprise: {
    name: 'Enterprise',
    monthly_price: 99000,
    yearly_price: 79000,
    features: ['무제한 클라우드 스토리지', '무제한 프로젝트', '전용 계정 매니저'],
  },
};

interface PaymentResultData {
  event?: string;
  receipt_id?: string;
  order_id?: string;
  request_id?: string;
  name?: string;
  price?: number;
  message?: string;
  code?: string | number;
  metadata?: Record<string, unknown>;
  [key: string]: unknown;
}

interface CommerceScreenProps {
  onBack: () => void;
}

export function CommerceScreen({ onBack }: CommerceScreenProps) {
  const commerceRef = useRef<BootpayCommerce>(null);

  // 환경 및 플랜 상태 (iOS SDK와 동일)
  const [currentEnv] = useState<'development' | 'production'>('production'); // development API 500 에러로 인해 production 사용
  const [isYearlyBilling, setIsYearlyBilling] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<'starter' | 'pro' | 'enterprise'>('pro');

  const [showResult, setShowResult] = useState(false);
  const [paymentResult, setPaymentResult] = useState<PaymentResultData | null>(null);
  const [resultType, setResultType] = useState<'success' | 'cancel' | 'error'>('success');

  const formatPrice = (price: number) => `₩${price.toLocaleString()}`;

  const getPlanPrice = useCallback((planKey: string) => {
    const plan = PLAN_INFO[planKey];
    return isYearlyBilling ? plan.yearly_price : plan.monthly_price;
  }, [isYearlyBilling]);

  const requestCheckout = useCallback(() => {
    const config = ENV_CONFIG[currentEnv];
    const planConfig = config.plans[selectedPlan];
    const planInfo = PLAN_INFO[selectedPlan];

    const productId = isYearlyBilling
      ? planConfig.yearly_product_id
      : planConfig.monthly_product_id;
    const billingType = isYearlyBilling ? '연간' : '월간';
    const price = getPlanPrice(selectedPlan);

    console.log(`[CommerceExample] 환경: ${currentEnv}, 플랜: ${selectedPlan}, 상품ID: ${productId}`);

    // CommercePayload 생성 (iOS SDK와 동일)
    const payload = new CommercePayload();
    payload.clientKey = config.client_key;
    payload.name = `CloudSync Pro ${planInfo.name} 플랜`;
    payload.memo = `${billingType} 구독 결제`;
    payload.price = price;
    payload.redirectUrl = 'https://api.bootpay.co.kr/v2/callback';
    // usage_api_url 설정 (iOS SDK와 동일)
    payload.usageApiUrl = currentEnv === 'production'
      ? 'https://api.bootapi.com/v1/billing/usage'
      : 'https://dev-api.bootapi.com/v1/billing/usage';
    payload.requestId = `order_${Date.now()}`;
    payload.useAutoLogin = true;
    payload.useNotification = true;

    // 사용자 정보 (iOS SDK와 동일)
    const user = new CommerceUser();
    user.membershipType = 'guest';
    user.userId = 'demo_user_1234';
    user.name = '데모 사용자';
    user.phone = '01040334678';
    user.email = 'demo@example.com';
    payload.user = user;

    // 상품 정보 (iOS SDK와 동일)
    const product = new CommerceProduct();
    product.productId = productId;
    product.duration = -1; // 무기한 구독
    product.quantity = 1;
    payload.products = [product];

    // 메타데이터 (iOS SDK와 동일)
    const orderId = payload.requestId || `order_${Date.now()}`;
    payload.metadata = {
      order_id: orderId,
      plan_key: selectedPlan,
      billing_type: billingType,
      env: currentEnv,
      selected_at: new Date().toISOString(),
    };

    // Extra 옵션 (iOS SDK와 동일)
    const extra = new CommerceExtra();
    extra.separatelyConfirmed = false;
    extra.createOrderImmediately = true;
    payload.extra = extra;

    commerceRef.current?.requestCheckout(payload);
  }, [currentEnv, selectedPlan, isYearlyBilling, getPlanPrice]);

  const onCancel = useCallback((data: unknown) => {
    console.log('------- Commerce onCancel:', data);
    setPaymentResult(data as PaymentResultData);
    setResultType('cancel');
    setShowResult(true);
  }, []);

  const onError = useCallback((data: unknown) => {
    console.log('------- Commerce onError:', data);
    setPaymentResult(data as PaymentResultData);
    setResultType('error');
    setShowResult(true);
  }, []);

  const onDone = useCallback((data: unknown) => {
    console.log('------- Commerce onDone:', data);
    setPaymentResult(data as PaymentResultData);
    setResultType('success');
    setShowResult(true);
  }, []);

  const onClose = useCallback(() => {
    console.log('------- Commerce onClose');
  }, []);

  const closePaymentResult = useCallback(() => {
    setShowResult(false);
    setPaymentResult(null);
    if (resultType === 'success') {
      onBack();
    }
  }, [onBack, resultType]);

  // iOS SDK와 동일한 결과 표시
  const getResultIcon = () => {
    switch (resultType) {
      case 'success':
        return { icon: '✓', color: '#4CAF50' }; // systemGreen
      case 'cancel':
        return { icon: '↩', color: '#FF9800' }; // systemOrange
      case 'error':
        return { icon: '!', color: '#F44336' }; // systemRed
    }
  };

  const getResultTitle = () => {
    switch (resultType) {
      case 'success':
        return '구독 신청 완료'; // iOS SDK: "구독 신청 완료"
      case 'cancel':
        return '결제 취소';
      case 'error':
        return '결제 실패';
    }
  };

  const getResultMessage = () => {
    switch (resultType) {
      case 'success':
        return '구독이 성공적으로 시작되었습니다.';
      case 'cancel':
        return paymentResult?.message || '결제가 취소되었습니다.';
      case 'error':
        return paymentResult?.message || '결제 처리 중 오류가 발생했습니다.';
    }
  };

  // metadata에서 플랜 정보 추출
  const getMetadataValue = (key: string): string | undefined => {
    if (!paymentResult?.metadata) return undefined;
    const metadata = paymentResult.metadata as Record<string, unknown>;
    return metadata[key] as string | undefined;
  };

  const resultStyle = getResultIcon();

  return (
    <SafeAreaView style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Commerce 결제</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView style={styles.content}>
        {/* 헤더 */}
        <Text style={styles.mainTitle}>나에게 맞는 요금제를 선택하세요</Text>
        <Text style={styles.mainSubtitle}>
          모든 요금제에서 14일 무료 체험을 제공합니다
        </Text>

        {/* 결제 주기 토글 */}
        <View style={styles.billingToggle}>
          <Text style={[styles.billingLabel, !isYearlyBilling && styles.billingLabelActive]}>
            월간
          </Text>
          <Switch
            value={isYearlyBilling}
            onValueChange={setIsYearlyBilling}
            trackColor={{ false: '#e2e8f0', true: '#667eea' }}
            thumbColor="#fff"
          />
          <Text style={[styles.billingLabel, isYearlyBilling && styles.billingLabelActive]}>
            연간
          </Text>
          <View style={styles.discountBadge}>
            <Text style={styles.discountText}>20% 할인</Text>
          </View>
        </View>

        {/* 플랜 카드들 */}
        {(['starter', 'pro', 'enterprise'] as const).map((planKey) => {
          const plan = PLAN_INFO[planKey];
          const isSelected = selectedPlan === planKey;
          const isPopular = planKey === 'pro';
          const planIcon = planKey === 'starter' ? '🚀' : planKey === 'pro' ? '⚡' : '🏢';

          return (
            <TouchableOpacity
              key={planKey}
              style={[
                styles.planCard,
                isSelected && styles.planCardSelected,
                isPopular && styles.planCardPopular,
              ]}
              onPress={() => {
                if (planKey === 'enterprise') {
                  // Enterprise는 별도 문의
                  return;
                }
                setSelectedPlan(planKey);
              }}
              activeOpacity={planKey === 'enterprise' ? 1 : 0.7}
            >
              {isPopular && (
                <View style={styles.popularBadge}>
                  <Text style={styles.popularText}>가장 인기</Text>
                </View>
              )}

              <Text style={styles.planIcon}>{planIcon}</Text>
              <Text style={styles.planName}>{plan.name}</Text>
              <View style={styles.priceRow}>
                <Text style={[styles.planPrice, isPopular && styles.planPricePopular]}>
                  {formatPrice(getPlanPrice(planKey))}
                </Text>
                <Text style={styles.pricePeriod}>/월</Text>
              </View>

              {/* 기능 목록 */}
              {plan.features.map((feature, idx) => (
                <View key={idx} style={styles.featureRow}>
                  <Text style={styles.checkmark}>✓</Text>
                  <Text style={styles.featureText}>{feature}</Text>
                </View>
              ))}

              <TouchableOpacity
                style={[
                  styles.selectButton,
                  isPopular && styles.selectButtonPopular,
                ]}
                onPress={() => {
                  if (planKey === 'enterprise') {
                    // Enterprise 문의 안내
                    console.log('Enterprise 플랜은 영업팀으로 문의해 주세요.');
                    return;
                  }
                  setSelectedPlan(planKey);
                  requestCheckout();
                }}
              >
                <Text
                  style={[
                    styles.selectButtonText,
                    isPopular && styles.selectButtonTextPopular,
                  ]}
                >
                  {planKey === 'enterprise' ? '문의하기' : `${plan.name} 시작하기`}
                </Text>
              </TouchableOpacity>
            </TouchableOpacity>
          );
        })}

        {/* 안내 문구 */}
        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>Commerce 결제 안내</Text>
          <Text style={styles.infoText}>
            • Client Key: {ENV_CONFIG[currentEnv].client_key}
          </Text>
          <Text style={styles.infoText}>
            • 환경: {currentEnv}
          </Text>
          <Text style={styles.infoText}>
            • 결제 주기: {isYearlyBilling ? '연간' : '월간'}
          </Text>
        </View>
      </ScrollView>

      <BootpayCommerce
        ref={commerceRef}
        onCancel={onCancel}
        onError={onError}
        onDone={onDone}
        onClose={onClose}
      />

      {/* 결제 결과 Modal - iOS SDK PaymentResultController와 동일 */}
      <Modal
        visible={showResult}
        animationType="slide"
        transparent={false}
        onRequestClose={closePaymentResult}
      >
        <SafeAreaView style={styles.resultContainer}>
          <View style={styles.header}>
            <View style={styles.backButton} />
            <Text style={styles.headerTitle}>결제 결과</Text>
            <View style={styles.headerRight} />
          </View>

          <ScrollView style={styles.resultScrollView}>
            <View style={styles.resultCard}>
              {/* 상태 아이콘 */}
              <View
                style={[
                  styles.resultIcon,
                  { backgroundColor: resultStyle.color },
                ]}
              >
                <Text style={styles.resultIconText}>{resultStyle.icon}</Text>
              </View>

              {/* 타이틀 & 메시지 */}
              <Text style={styles.resultTitle}>{getResultTitle()}</Text>
              <Text style={styles.resultMessage}>{getResultMessage()}</Text>

              {/* 상세 정보 카드 */}
              {paymentResult && (
                <View style={styles.resultDetailsCard}>
                  {/* 주문번호 (order_number) - iOS SDK와 동일 */}
                  {(paymentResult as Record<string, unknown>).order_number && (
                    <View style={styles.resultRow}>
                      <Text style={styles.resultLabel}>주문번호</Text>
                      <Text style={styles.resultValue}>
                        {String((paymentResult as Record<string, unknown>).order_number)}
                      </Text>
                    </View>
                  )}

                  {/* 요청 ID - iOS SDK와 동일 */}
                  {paymentResult.request_id && (
                    <View style={styles.resultRow}>
                      <Text style={styles.resultLabel}>요청 ID</Text>
                      <Text style={styles.resultValue}>
                        {paymentResult.request_id}
                      </Text>
                    </View>
                  )}

                  {/* 플랜 정보 (metadata에서 추출) - iOS SDK와 동일 */}
                  {getMetadataValue('plan_key') && (
                    <View style={styles.resultRow}>
                      <Text style={styles.resultLabel}>플랜</Text>
                      <Text style={styles.resultValue}>
                        {getMetadataValue('plan_key')?.charAt(0).toUpperCase() +
                          getMetadataValue('plan_key')?.slice(1)}
                      </Text>
                    </View>
                  )}

                  {/* 결제 주기 (metadata에서 추출) - iOS SDK와 동일 */}
                  {getMetadataValue('billing_type') && (
                    <View style={styles.resultRow}>
                      <Text style={styles.resultLabel}>결제 주기</Text>
                      <Text style={styles.resultValue}>
                        {getMetadataValue('billing_type')}
                      </Text>
                    </View>
                  )}

                  {/* 환경 정보 */}
                  {getMetadataValue('env') && (
                    <View style={styles.resultRow}>
                      <Text style={styles.resultLabel}>환경</Text>
                      <Text style={styles.resultValue}>
                        {getMetadataValue('env')}
                      </Text>
                    </View>
                  )}

                  {/* 주문명 */}
                  {paymentResult.name && (
                    <View style={styles.resultRow}>
                      <Text style={styles.resultLabel}>주문명</Text>
                      <Text style={styles.resultValue}>
                        {paymentResult.name}
                      </Text>
                    </View>
                  )}

                  {/* 결제금액 */}
                  {paymentResult.price !== undefined && paymentResult.price > 0 && (
                    <View style={styles.resultRow}>
                      <Text style={styles.resultLabel}>결제금액</Text>
                      <Text style={styles.resultValue}>
                        {formatPrice(paymentResult.price)}
                      </Text>
                    </View>
                  )}

                  {/* 기존 order_id (다른 필드일 경우) */}
                  {paymentResult.order_id &&
                    paymentResult.order_id !== (paymentResult as Record<string, unknown>).order_number && (
                    <View style={styles.resultRow}>
                      <Text style={styles.resultLabel}>주문 ID</Text>
                      <Text style={styles.resultValue}>
                        {paymentResult.order_id}
                      </Text>
                    </View>
                  )}

                  {/* 영수증 ID */}
                  {paymentResult.receipt_id && (
                    <View style={styles.resultRow}>
                      <Text style={styles.resultLabel}>영수증 ID</Text>
                      <Text style={styles.resultValue}>
                        {paymentResult.receipt_id}
                      </Text>
                    </View>
                  )}

                  {/* 에러 코드 */}
                  {paymentResult.code && (
                    <View style={styles.resultRow}>
                      <Text style={styles.resultLabel}>코드</Text>
                      <Text style={styles.resultValue}>
                        {String(paymentResult.code)}
                      </Text>
                    </View>
                  )}

                  {/* 선택 시간 */}
                  {getMetadataValue('selected_at') && (
                    <View style={styles.resultRow}>
                      <Text style={styles.resultLabel}>요청 시간</Text>
                      <Text style={styles.resultValue}>
                        {new Date(getMetadataValue('selected_at')!).toLocaleString('ko-KR')}
                      </Text>
                    </View>
                  )}
                </View>
              )}
            </View>
          </ScrollView>

          <View style={styles.payButtonContainer}>
            <TouchableOpacity
              style={[styles.payButton, { backgroundColor: resultStyle.color }]}
              onPress={closePaymentResult}
            >
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
    padding: 16,
  },
  // 메인 타이틀
  mainTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#212529',
    textAlign: 'center',
    marginBottom: 8,
  },
  mainSubtitle: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 24,
  },
  // 결제 주기 토글
  billingToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  billingLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748b',
    marginHorizontal: 8,
  },
  billingLabelActive: {
    color: '#212529',
  },
  discountBadge: {
    backgroundColor: '#dcfce7',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginLeft: 8,
  },
  discountText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#15803d',
  },
  // 플랜 카드
  planCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  planCardSelected: {
    borderColor: '#667eea',
    borderWidth: 2,
  },
  planCardPopular: {
    borderColor: '#667eea',
    borderWidth: 2,
  },
  popularBadge: {
    position: 'absolute',
    top: -10,
    alignSelf: 'center',
    backgroundColor: '#667eea',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  popularText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#fff',
  },
  planIcon: {
    fontSize: 32,
    marginBottom: 12,
  },
  planName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 8,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 16,
  },
  planPrice: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  planPricePopular: {
    color: '#667eea',
  },
  pricePeriod: {
    fontSize: 14,
    color: '#64748b',
    marginLeft: 4,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  checkmark: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#22c55e',
    marginRight: 8,
  },
  featureText: {
    fontSize: 14,
    color: '#475569',
  },
  selectButton: {
    backgroundColor: '#f1f5f9',
    borderRadius: 10,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  selectButtonPopular: {
    backgroundColor: '#667eea',
  },
  selectButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#475569',
  },
  selectButtonTextPopular: {
    color: '#fff',
  },
  // 안내 박스
  infoBox: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    marginTop: 8,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 13,
    color: '#666',
    lineHeight: 20,
  },
  // 결과 화면 스타일 - iOS SDK PaymentResultController와 동일
  resultContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5', // systemBackground
  },
  resultScrollView: {
    flex: 1,
  },
  resultCard: {
    backgroundColor: '#fff', // secondarySystemBackground
    margin: 20,
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  resultIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
  resultIconText: {
    fontSize: 40,
    color: '#fff',
  },
  resultTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  resultMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
    paddingHorizontal: 20,
  },
  resultDetailsCard: {
    width: '100%',
    backgroundColor: '#f8f9fa', // tertiarySystemBackground
    borderRadius: 12,
    padding: 20,
  },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 8,
    minHeight: 32,
  },
  resultLabel: {
    fontSize: 14,
    color: '#666',
    width: 80,
  },
  resultValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    flex: 1,
    textAlign: 'right',
  },
  payButtonContainer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  payButton: {
    backgroundColor: '#667eea',
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
});
