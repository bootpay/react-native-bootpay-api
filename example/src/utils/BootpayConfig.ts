/**
 * Bootpay 환경 설정
 *
 * 키는 모두 `.env` 에서 주입 — committed `.env` 가 단일 출처.
 * `BOOTPAY_ENV=development|production` 로 환경 토글 (기본 production).
 */

import {
  BOOTPAY_ENV as ENV_FROM_DOTENV,
  BOOTPAY_WEB_APPLICATION_ID_DEV,
  BOOTPAY_WEB_APPLICATION_ID_PROD,
  BOOTPAY_ANDROID_APPLICATION_ID_DEV,
  BOOTPAY_ANDROID_APPLICATION_ID_PROD,
  BOOTPAY_IOS_APPLICATION_ID_DEV,
  BOOTPAY_IOS_APPLICATION_ID_PROD,
  BOOTPAY_REST_APPLICATION_ID_DEV,
  BOOTPAY_REST_APPLICATION_ID_PROD,
  BOOTPAY_CLIENT_KEY_DEV,
  BOOTPAY_CLIENT_KEY_PROD,
} from '@env';

const BOOTPAY_ENV: 'development' | 'production' =
  ENV_FROM_DOTENV === 'development' ? 'development' : 'production';

const isDev = BOOTPAY_ENV === 'development';

const envValue = (value: unknown): string => {
  if (typeof value !== 'string') {
    return '';
  }
  const trimmed = value.trim();
  if (
    !trimmed ||
    trimmed === 'undefined' ||
    trimmed === 'null' ||
    (trimmed.startsWith('$(') && trimmed.endsWith(')'))
  ) {
    return '';
  }
  return trimmed;
};

const resolveKey = (devValue: unknown, prodValue: unknown): string =>
  envValue(isDev ? devValue : prodValue);

// ===== Export =====
export const ENV = BOOTPAY_ENV;

export const WEB_APPLICATION_ID = resolveKey(
  BOOTPAY_WEB_APPLICATION_ID_DEV,
  BOOTPAY_WEB_APPLICATION_ID_PROD,
);

export const ANDROID_APPLICATION_ID = resolveKey(
  BOOTPAY_ANDROID_APPLICATION_ID_DEV,
  BOOTPAY_ANDROID_APPLICATION_ID_PROD,
);

export const IOS_APPLICATION_ID = resolveKey(
  BOOTPAY_IOS_APPLICATION_ID_DEV,
  BOOTPAY_IOS_APPLICATION_ID_PROD,
);

export const REST_APPLICATION_ID = resolveKey(
  BOOTPAY_REST_APPLICATION_ID_DEV,
  BOOTPAY_REST_APPLICATION_ID_PROD,
);

export const CLIENT_KEY = resolveKey(
  BOOTPAY_CLIENT_KEY_DEV,
  BOOTPAY_CLIENT_KEY_PROD,
);

// 공통 설정
export const APP_SCHEME = 'bootpayReactNativeExample';
export const PG_LIST = ['나이스페이', '토스', 'KG이니시스', '다날'];
export const METHOD_LIST = ['카드', '계좌이체', '가상계좌', '휴대폰'];
export const AUTH_PG_LIST = ['다날', 'KCP'];
export const SUBSCRIPTION_PG_LIST = ['나이스페이', '토스', 'KG이니시스'];

// 주의: server_key (secret) 는 클라이언트에 절대 포함하지 말 것 — 서버 SDK 에서만 사용
