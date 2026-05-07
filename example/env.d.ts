declare module '@env' {
  export const BOOTPAY_ENV: 'development' | 'production' | undefined;
  export const BOOTPAY_WEB_APPLICATION_ID_DEV: string | undefined;
  export const BOOTPAY_WEB_APPLICATION_ID_PROD: string | undefined;
  export const BOOTPAY_ANDROID_APPLICATION_ID_DEV: string | undefined;
  export const BOOTPAY_ANDROID_APPLICATION_ID_PROD: string | undefined;
  export const BOOTPAY_IOS_APPLICATION_ID_DEV: string | undefined;
  export const BOOTPAY_IOS_APPLICATION_ID_PROD: string | undefined;
  export const BOOTPAY_REST_APPLICATION_ID_DEV: string | undefined;
  export const BOOTPAY_REST_APPLICATION_ID_PROD: string | undefined;
  export const BOOTPAY_CLIENT_KEY_DEV: string | undefined;
  export const BOOTPAY_CLIENT_KEY_PROD: string | undefined;
  // 주의: server_key (secret) 는 클라이언트에 절대 포함하지 말 것 — 서버 SDK 에서만 사용
}
