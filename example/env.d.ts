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
}
