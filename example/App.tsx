import React, { useRef, useCallback } from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { Bootpay } from 'react-native-bootpay-api';

export default function App() {
  const bootpay = useRef<Bootpay>(null);

  const goBootpayTest = useCallback(() => {
    const payload = {
      pg: '나이스페이',
      method: '카드',
      order_name: '마스카라',
      order_id: '1234_1234',
      price: 1000,
    };

    const items = [
      {
        name: '키보드',
        qty: 1,
        id: 'ITEM_CODE_KEYBOARD',
        price: 1000,
        cat1: '패션',
        cat2: '여성상의',
        cat3: '블라우스',
      },
    ];

    const user = {
      id: 'user_id_1234',
      username: '홍길동',
      email: 'user1234@gmail.com',
      gender: 0,
      birth: '1986-10-14',
      phone: '01012345678',
      area: '서울',
      addr: '서울시 동작구 상도로',
    };

    const extra = {
      card_quota: '0,2,3',
      app_scheme: 'bootpaySample2',
      show_close_button: true,
    };

    bootpay.current?.requestPayment(payload, items, user, extra);
  }, []);

  const goBootpaySubscriptionTest = useCallback(() => {
    const payload = {
      pg: '나이스페이',
      method: '카드자동',
      order_name: '마스카라',
      subscription_id: '12345_21345',
      price: 1000,
    };

    const items = [
      {
        name: '키보드2',
        qty: 1,
        id: 'ITEM_CODE_KEYBOARD2',
        price: 1000,
        cat1: '패션',
        cat2: '여성상의',
        cat3: '블라우스',
      },
    ];

    const user = {
      id: 'user_id_1234',
      username: '홍길동',
      email: 'user1234@gmail.com',
      gender: 0,
      birth: '1986-10-14',
      phone: '01012345678',
      area: '서울',
      addr: '서울시 동작구 상도로',
    };

    const extra = {
      card_quota: '0,2,3',
      app_scheme: 'bootpayrnapi',
      show_close_button: false,
    };

    bootpay.current?.requestSubscription(payload, items, user, extra);
  }, []);

  const goBootpayAuthTest = useCallback(() => {
    const payload = {
      pg: '다날',
      method: '본인인증',
      order_name: '마스카라',
      authentication_id: '12345_21345',
    };

    const extra = {
      app_scheme: 'bootpayrnapi',
      show_close_button: false,
    };

    bootpay.current?.requestAuthentication(payload, [], {}, extra);
  }, []);

  const onCancel = useCallback((data: string) => {
    console.log('-- cancel', data);
  }, []);

  const onError = useCallback((data: string) => {
    console.log('-- error', data);
  }, []);

  const onIssued = useCallback((data: string) => {
    console.log('-- issued', data);
  }, []);

  const onConfirm = useCallback((data: string) => {
    console.log('-- confirm', data);
    bootpay.current?.transactionConfirm(data);
  }, []);

  const onDone = useCallback((data: string) => {
    console.log('-- done', data);
  }, []);

  const onClose = useCallback(() => {
    console.log('-- closed');
  }, []);

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.button} onPress={goBootpayTest}>
        <Text>일반결제 결제테스트</Text>
      </TouchableOpacity>

      <Bootpay
        ref={bootpay}
        ios_application_id={'5b8f6a4d396fa665fdc2b5e9'}
        android_application_id={'5b8f6a4d396fa665fdc2b5e8'}
        onCancel={onCancel}
        onError={onError}
        onIssued={onIssued}
        onConfirm={onConfirm}
        onDone={onDone}
        onClose={onClose}
      />

      <TouchableOpacity
        style={styles.button}
        onPress={goBootpaySubscriptionTest}
      >
        <Text>정기결제 테스트</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.button} onPress={goBootpayAuthTest}>
        <Text>본인인증 테스트</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  button: {
    alignItems: 'center',
    backgroundColor: '#DDDDDD',
    padding: 10,
    margin: 10,
  },
});
