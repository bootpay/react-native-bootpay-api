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
  AUTH_PG_LIST,
} from '../../utils/BootpayConfig';

interface AuthenticationResultData {
  receipt_id?: string;
  pg?: string;
  authenticate_at?: string;
}

interface AuthenticationScreenProps {
  onBack: () => void;
}

export function AuthenticationScreen({ onBack }: AuthenticationScreenProps) {
  const bootpay = useRef<Bootpay>(null);

  const [selectedPg, setSelectedPg] = useState('다날');
  const [showResult, setShowResult] = useState(false);
  const [authResult, setAuthResult] = useState<AuthenticationResultData | null>(null);

  const requestAuthentication = useCallback(() => {
    const payload = {
      pg: selectedPg,
      method: '본인인증',
      order_name: '본인인증',
      authentication_id: `auth_${Date.now()}`,
    };

    const user = {
      id: 'user_1234',
      username: '홍길동',
      phone: '01012345678',
    };

    const extra = {
      open_type: 'iframe',
    };

    bootpay.current?.requestAuthentication(payload, [], user, extra);
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
    setAuthResult(data as AuthenticationResultData);
    setShowResult(true);
  }, []);

  const onClose = useCallback(() => {
    console.log('------- onClose');
  }, []);

  if (showResult && authResult) {
    return (
      <AuthenticationResultScreen
        result={authResult}
        onConfirm={() => {
          setShowResult(false);
          setAuthResult(null);
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
        <Text style={styles.headerTitle}>본인인증</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView style={styles.content}>
        {/* 이미지 */}
        <View style={[styles.productImage, { backgroundColor: '#e8eaf6' }]}>
          <Text style={styles.productIcon}>🔐</Text>
          <Text style={[styles.premiumBadge, { color: '#3f51b5' }]}>본인인증</Text>
        </View>

        {/* 정보 */}
        <Text style={styles.productName}>휴대폰 본인인증</Text>
        <Text style={styles.productDescription}>
          휴대폰 번호를 통해 본인임을 확인합니다.
        </Text>

        {/* 안내 */}
        <View style={[styles.infoBox, { backgroundColor: '#e8eaf6' }]}>
          <View style={styles.infoHeader}>
            <Text style={styles.infoIcon}>ℹ️</Text>
            <Text style={[styles.infoTitle, { color: '#303f9f' }]}>본인인증 안내</Text>
          </View>
          <Text style={[styles.infoText, { color: '#1a237e' }]}>
            • 이름, 생년월일, 성별, 휴대폰 번호를 통해 본인 확인{'\n'}
            • SMS 인증번호를 통한 본인인증{'\n'}
            • 회원가입, 성인인증 등에 활용 가능
          </Text>
        </View>

        <View style={styles.divider} />

        {/* 인증 업체 선택 */}
        <Text style={styles.sectionLabel}>인증 업체 선택</Text>
        {AUTH_PG_LIST.map((pg) => (
          <TouchableOpacity
            key={pg}
            style={[styles.radioTile, selectedPg === pg && styles.radioTileSelectedIndigo]}
            onPress={() => setSelectedPg(pg)}
          >
            <View style={[styles.radioCircle, selectedPg === pg && styles.radioCircleSelectedIndigo]}>
              {selectedPg === pg && <View style={styles.radioInnerIndigo} />}
            </View>
            <Text style={[styles.radioLabel, selectedPg === pg && styles.radioLabelSelected]}>
              {pg}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* 인증 버튼 */}
      <View style={styles.payButtonContainer}>
        <TouchableOpacity style={[styles.payButton, { backgroundColor: '#3f51b5' }]} onPress={requestAuthentication}>
          <Text style={styles.payButtonText}>본인인증 시작</Text>
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

// 본인인증 결과 화면
function AuthenticationResultScreen({
  result,
  onConfirm,
}: {
  result: AuthenticationResultData;
  onConfirm: () => void;
}) {
  return (
    <SafeAreaView style={styles.resultContainer}>
      <View style={styles.header}>
        <View style={styles.backButton} />
        <Text style={styles.headerTitle}>인증 완료</Text>
        <View style={styles.headerRight} />
      </View>

      <View style={styles.resultContent}>
        <View style={[styles.resultIcon, { backgroundColor: '#4CAF50' }]}>
          <Text style={styles.resultIconText}>🔐</Text>
        </View>
        <Text style={styles.resultTitle}>본인인증 완료</Text>
        <Text style={styles.resultSubtitle}>본인인증이 성공적으로 완료되었습니다</Text>

        <View style={styles.resultDetails}>
          {result.pg && (
            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>인증업체</Text>
              <Text style={styles.resultValue}>{result.pg}</Text>
            </View>
          )}
          {result.receipt_id && (
            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>영수증ID</Text>
              <Text style={styles.resultValue} numberOfLines={1}>{result.receipt_id}</Text>
            </View>
          )}
          {result.authenticate_at && (
            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>인증일시</Text>
              <Text style={styles.resultValue}>{result.authenticate_at}</Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.payButtonContainer}>
        <TouchableOpacity style={[styles.payButton, { backgroundColor: '#3f51b5' }]} onPress={onConfirm}>
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
  },
  productName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
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
  radioTileSelectedIndigo: {
    borderColor: '#3f51b5',
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
  radioCircleSelectedIndigo: {
    borderColor: '#3f51b5',
  },
  radioInnerIndigo: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#3f51b5',
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
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  resultIconText: {
    fontSize: 40,
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
