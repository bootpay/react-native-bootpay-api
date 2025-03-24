import { ViewProps } from 'react-native';

export interface BootpayTypesProps extends ViewProps {
  ref?: any;
  ios_application_id?: string;
  android_application_id?: string;
  onCancel?: (data: Object) => void;
  onError?: (data: Object) => void;
  onIssued?: (data: Object) => void;
  onConfirm?: (data: Object) => boolean;
  onDone?: (data: Object) => void;
  onClose?: () => void;
}

export interface LoadingTypesProps extends ViewProps {
  loading?: boolean;
}

export class User {
  id?: string;
  username?: string;
  email?: string;
  gender?: number;
  birth?: string;
  phone?: string;
  area?: string;
  addr?: string;

  constructor() {}
}

export class Item {
  name?: string;
  qty?: number;
  id?: string;
  price?: number;
  cat1?: string;
  cat2?: string;
  cat3?: string;

  constructor() {}
}

export class StatItem {
  item_name?: string;
  item_img?: string;
  unique?: string;
  price?: number;
  cat1?: string;
  cat2?: string;
  cat3?: string;

  constructor() {}
}

export class Onestore {
  ad_id?: string = 'UNKNOWN_ADID';
  sim_operator?: string = 'UNKNOWN_SIM_OPERATOR';
  installer_package_name?: string = 'UNKNOWN_INSTALLER';

  constructor() {}
}

export class Extra {
  card_quota?: string;
  seller_name?: string;
  delivery_day?: number = 1;
  locale?: string = 'ko';
  offer_period?: string;
  display_cash_receipt?: boolean = true;
  deposit_expiration?: string;
  app_scheme?: string;
  use_card_point?: boolean = true;
  direct_card?: string;
  use_order_id?: boolean = false;
  international_card_only?: boolean = false;
  phone_carrier?: string = '';
  direct_app_card?: boolean = false;
  direct_samsungpay?: boolean = false;
  test_deposit?: boolean = false;
  enable_error_webhook?: boolean = false;
  separately_confirmed?: boolean = true;
  confirmOnlyRestApi?: boolean = false;
  open_type?: string = 'redirect';
  use_bootpay_inapp_sdk?: boolean = true;
  redirect_url?: string = 'https://api.bootpay.co.kr/v2';
  display_success_result?: boolean = false;
  display_error_result?: boolean = true;
  disposable_cup_deposit?: number = 0;
  use_welcomepayment?: number = 0;
  first_subscription_comment?: string = '';
  except_card_companies?: string[];
  enable_easy_payments?: string[];
  confirm_grace_seconds?: number = 0;
  show_close_button?: boolean = false;

  constructor() {}
}

export class Payload {
  application_id?: string;
  android_application_id?: string;
  ios_application_id?: string;
  pg?: string;
  method?: string;
  methods?: string[];
  order_name?: string;
  price?: number;
  tax_free?: number;
  order_id?: string;
  subscription_id?: string;
  authentication_id?: string;
  metadata?: Object;
  user_token?: string;
  extra?: Extra;
  user?: User;
  items?: Item[];

  constructor() {}
}
