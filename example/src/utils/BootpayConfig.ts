/**
 * Bootpay 환경 설정
 *
 * 우선순위: .env (react-native-dotenv) → production fallback
 *
 * - 배포 기본값은 항상 production. 로컬 테스트 시 .env에서 BOOTPAY_ENV=development
 * - .env 미설정/누락 시 자동으로 production 키 사용 (배포 안전)
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
  BOOTPAY_SERVER_KEY_DEV,
  BOOTPAY_SERVER_KEY_PROD,
} from '@env';

// ===== Production 기본값 (fallback) =====
const PROD_DEFAULTS = {
  web: '5b8f6a4d396fa665fdc2b5e7',
  android: '5b8f6a4d396fa665fdc2b5e8',
  ios: '5b8f6a4d396fa665fdc2b5e9',
  rest: '5b8f6a4d396fa665fdc2b5ea',
  client_key: 'sEN72kYZBiyMNytA8nUGxQ',
  server_key: 'rnZLJamENRgfwTccwmI_Uu9cxsPpAV9X2W-Htg73yfU=',
};

// ===== Development 기본값 =====
const DEV_DEFAULTS = {
  web: '5b9f51264457636ab9a07cdb',
  android: '5b9f51264457636ab9a07cdc',
  ios: '5b9f51264457636ab9a07cdd',
  rest: '59b731f084382614ebf72215',
  client_key: 'hxS-Up--5RvT6oU6QJE0JA',
  server_key: 'r5zxvDcQJiAP2PBQ0aJjSHQtblNmYFt6uFoEMhti_mg=',
};

const BOOTPAY_ENV: 'development' | 'production' =
  ENV_FROM_DOTENV === 'development' ? 'development' : 'production';

const isDev = BOOTPAY_ENV === 'development';

const envValue = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (
    !trimmed ||
    trimmed === 'undefined' ||
    trimmed === 'null' ||
    (trimmed.startsWith('$(') && trimmed.endsWith(')'))
  ) {
    return undefined;
  }
  return trimmed;
};

const resolveKey = (devValue: unknown, prodValue: unknown, devFallback: string, prodFallback: string): string =>
  envValue(isDev ? devValue : prodValue) || (isDev ? devFallback : prodFallback);

// ===== Export (env 값 → fallback) =====
export const ENV = BOOTPAY_ENV;

export const WEB_APPLICATION_ID = resolveKey(
  BOOTPAY_WEB_APPLICATION_ID_DEV,
  BOOTPAY_WEB_APPLICATION_ID_PROD,
  DEV_DEFAULTS.web,
  PROD_DEFAULTS.web
);

export const ANDROID_APPLICATION_ID = resolveKey(
  BOOTPAY_ANDROID_APPLICATION_ID_DEV,
  BOOTPAY_ANDROID_APPLICATION_ID_PROD,
  DEV_DEFAULTS.android,
  PROD_DEFAULTS.android
);

export const IOS_APPLICATION_ID = resolveKey(
  BOOTPAY_IOS_APPLICATION_ID_DEV,
  BOOTPAY_IOS_APPLICATION_ID_PROD,
  DEV_DEFAULTS.ios,
  PROD_DEFAULTS.ios
);

export const REST_APPLICATION_ID = resolveKey(
  BOOTPAY_REST_APPLICATION_ID_DEV,
  BOOTPAY_REST_APPLICATION_ID_PROD,
  DEV_DEFAULTS.rest,
  PROD_DEFAULTS.rest
);

export const CLIENT_KEY = resolveKey(
  BOOTPAY_CLIENT_KEY_DEV,
  BOOTPAY_CLIENT_KEY_PROD,
  DEV_DEFAULTS.client_key,
  PROD_DEFAULTS.client_key
);

// 공통 설정
export const APP_SCHEME = 'bootpayReactNativeExample';
export const PG_LIST = ['나이스페이', '토스', 'KG이니시스', '다날'];
export const METHOD_LIST = ['카드', '계좌이체', '가상계좌', '휴대폰'];
export const AUTH_PG_LIST = ['다날', 'KCP'];
export const SUBSCRIPTION_PG_LIST = ['나이스페이', '토스', 'KG이니시스'];

export const SERVER_KEY = resolveKey(
  BOOTPAY_SERVER_KEY_DEV,
  BOOTPAY_SERVER_KEY_PROD,
  DEV_DEFAULTS.server_key,
  PROD_DEFAULTS.server_key
);
