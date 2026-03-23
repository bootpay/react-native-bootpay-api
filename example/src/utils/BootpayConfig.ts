/**
 * Bootpay 환경 설정
 *
 * 환경 전환: BOOTPAY_ENV를 'development' 또는 'production'으로 변경
 * 키 관리: 프로젝트 루트의 .env 파일 참고
 */

// ===== 환경 스위치 =====
const BOOTPAY_ENV: 'development' | 'production' = 'development';

// ===== PG API 키 =====
const PG_KEYS = {
  development: {
    web: '5b9f51264457636ab9a07cdb',
    android: '5b9f51264457636ab9a07cdc',
    ios: '5b9f51264457636ab9a07cdd',
  },
  production: {
    web: '5b8f6a4d396fa665fdc2b5e7',
    android: '5b8f6a4d396fa665fdc2b5e8',
    ios: '5b8f6a4d396fa665fdc2b5e9',
  },
};

// ===== Commerce API 키 =====
const COMMERCE_KEYS = {
  development: {
    client_key: 'hxS-Up--5RvT6oU6QJE0JA',
  },
  production: {
    client_key: 'sEN72kYZBiyMNytA8nUGxQ',
  },
};

// ===== Export =====
export const ENV = BOOTPAY_ENV;
export const WEB_APPLICATION_ID = PG_KEYS[BOOTPAY_ENV].web;
export const ANDROID_APPLICATION_ID = PG_KEYS[BOOTPAY_ENV].android;
export const IOS_APPLICATION_ID = PG_KEYS[BOOTPAY_ENV].ios;
export const CLIENT_KEY = COMMERCE_KEYS[BOOTPAY_ENV].client_key;

// 공통 설정
export const APP_SCHEME = 'bootpayReactNativeExample';

// PG사 목록
export const PG_LIST = ['나이스페이', '토스', 'KG이니시스', '다날'];

// 결제수단 목록
export const METHOD_LIST = ['카드', '계좌이체', '가상계좌', '휴대폰'];

// 본인인증 PG사 목록
export const AUTH_PG_LIST = ['다날', 'KCP'];

// 정기결제 PG사 목록
export const SUBSCRIPTION_PG_LIST = ['나이스페이', '토스', 'KG이니시스'];
