import React, { useState, useCallback } from 'react';
import { SafeAreaView, StyleSheet } from 'react-native';
// WebView 프리워밍은 SDK import 시 자동으로 수행됩니다

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
