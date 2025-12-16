import React, { useRef, useCallback, useState } from 'react';
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
  Bootpay,
  BootpayWidget,
  WidgetPayload,
  WidgetData,
} from 'react-native-bootpay-api';

// 결제 결과 데이터 타입
interface PaymentResultData {
  receipt_id?: string;
  order_id?: string;
  price?: number;
  method?: string;
  pg?: string;
  purchased_at?: string;
  status?: number;
}

// Application IDs - 네이티브 SDK 참조 (Android: WidgetControllerActivity.java, iOS: WidgetController.swift)
const WEB_APPLICATION_ID = '5b8f6a4d396fa665fdc2b5e7';
const ANDROID_APPLICATION_ID = '5b8f6a4d396fa665fdc2b5e8'; // Android SDK와 동일
const IOS_APPLICATION_ID = '5b8f6a4d396fa665fdc2b5e9';     // iOS SDK와 동일

// Debug/Sandbox
// const WEB_APPLICATION_ID = '5b9f51264457636ab9a07cdb';
// const ANDROID_APPLICATION_ID = '5b9f51264457636ab9a07cdc';
// const IOS_APPLICATION_ID = '5b9f51264457636ab9a07cdd';

// 결제 정보
const ORDER_NAME = '테스트 상품';
const PRICE = 1000;

// 화면 타입 - Flutter의 Navigator 패턴과 유사하게 스크린 기반 네비게이션
type ScreenType = 'main' | 'widgetPayment' | 'normalPayment';

export default function App() {
  const bootpay = useRef<Bootpay>(null);
  const bootpayWidget = useRef<BootpayWidget>(null);

  // 현재 화면 상태 - Flutter의 Navigator.push/pop 패턴 구현
  const [currentScreen, setCurrentScreen] = useState<ScreenType>('main');

  // Widget 상태 - App 레벨에서 관리 (전체화면 전환을 위해)
  // 초기 높이는 작게 시작하고, 웹뷰에서 resize 이벤트가 오면 조정
  const [widgetHeight, setWidgetHeight] = useState(200);
  const [widgetData, setWidgetData] = useState<WidgetData | null>(null);
  const [widgetTop, setWidgetTop] = useState(0); // Widget placeholder의 Y 위치

  // 결제 결과 화면 상태
  const [showPaymentResult, setShowPaymentResult] = useState(false);
  const [paymentResult, setPaymentResult] = useState<PaymentResultData | null>(null);

  // 네비게이션 함수 - Flutter의 Navigator.pop()과 유사
  const goBack = useCallback(() => {
    setCurrentScreen('main');
    // Widget 상태 리셋
    setWidgetData(null);
    setWidgetHeight(200);
  }, []);

  // Widget Payload
  const getWidgetPayload = useCallback((): WidgetPayload => {
    return {
      widget_key: 'default-widget',
      widget_sandbox: true,
      widget_use_terms: true,
      order_name: ORDER_NAME,
      price: PRICE,
      order_id: `order_${Date.now()}`,
      extra: {
        app_scheme: 'bootpayFlutterExample',
        separately_confirmed: true,
        display_success_result: false,
        display_error_result: false,
      },
    };
  }, []);

  // Widget 콜백들
  const onWidgetReady = useCallback(() => {
    console.log('[Widget] ===== READY =====');
    console.log('[Widget] bootpayWidget.current:', bootpayWidget.current ? 'exists' : 'null');
    const payload = getWidgetPayload();
    console.log('[Widget] payload:', JSON.stringify(payload));
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

  // Flutter와 동일한 콜백 패턴
  const onCancel = useCallback((data: unknown) => {
    console.log('[Widget] onCancel:', data);
    // 취소 시 알림 (선택사항)
    // Alert.alert('결제 취소', '결제가 취소되었습니다.');
  }, []);

  const onError = useCallback((data: unknown) => {
    console.log('[Widget] onError:', data);
    // 에러 시 알림
    const errorData = data as { message?: string };
    Alert.alert('결제 오류', errorData?.message || '결제 중 오류가 발생했습니다.');
  }, []);

  const onIssued = useCallback((data: unknown) => {
    console.log('[Widget] onIssued (가상계좌 발급):', data);
    // 가상계좌 발급 완료 알림
    Alert.alert('가상계좌 발급', '가상계좌가 발급되었습니다. 입금 후 결제가 완료됩니다.');
  }, []);

  const onConfirm = useCallback((data: unknown) => {
    console.log('[Widget] onConfirm:', data);
    // 서버에서 결제 정보 검증 후 true/false 반환
    // 실제 서비스에서는 서버 검증 로직 추가
    bootpayWidget.current?.transactionConfirm();
    return true;
  }, []);

  const onDone = useCallback((data: unknown) => {
    console.log('[Widget] onDone:', data);
    // 결제 결과 데이터 파싱
    const resultData = data as PaymentResultData;
    setPaymentResult(resultData);
    setShowPaymentResult(true);
  }, []);

  const onClose = useCallback(() => {
    console.log('[Widget] onClose');
  }, []);

  // 결제 결과 화면 닫기 - Flutter처럼 메인 화면으로 돌아감 (Navigator.pop)
  const closePaymentResult = useCallback(() => {
    setShowPaymentResult(false);
    setPaymentResult(null);
    // Flutter의 Navigator.pop()과 동일: 결제 결과 닫으면 메인 목록으로 돌아감
    goBack();
  }, [goBack]);

  // Widget placeholder의 위치 측정
  // measureInWindow를 사용하여 화면 절대 위치를 측정
  const widgetPlaceholderRef = useRef<View>(null);

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
    // 레이아웃 후 약간의 딜레이를 주고 측정 (렌더링 완료 후)
    setTimeout(measureWidgetPosition, 100);
  }, [measureWidgetPosition]);

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

  const formatPrice = (price: number) => `${price.toLocaleString()}원`;

  // 메인 화면 렌더링 - Flutter의 SecondRoute와 동일
  const renderMainScreen = () => (
    <View style={styles.mainScreen}>
      <View style={styles.mainHeader}>
        <Text style={styles.mainTitle}>Bootpay Demo</Text>
      </View>
      <View style={styles.mainContent}>
        <TouchableOpacity
          style={styles.menuButton}
          onPress={() => setCurrentScreen('widgetPayment')}
        >
          <Text style={styles.menuButtonText}>위젯 결제 테스트</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.menuButton}
          onPress={() => setCurrentScreen('normalPayment')}
        >
          <Text style={styles.menuButtonText}>일반 결제 테스트</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* 메인 화면 - 결제 방법 선택 (Flutter의 SecondRoute) */}
      {currentScreen === 'main' && renderMainScreen()}

      {/* Widget 결제 화면 */}
      {currentScreen === 'widgetPayment' && (
        <>
          {/* 헤더 with 뒤로가기 버튼 */}
          <View style={styles.screenHeader}>
            <TouchableOpacity style={styles.backButton} onPress={goBack}>
              <Text style={styles.backButtonText}>← 뒤로</Text>
            </TouchableOpacity>
            <Text style={styles.screenTitle}>위젯 결제</Text>
            <View style={styles.backButton} />
          </View>

          {/* Widget 결제 컨텐츠 */}
          <WidgetPaymentContent
            widgetHeight={widgetHeight}
            isCompleted={isCompleted}
            goPayment={goPayment}
            formatPrice={formatPrice}
            onWidgetLayout={onWidgetLayout}
            widgetPlaceholderRef={widgetPlaceholderRef}
          />

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
        </>
      )}

      {/* 일반 결제 화면 */}
      {currentScreen === 'normalPayment' && (
        <>
          {/* 헤더 with 뒤로가기 버튼 */}
          <View style={styles.screenHeader}>
            <TouchableOpacity style={styles.backButton} onPress={goBack}>
              <Text style={styles.backButtonText}>← 뒤로</Text>
            </TouchableOpacity>
            <Text style={styles.screenTitle}>일반 결제</Text>
            <View style={styles.backButton} />
          </View>

          <NormalPaymentPage bootpayRef={bootpay} />
        </>
      )}

      {/* 결제 결과 화면 - Flutter의 _showPaymentResult와 동일 */}
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
          <ScrollView style={styles.resultContent}>
            <View style={styles.resultCard}>
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
                  {paymentResult.purchased_at && (
                    <View style={styles.resultRow}>
                      <Text style={styles.resultLabel}>결제일시</Text>
                      <Text style={styles.resultValue}>{paymentResult.purchased_at}</Text>
                    </View>
                  )}
                </View>
              )}
            </View>
          </ScrollView>
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

// ============ Widget 결제 컨텐츠 (BootpayWidget 제외) ============
// BootpayWidget은 App 레벨에서 렌더링됨 (전체화면 전환을 위해)
interface WidgetPaymentContentProps {
  widgetHeight: number;
  isCompleted: boolean;
  goPayment: () => void;
  formatPrice: (price: number) => string;
  onWidgetLayout: () => void;
  widgetPlaceholderRef: React.RefObject<View>;
}

function WidgetPaymentContent({
  widgetHeight,
  isCompleted,
  goPayment,
  formatPrice,
  onWidgetLayout,
  widgetPlaceholderRef,
}: WidgetPaymentContentProps) {
  return (
    <View style={styles.widgetPageContainer}>
      <ScrollView style={styles.scrollView}>
        {/* 상품 정보 */}
        <View style={styles.productSection}>
          <Text style={styles.sectionTitle}>주문상품</Text>
          <View style={styles.productCard}>
            <Text style={styles.productName}>{ORDER_NAME}</Text>
            <Text style={styles.productPrice}>{formatPrice(PRICE)}</Text>
          </View>
        </View>

        {/* Widget placeholder - 실제 Widget은 App 레벨에서 position: absolute로 렌더링됨 */}
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
    </View>
  );
}

// ============ 일반 결제 페이지 ============
function NormalPaymentPage({
  bootpayRef,
}: {
  bootpayRef: React.RefObject<Bootpay>;
}) {
  const goBootpayTest = useCallback(() => {
    const payload = {
      pg: '나이스페이',
      method: '카드',
      order_name: ORDER_NAME,
      order_id: `order_${Date.now()}`,
      price: PRICE,
    };

    const items = [
      {
        name: ORDER_NAME,
        qty: 1,
        id: 'ITEM_CODE_001',
        price: PRICE,
        cat1: '패션',
        cat2: '여성상의',
        cat3: '블라우스',
      },
    ];

    const user = {
      id: 'test_user_1234',
      username: '홍길동',
      email: 'test@bootpay.co.kr',
      gender: 0,
      birth: '1986-10-14',
      phone: '01012345678',
      area: '서울',
      addr: '서울시 동작구 상도로',
    };

    const extra = {
      card_quota: '0,2,3',
      app_scheme: 'bootpayFlutterExample',
      show_close_button: true,
    };

    bootpayRef.current?.requestPayment(payload, items, user, extra);
  }, [bootpayRef]);

  const goBootpaySubscriptionTest = useCallback(() => {
    const payload = {
      pg: '나이스페이',
      method: '카드자동',
      order_name: ORDER_NAME,
      subscription_id: `sub_${Date.now()}`,
      price: PRICE,
    };

    const extra = {
      app_scheme: 'bootpayFlutterExample',
      show_close_button: true,
    };

    bootpayRef.current?.requestSubscription(payload, [], {}, extra);
  }, [bootpayRef]);

  const onCancel = useCallback((data: unknown) => {
    console.log('-- cancel', data);
  }, []);

  const onError = useCallback((data: unknown) => {
    console.log('-- error', data);
  }, []);

  const onIssued = useCallback((data: unknown) => {
    console.log('-- issued', data);
  }, []);

  const onConfirm = useCallback((data: unknown) => {
    console.log('-- confirm', data);
    bootpayRef.current?.transactionConfirm();
    return true;
  }, [bootpayRef]);

  const onDone = useCallback((data: unknown) => {
    console.log('-- done', data);
    Alert.alert('결제 완료', '결제가 성공적으로 완료되었습니다.');
  }, []);

  const onClose = useCallback(() => {
    console.log('-- closed');
  }, []);

  return (
    <View style={styles.normalContent}>
      <TouchableOpacity style={styles.button} onPress={goBootpayTest}>
        <Text>일반결제 테스트</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.button} onPress={goBootpaySubscriptionTest}>
        <Text>정기결제 테스트</Text>
      </TouchableOpacity>

      <Bootpay
        ref={bootpayRef}
        ios_application_id={IOS_APPLICATION_ID}
        android_application_id={ANDROID_APPLICATION_ID}
        onCancel={onCancel}
        onError={onError}
        onIssued={onIssued}
        onConfirm={onConfirm}
        onDone={onDone}
        onClose={onClose}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },

  // 메인 화면 스타일 (Flutter의 SecondRoute)
  mainScreen: {
    flex: 1,
  },
  mainHeader: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    alignItems: 'center',
  },
  mainTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
  },
  mainContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  menuButton: {
    backgroundColor: '#f5f5f5',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 10,
    marginVertical: 10,
    minWidth: 250,
    alignItems: 'center',
  },
  menuButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },

  // 화면 헤더 스타일 (뒤로가기 버튼 포함)
  screenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    width: 60,
    paddingVertical: 4,
  },
  backButtonText: {
    fontSize: 16,
    color: '#3182f6',
  },
  screenTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },

  // Widget Page Styles
  widgetPageContainer: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
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
    borderWidth: 2,
    borderColor: 'red',
    borderStyle: 'dashed',
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

  // Normal Page Styles
  normalContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  button: {
    alignItems: 'center',
    backgroundColor: '#DDDDDD',
    padding: 15,
    margin: 10,
    borderRadius: 8,
    minWidth: 200,
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
  },
  resultCard: {
    margin: 20,
    padding: 24,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    alignItems: 'center',
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
