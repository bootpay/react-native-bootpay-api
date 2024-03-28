 
import React, { useRef }  from 'react';

import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity
} from 'react-native';
import { Bootpay, Extra, User } from 'react-native-bootpay-api'; 


export default function App() {
  const bootpay = useRef<Bootpay>(null);
  
 

  const goBootpayTest = () => {   
    const payload = {
      pg: '다날',  //['kcp', 'danal', 'inicis', 'nicepay', 'lgup', 'toss', 'payapp', 'easypay', 'jtnet', 'tpay', 'mobilians', 'payletter', 'onestore', 'welcome'] 중 택 1
      method: '카드 ',  // ['카드', '휴대폰', '계좌이체', '가상계좌', '카카오페이', '네이버페이', '페이코', '카드자동'] 중 택 1 
      order_name: '마스카라', //결제창에 보여질 상품명
      order_id: '1234_1234', //개발사에 관리하는 주문번호 
      // subscription_id: '12345_21345', //개발사에 관리하는 주문번호 (정기결제용)
      // authentication_id: '12345_21345', //개발사에 관리하는 주문번호 (본인인증용) 
      // method: 'card', 
      // methods: ['card', 'vbank', 'bank', 'phone'], // 통합결제창 진행시 사용하고자 하는 결제수단 지정 가능, method와 함께 적용 불가 
      price: 1000, //결제금액 
      // taxFree: 0, //면세금액 
    } 

    //결제되는 상품정보들로 통계에 사용되며, price의 합은 결제금액과 동일해야함 
    const items = [
      {
        name: '키보드', //통계에 반영될 상품명 
        qty: 1, //수량 
        id: 'ITEM_CODE_KEYBOARD', //개발사에서 관리하는 상품고유번호 
        price: 1000, //상품단가 
        cat1: '패션', //카테고리 상 , 자유롭게 기술
        cat2: '여성상의', //카테고리 중, 자유롭게 기술 
        cat3: '블라우스', //카테고리 하, 자유롭게 기술
      }
    ]

    //구매자 정보로 결제창이 미리 적용될 수 있으며, 통계에도 사용되는 정보 
    const user = {
      id: 'user_id_1234', //개발사에서 관리하는 회원고유번호 
      username: '홍길동', //구매자명
      email: 'user1234@gmail.com', //구매자 이메일
      gender: 0, //성별, 1:남자 , 0:여자
      birth: '1986-10-14', //생년월일 yyyy-MM-dd
      phone: '01012345678', //전화번호, 페이앱 필수 
      area: '서울', // [서울,인천,대구,광주,부산,울산,경기,강원,충청북도,충북,충청남도,충남,전라북도,전북,전라남도,전남,경상북도,경북,경상남도,경남,제주,세종,대전] 중 택 1
      addr: '서울시 동작구 상도로' //주소
    }

    // let extra1 = new Extra();
    // extra1.
    
    // const user = new User();
    // user.id = 'user_id_1234';
    // user.email = 'tes2t@bootpay.co.kr';
    



    //기타 설정

    const extra = {
      card_quota: "0,2,3",  //결제금액이 5만원 이상시 할부개월 허용범위를 설정할 수 있음, [0(일시불), 2개월, 3개월] 허용, 미설정시 12개월까지 허용 
      app_scheme: "bootpayrnapi", //ios의 경우 카드사 앱 호출 후 되돌아오기 위한 앱 스키마명  
      show_close_button: true, // x 닫기 버튼 삽입 (닫기버튼이 없는 PG사를 위한 옵션)  
    } 
    // const extra = new Extra();
    // extra.app_scheme = "bootpayrnapi2";


    if(bootpay != null && bootpay.current != null) bootpay.current.requestPayment(payload, items, user, extra);
  }


  const goBootpaySubscriptionTest = () => {   
    const payload = {
      pg: '나이스페이',  //['kcp', 'danal', 'inicis', 'nicepay', 'lgup', 'toss', 'payapp', 'easypay', 'jtnet', 'tpay', 'mobilians', 'payletter', 'onestore', 'welcome'] 중 택 1
      method: '카드자동', // ['카드', '휴대폰', '계좌이체', '가상계좌', '카카오페이', '네이버페이', '페이코', '카드자동'] 중 택 1 
      order_name: '마스카라', //결제창에 보여질 상품명
      // order_id: '1234_1234', //개발사에 관리하는 주문번호 
      subscription_id: '12345_21345', //개발사에 관리하는 주문번호 (카드자동결제용)
      // authentication_id: '12345_21345', //개발사에 관리하는 주문번호 (본인인증용) 
      // method: 'card', 
      // methods: ['card', 'vbank', 'bank', 'phone'], // 통합결제창 진행시 사용하고자 하는 결제수단 지정 가능, method와 함께 적용 불가 
      price: 1000, //결제금액 
      // taxFree: 0, //면세금액 
    } 

    //결제되는 상품정보들로 통계에 사용되며, price의 합은 결제금액과 동일해야함 
    const items = [
      {
        name: '키보드2', //통계에 반영될 상품명 
        qty: 1, //수량 
        id: 'ITEM_CODE_KEYBOARD', //개발사에서 관리하는 상품고유번호 
        price: 1000, //상품단가 
        cat1: '패션', //카테고리 상 , 자유롭게 기술
        cat2: '여성상의', //카테고리 중, 자유롭게 기술 
        cat3: '블라우스', //카테고리 하, 자유롭게 기술
      }
    ]

    //구매자 정보로 결제창이 미리 적용될 수 있으며, 통계에도 사용되는 정보 
    const user = {
      id: 'user_id_1234', //개발사에서 관리하는 회원고유번호 
      username: '홍길동', //구매자명
      email: 'user1234@gmail.com', //구매자 이메일
      gender: 0, //성별, 1:남자 , 0:여자
      birth: '1986-10-14', //생년월일 yyyy-MM-dd
      phone: '01012345678', //전화번호, 페이앱 필수 
      area: '서울', // [서울,인천,대구,광주,부산,울산,경기,강원,충청북도,충북,충청남도,충남,전라북도,전북,전라남도,전남,경상북도,경북,경상남도,경남,제주,세종,대전] 중 택 1
      addr: '서울시 동작구 상도로' //주소
    }

    // use


    //기타 설정
    const extra = {
      card_quota: "0,2,3",  //결제금액이 5만원 이상시 할부개월 허용범위를 설정할 수 있음, [0(일시불), 2개월, 3개월] 허용, 미설정시 12개월까지 허용 
      app_scheme: "bootpayrnapi", //ios의 경우 카드사 앱 호출 후 되돌아오기 위한 앱 스키마명   
      show_close_button: false, // x 닫기 버튼 삽입 (닫기버튼이 없는 PG사를 위한 옵션)
    } 

    if(bootpay != null && bootpay.current != null) bootpay.current.requestSubscription(payload, items, user, extra);
  }

  const goBootpayAuthTest = () => {
    const payload = {
      pg: '다날',  //['kcp', 'danal', 'inicis', 'nicepay', 'lgup', 'toss', 'payapp', 'easypay', 'jtnet', 'tpay', 'mobilians', 'payletter', 'onestore', 'welcome'] 중 택 1
      method: '본인인증',
      order_name: '마스카라', //본인인증 명
      // order_id: '1234_1234', //개발사에 관리하는 주문번호 
      // subscription_id: '12345_21345', //개발사에 관리하는 주문번호 (정기결제용)
      authentication_id: '12345_21345', //개발사에 관리하는 주문번호 (본인인증용) 
      // method: 'card', 
      // methods: ['card', 'vbank', 'bank', 'phone'], // 통합결제창 진행시 사용하고자 하는 결제수단 지정 가능, method와 함께 적용 불가 
      // price: 1000, //결제금액 
      // taxFree: 0, //면세금액 
    } 
 


    //기타 설정
    const extra = {
      app_scheme: "bootpayrnapi", //ios의 경우 카드사 앱 호출 후 되돌아오기 위한 앱 스키마명  
      show_close_button: false, // x 닫기 버튼 삽입 (닫기버튼이 없는 PG사를 위한 옵션)
    } 

    // const extra = new Extra();

    if(bootpay != null && bootpay.current != null) bootpay.current.requestAuthentication(payload, [], {}, extra);

  }

  const onCancel = (data: string) => {
    console.log('-- cancel', data); 
  }

  const onError = (data: string) => {
    console.log('-- error', data);
  }

  const onIssued = (data: string) => {
    console.log('-- issued', data);
  }

  const onConfirm = (data: string) => {
    console.log('-- confirm', data);
    if(bootpay != null && bootpay.current != null) bootpay.current.transactionConfirm(data);
  }

  const onDone = (data: string) => {
    console.log('-- done', data);
  }

  const onClose = () => {
    console.log('-- closed');
  }

  // React.useEffect(() => {
  //   BootpayApi.multiply(3, 7).then(setResult);
  // }, []);

  return (
    <View style={styles.container}>
      <TouchableOpacity
          style={styles.button}
          onPress={goBootpayTest}
        >
        <Text>일반결제 결제테스트</Text>
      </TouchableOpacity> 

      <Bootpay 
      ref={bootpay}
      ios_application_id={'5b8f6a4d396fa665fdc2b5e9'}
      android_application_id={'5b8f6a4d396fa665fdc2b5e8'} 
      // ios_application_id={'5b9f51264457636ab9a07cdd'}
      // android_application_id={'5b9f51264457636ab9a07cdc'} 
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
      <TouchableOpacity
          style={styles.button}
          onPress={goBootpayAuthTest}
        >
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
    alignItems: "center",
    backgroundColor: "#DDDDDD",
    padding: 10,
    margin: 10,
  },
}); 