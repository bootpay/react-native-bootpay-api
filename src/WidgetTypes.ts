/**
 * Widget 관련 타입 정의
 * Flutter의 widget_data.dart를 참고하여 구현
 */

export interface WidgetTerm {
  term_id?: string;
  pk?: string;
  title?: string;
  agree?: boolean;
  term_type?: number;
}

export interface WidgetExtra {
  direct_card_company?: string;
  direct_card_quota?: number;
  card_quota?: number;
}

export interface WidgetData {
  pg?: string;
  method?: string;
  wallet_id?: string;
  select_terms?: WidgetTerm[];
  currency?: string; // KRW, USD
  term_passed?: boolean;
  completed?: boolean;
  extra?: WidgetExtra;
  // 네이티브 SDK와 호환을 위한 추가 필드
  method_origin_symbol?: string;
  method_symbol?: string;
  easy_pay?: string;
  card_quota?: string;
}

export type WidgetReadyCallback = () => void;
export type WidgetResizeCallback = (height: number) => void;
export type WidgetChangePaymentCallback = (data: WidgetData | null) => void;
export type WidgetChangeTermsCallback = (data: WidgetData | null) => void;

export interface BootpayWidgetProps {
  // 앱 ID
  ios_application_id?: string;
  android_application_id?: string;
  client_key?: string;

  // Widget 전용 콜백
  onWidgetReady?: WidgetReadyCallback;
  onWidgetResize?: WidgetResizeCallback;
  onWidgetChangePayment?: WidgetChangePaymentCallback;
  onWidgetChangeTerms?: WidgetChangeTermsCallback;

  // 결제 콜백
  onCancel?: (data: unknown) => void;
  onError?: (data: unknown) => void;
  onIssued?: (data: unknown) => void;
  onConfirm?: (data: unknown) => boolean;
  onDone?: (data: unknown) => void;
  onClose?: () => void;

  // 스타일
  height?: number;
  style?: object;
  widgetTop?: number; // Widget 위치 (위젯 모드에서 position: absolute의 top 값)
}

export class WidgetPayload {
  widget_key?: string;
  widget_sandbox?: boolean;
  widget_use_terms?: boolean;

  // 기본 Payload 필드
  application_id?: string;
  client_key?: string;
  pg?: string;
  method?: string;
  methods?: string[];
  order_name?: string;
  price?: number;
  tax_free?: number;
  order_id?: string;
  subscription_id?: string;
  metadata?: Record<string, unknown>;
  extra?: WidgetPayloadExtra;

  constructor() {
    this.widget_sandbox = false;
    this.widget_use_terms = false;
  }
}

export class WidgetPayloadExtra {
  app_scheme?: string;
  card_quota?: string;
  show_close_button?: boolean;
  separately_confirmed?: boolean;
  display_success_result?: boolean;
  display_error_result?: boolean;
  locale?: string;
  offer_period?: string;
  open_type?: string;
  use_bootpay_inapp_sdk?: boolean; // native app에서 redirect를 완성도있게 지원하기 위한 옵션
  redirect_url?: string;

  constructor() {
    this.separately_confirmed = true;
    this.display_success_result = false;
    this.display_error_result = false;
    this.use_bootpay_inapp_sdk = true;
    this.redirect_url = 'https://api.bootpay.co.kr/v2/callback';
  }
}
