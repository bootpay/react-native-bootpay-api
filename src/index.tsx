import { NativeModules, Platform } from 'react-native';
import { Bootpay } from './Bootpay';
import { BootpayWidget } from './BootpayWidget';
import { BootpayCommerce } from './BootpayCommerce';
import {
  Payload,
  Extra,
  Item,
  User,
} from './BootpayTypes';
import {
  WidgetPayload,
  WidgetPayloadExtra,
} from './WidgetTypes';
import {
  CommercePayload,
  CommerceUser,
  CommerceProduct,
  CommerceExtra,
} from './CommerceTypes';

export type {
  BootpayEventData,
  BootpayTypesProps,
} from './BootpayTypes';
export type {
  WidgetData,
  WidgetTerm,
  WidgetExtra,
  BootpayWidgetProps,
  WidgetReadyCallback,
  WidgetResizeCallback,
  WidgetChangePaymentCallback,
  WidgetChangeTermsCallback,
} from './WidgetTypes';
export type {
  CommerceEventData,
  BootpayCommerceProps,
} from './CommerceTypes';

const BPCWebViewModule = NativeModules.BPCWebViewModule;

// 자동 warmUp 상태 관리
let _autoWarmUpCalled = false;

/**
 * 내부 자동 warmUp 함수
 * 패키지 import 시 자동으로 호출되어 WebView 프로세스를 미리 초기화합니다.
 */
const _autoWarmUp = (): void => {
  if (_autoWarmUpCalled) return;
  _autoWarmUpCalled = true;

  // iOS/Android에서만 동작
  if (Platform.OS !== 'ios' && Platform.OS !== 'android') return;

  try {
    if (BPCWebViewModule?.warmUp) {
      BPCWebViewModule.warmUp();
      if (__DEV__) {
        console.log('[Bootpay] WebView auto warm-up initiated');
      }
    }
  } catch (e) {
    // warmUp 실패해도 결제 기능에는 영향 없음
  }
};

/**
 * WebView 프로세스를 미리 초기화하여 첫 결제 화면 로딩 속도를 개선합니다.
 *
 * iOS: WKWebView의 첫 생성 시 GPU, Networking, WebContent 프로세스 초기화에 3-7초 소요
 * Android: Chromium 엔진 초기화에 200-300ms 소요
 *
 * 참고: SDK import 시 자동으로 warmUp이 호출되므로, 일반적으로 명시적 호출이 필요하지 않습니다.
 *
 * @example
 * ```tsx
 * // 자동 warmUp이 기본 동작이므로, 별도 호출 불필요
 * // 필요한 경우에만 명시적으로 호출
 * import { warmUp } from 'react-native-bootpay-api';
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

// 패키지 import 시 자동으로 warmUp 실행
_autoWarmUp();

export {
  // 기존 결제 컴포넌트
  Bootpay,
  Payload,
  Extra,
  Item,
  User,
  // Widget 컴포넌트
  BootpayWidget,
  WidgetPayload,
  WidgetPayloadExtra,
  // Commerce 컴포넌트
  BootpayCommerce,
  CommercePayload,
  CommerceUser,
  CommerceProduct,
  CommerceExtra,
};
