import React, { useRef }  from 'react';

import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity
} from 'react-native';
import { BootpayWebView, userTrace, pageTrace } from 'react-native-bootpay-api';
// import { WebView } from 'react-native-webview-bootpay';


export default function App() {
  const bootpay = useRef<BootpayWebView>(null);
  // const api = useRef<BootpayAnalytics>(null);

  const onAnalyticsPress = async () => {

    
    //회원 추적
    await userTrace(
      '5b8f6a4d396fa665fdc2b5e9',
      'user_1234',
      '01012345678',
      'rupy1014@gmail.com',
      1,
      '861014',
      '서울'
    );

    //결제되는 상품정보들로 통계에 사용되며, price의 합은 결제금액과 동일해야함 
    const items = [
      {
        item_name: '키보드', //통계에 반영될 상품명  
        unique: 'ITEM_CODE_KEYBOARD', //개발사에서 관리하는 상품고유번호 
        price: 1000, //상품단가 
        cat1: '패션', //카테고리 상 , 자유롭게 기술
        cat2: '여성상의', //카테고리 중, 자유롭게 기술 
        cat3: '블라우스', //카테고리 하, 자유롭게 기술
      },
      {
        item_name: '마우스', //통계에 반영될 상품명  
        unique: 'ITEM_CODE_KEYBOARD', //개발사에서 관리하는 상품고유번호 
        price: 2000, //상품단가 
        cat1: '패션2', //카테고리 상 , 자유롭게 기술
        cat2: '여성상의2', //카테고리 중, 자유롭게 기술 
        cat3: '블라우스2', //카테고리 하, 자유롭게 기술
      }
    ]

    //페이지 추적 
    await pageTrace(
      '5b8f6a4d396fa665fdc2b5e9',
      'main_page_1234',
      '',
      items
    );
  }
  

  const onPayPress = () => {    

    const payload = {
      pg: 'danal',  //['kcp', 'danal', 'inicis', 'nicepay', 'lgup', 'toss', 'payapp', 'easypay', 'tpay', 'mobilians', 'payletter', 'welcome'] 중 택 1
      method: 'card_rebill', //['card', 'phone', 'bank', 'vbank', 'card_rebill'] 중 택 1   결제수단 
      // methods: ['card'], ['card', 'phone', 'bank', 'vbank', 'card_rebill'] 중 사용하고자 하는 값을 배열 형태로 적용 
      order_name: '마스카라', //결제창에 보여질 상품명
      price: 1000, //결제금액 
      // tax_free: 500, //비과세 금액, 결제금액 1000원 중 500원 지정시 복합과세(비과세 500, 과세 500)에 해당함 
      order_id: '1234_1234', //개발사에 관리하는 결제 주문번호 
      // subscription_id: '12345_12435', //개발사에 관리하는 정기결제 주문번호 
      // authentication_id: '123456_124356', //개발사에 관리하는 본인인증 주문번호 
      params: '', //전달하고자 하는 parameter, 개발사에서 자유롭게 데이터를 전달 후 done에서 돌려받을 수 있음, json string 추천 
      show_agree_window: false, //약관 동의창 띄울지 
      user_token: '', //카드 간편결제, 생체결제시 필요한 파라미터
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
      phone: '01012345678', //전화번호, 페이앱 필수, - 없이 숫자만 입력
      area: '서울', // [서울,인천,대구,광주,부산,울산,경기,강원,충청북도,충북,충청남도,충남,전라북도,전북,전라남도,전남,경상북도,경북,경상남도,경남,제주,세종,대전] 중 택 1
      addr: '서울시 동작구 상도로' //주소
    }


    //기타 설정
    const extra = {
      card_quota: "0,2,3",  //결제금액이 5만원 이상시 할부개월 허용범위를 설정할 수 있음, [0(일시불), 2개월, 3개월] 허용, 미설정시 12개월까지 허용
      seller_ame: '판매자명A', //노출되는 판매자명 설정
      delivery_day: 1,  //배송일자
      locale: "ko", //결제창 언어지원
      offer_period: "", //결제창 제공기간에 해당하는 string 값, 지원하는 PG만 적용됨
      display_cash_receipt: true, // 현금영수증 보일지 말지.. 가상계좌 KCP 옵션
      deposit_expiration: "", //가상계좌 입금 만료일자 설정
      app_scheme: "",  //모바일 앱에서 결제 완료 후 돌아오는 옵션 ( 아이폰만 적용 )
      use_card_point: true, //카드 포인트 사용 여부 (토스만 가능)
      direct_card: "", //해당 카드로 바로 결제창 (토스만 가능)
      use_order_id: false, //가맹점 order_id로 PG로 전송
      international_card_only: false, //해외 결제카드 선택 여부 (토스만 가능)
      phone_carrier: "", //본인인증 시 고정할 통신사명, SKT,KT,LGT 중 1개만 가능
      direct_app_card: "", //카드사앱으로 direct 호출
      direct_samsungpay: "", //삼성페이 바로 띄우기
      test_deposit: false, //가상계좌 모의 입금
      popup: true, //네이버페이 등 특정 PG 일 경우 popup을 true로 해야함
      separately_confirmed: true // confirm 이벤트를 호출할지 말지, false일 경우 자동승인 
    } 

    if(bootpay != null && bootpay.current != null) bootpay.current.requestSubscription(payload, items, user, extra);
  }


  const onCancel = (data: string) => { 
    var json = JSON.stringify(data) 
    console.log('cancel', json);
  }

  const onError = (data: string) => {
    console.log('error', data);
  }

  const onIssued = (data: string) => {
    console.log('issued', data);
  }

  const onConfirm = (data: string) => {
    console.log('confirm', data);
    if(bootpay != null && bootpay.current != null) bootpay.current.transactionConfirm();
  }

  const onDone = (data: string) => {
    console.log('done', data);
  }

  const onClose = () => {
    console.log('closed');
  }

  // React.useEffect(() => {
  //   BootpayApi.multiply(3, 7).then(setResult);
  // }, []);

  return (
    <View style={styles.container}>

{/* ios_application_id={'5b8f6a4d396fa665fdc2b5e9'}
          android_application_id={'5b8f6a4d396fa665fdc2b5e8'}  */}

    <BootpayWebView  
          ref={bootpay}
          ios_application_id={'59bfc733e13f337dbd6ca489'}
          android_application_id={'5a029249b957d73c2b3ae5f5'} 
          onCancel={onCancel}
          onError={onError}
          onIssued={onIssued}
          onConfirm={onConfirm}
          onDone={onDone}
          onClose={onClose} 
        />
 
      <TouchableOpacity
          style={styles.button}
          onPress={onAnalyticsPress}
        >
          <Text>analytics click</Text>
      </TouchableOpacity> 

      <TouchableOpacity
          style={styles.button}
          onPress={onPayPress}
        >
          <Text>pay click</Text>
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
    padding: 10
  },
});
 