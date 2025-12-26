import { NativeModules } from 'react-native';
import { Bootpay } from './Bootpay';
import { BootpayWidget } from './BootpayWidget';
import { BootpayCommerce } from './BootpayCommerce';
import {
  Payload,
  Extra,
  Item,
  User,
  BootpayEventData,
  BootpayTypesProps,
} from './BootpayTypes';
import {
  WidgetData,
  WidgetTerm,
  WidgetExtra,
  WidgetPayload,
  WidgetPayloadExtra,
  BootpayWidgetProps,
  WidgetReadyCallback,
  WidgetResizeCallback,
  WidgetChangePaymentCallback,
  WidgetChangeTermsCallback,
} from './WidgetTypes';
import {
  CommercePayload,
  CommerceUser,
  CommerceProduct,
  CommerceExtra,
  CommerceEventData,
  BootpayCommerceProps,
} from './CommerceTypes';

const BPCWebViewModule = NativeModules.BPCWebViewModule;

/**
 * WebView 프로세스를 미리 초기화하여 첫 결제 화면 로딩 속도를 개선합니다.
 *
 * iOS: WKWebView의 첫 생성 시 GPU, Networking, WebContent 프로세스 초기화에 3-7초 소요
 * Android: Chromium 엔진 초기화에 200-300ms 소요
 *
 * 이 함수를 앱 시작 시 또는 결제 화면 진입 전에 호출하면,
 * 실제 결제 시 즉시 결제창이 표시됩니다.
 *
 * @example
 * ```tsx
 * // App.tsx 또는 index.js에서
 * import { warmUp } from 'react-native-bootpay-api';
 *
 * // 앱 시작 시 호출
 * warmUp();
 * ```
 */
export const warmUp = (): void => {
  if (BPCWebViewModule?.warmUp) {
    BPCWebViewModule.warmUp();
  }
};

/**
 * 프리워밍된 WebView 리소스를 해제합니다.
 * 메모리가 부족할 때 호출할 수 있습니다.
 *
 * @example
 * ```tsx
 * import { releaseWarmUp } from 'react-native-bootpay-api';
 *
 * // 메모리 정리가 필요할 때
 * releaseWarmUp();
 * ```
 */
export const releaseWarmUp = (): void => {
  if (BPCWebViewModule?.releaseWarmUp) {
    BPCWebViewModule.releaseWarmUp();
  }
};

export {
  // 기존 결제 컴포넌트
  Bootpay,
  Payload,
  Extra,
  Item,
  User,
  BootpayEventData,
  BootpayTypesProps,
  // Widget 컴포넌트
  BootpayWidget,
  WidgetData,
  WidgetTerm,
  WidgetExtra,
  WidgetPayload,
  WidgetPayloadExtra,
  BootpayWidgetProps,
  WidgetReadyCallback,
  WidgetResizeCallback,
  WidgetChangePaymentCallback,
  WidgetChangeTermsCallback,
  // Commerce 컴포넌트
  BootpayCommerce,
  CommercePayload,
  CommerceUser,
  CommerceProduct,
  CommerceExtra,
  CommerceEventData,
  BootpayCommerceProps,
};
