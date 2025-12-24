import { ViewProps } from 'react-native';

export interface CommerceEventData {
  event: string;
  receipt_id?: string;
  order_id?: string;
  request_id?: string;
  price?: number;
  message?: string;
  code?: number | string;
  metadata?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface BootpayCommerceProps extends ViewProps {
  ref?: React.RefObject<unknown>;
  onCancel?: (data: CommerceEventData) => void;
  onError?: (data: CommerceEventData) => void;
  onDone?: (data: CommerceEventData) => void;
  onIssued?: (data: CommerceEventData) => void; // 가상계좌 발급 완료 콜백 (iOS SDK와 동일)
  onClose?: () => void;
}

export class CommerceUser {
  membershipType?: string = 'guest'; // 'guest' | 'member'
  userId?: string;
  name?: string;
  phone?: string;
  email?: string;

  constructor() {}
}

export class CommerceProduct {
  productId: string = '';
  duration: number = -1; // -1: 무기한
  quantity: number = 1;

  constructor() {}
}

export class CommerceExtra {
  separatelyConfirmed?: boolean = false;
  createOrderImmediately?: boolean = true;

  constructor() {}
}

export class CommercePayload {
  clientKey: string = '';
  name?: string;
  memo?: string;
  user?: CommerceUser;
  price: number = 0;
  redirectUrl?: string;
  usageApiUrl?: string;
  useAutoLogin?: boolean = false;
  requestId?: string;
  useNotification?: boolean = false;
  products?: CommerceProduct[];
  metadata?: Record<string, string>;
  metadataAny?: Record<string, unknown>;
  extra?: CommerceExtra;

  constructor() {}

  toJSON(): Record<string, unknown> {
    const json: Record<string, unknown> = {
      client_key: this.clientKey,
    };

    // price > 0 일 때만 포함 (iOS SDK와 동일)
    if (this.price > 0) json.price = this.price;

    if (this.name) json.name = this.name;
    if (this.memo) json.memo = this.memo;
    if (this.redirectUrl) json.redirect_url = this.redirectUrl;
    if (this.usageApiUrl) json.usage_api_url = this.usageApiUrl;
    json.use_auto_login = this.useAutoLogin ?? false;
    if (this.requestId) json.request_id = this.requestId;
    json.use_notification = this.useNotification ?? false;

    if (this.user) {
      const userJson: Record<string, unknown> = {
        membership_type: this.user.membershipType ?? 'guest',
      };
      if (this.user.userId) userJson.user_id = this.user.userId;
      if (this.user.name) userJson.name = this.user.name;
      if (this.user.phone) userJson.phone = this.user.phone;
      if (this.user.email) userJson.email = this.user.email;
      json.user = userJson;
    }

    if (this.products && this.products.length > 0) {
      json.products = this.products.map((p) => ({
        product_id: p.productId,
        duration: p.duration,
        quantity: p.quantity,
      }));
    }

    // metadataAny 우선, 없으면 metadata 사용 (iOS SDK와 동일)
    if (this.metadataAny && Object.keys(this.metadataAny).length > 0) {
      json.metadata = this.metadataAny;
    } else if (this.metadata && Object.keys(this.metadata).length > 0) {
      json.metadata = this.metadata;
    }

    if (this.extra) {
      const extraJson: Record<string, unknown> = {
        separately_confirmed: this.extra.separatelyConfirmed ?? false,
        create_order_immediately: this.extra.createOrderImmediately ?? true,
      };
      json.extra = extraJson;
    }

    return json;
  }

  toJSONString(): string {
    return JSON.stringify(this.toJSON());
  }
}
