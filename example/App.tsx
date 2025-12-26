import React, { useState, useCallback, useEffect } from 'react';
import { SafeAreaView, StyleSheet } from 'react-native';
import { warmUp } from 'react-native-bootpay-api';

import {
  MainMenuScreen,
  DefaultPaymentScreen,
  TotalPaymentScreen,
  SubscriptionScreen,
  AuthenticationScreen,
  WidgetPaymentScreen,
  CommerceScreen,
  type ScreenType,
} from './src/screens';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<ScreenType>('main');

  // 앱 시작 시 WebView 프리워밍 - 첫 결제 화면 로딩 속도 개선
  useEffect(() => {
    warmUp();
  }, []);

  const goBack = useCallback(() => {
    setCurrentScreen('main');
  }, []);

  const renderScreen = () => {
    switch (currentScreen) {
      case 'main':
        return <MainMenuScreen onNavigate={setCurrentScreen} />;
      case 'defaultPayment':
        return <DefaultPaymentScreen onBack={goBack} />;
      case 'totalPayment':
        return <TotalPaymentScreen onBack={goBack} />;
      case 'subscriptionPayment':
        return <SubscriptionScreen onBack={goBack} />;
      case 'authenticationPayment':
        return <AuthenticationScreen onBack={goBack} />;
      case 'widgetPayment':
        return <WidgetPaymentScreen onBack={goBack} />;
      case 'commercePayment':
        return <CommerceScreen onBack={goBack} />;
      default:
        return <MainMenuScreen onNavigate={setCurrentScreen} />;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {renderScreen()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
});
