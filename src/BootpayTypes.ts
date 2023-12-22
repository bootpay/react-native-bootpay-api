
import {
  ViewProps,
} from 'react-native'

export interface BootpayTypesProps extends ViewProps {
    ref?: any
    ios_application_id?: string
    android_application_id?: string
    onCancel?: (data: Object) => void
    onError?: (data: Object) => void
    onIssued?: (data: Object) => void
    onConfirm?: (data: Object) => boolean
    onDone?: (data: Object) => void
    onClose?: () => void 
}

export interface LoadingTypesProps extends ViewProps {
    loading?: boolean 
}




export class User {
    constructor() {}

    id?: string
    username?: string
    email?: string
    gender?: number
    birth?: string
    phone?: string
    area?: string
    addr?: string
}

export class Item {
    constructor() {}

    name?: string
    qty?: number
    id?: string
    price?: number
    cat1?: string
    cat2?: string
    cat3?: string
}

export class StatItem {
    constructor() {}

    item_name?: string
    item_img?: string
    unique?: string
    price?: number
    cat1?: string
    cat2?: string
    cat3?: string
}

export class Onestore { 
    constructor() {}

    ad_id?: string = "UNKNOWN_ADID"
    sim_operator?: string = "UNKNOWN_SIM_OPERATOR"
    installer_package_name?: string = "UNKNOWN_INSTALLER"
}

 

// export interface Extra {
//     card_quota?: string;
//     seller_name?: string;
//     delivery_day?: number;

// }

export class Extra {
    constructor() {}

    card_quota?: string // 할부허용 범위 (5만원 이상 구매시)
    seller_name?: string  //노출되는 판매자명 설정
    delivery_day?: number = 1  // 배송일자
    locale?: string = 'ko' //결제창 언어지원
    offer_period?: string //결제창 제공기간에 해당하는 string 값, 지원하는 PG만 적용됨
    display_cash_receipt?: boolean = true // 현금영수증 보일지 말지.. 가상계좌 KCP 옵션
    deposit_expiration?: string //가상계좌 입금 만료일자 설정
    app_scheme?: string // 모바일 앱에서 결제 완료 후 돌아오는 옵션 ( 아이폰만 적용 )
    use_card_point?: boolean = true //카드 포인트 사용 여부 (토스만 가능)
    direct_card?: string //해당 카드로 바로 결제창 (토스만 가능)
    use_order_id?: boolean = false //가맹점 order_id로 PG로 전송
    international_card_only?: boolean = false // 해외 결제카드 선택 여부 (토스만 가능)
    phone_carrier?: string = "" //본인인증 시 고정할 통신사명, SKT,KT,LGT 중 1개만 가능
    direct_app_card?: boolean = false // 카드사앱으로 direct 호출
    direct_samsungpay?: boolean = false  // 삼성페이 바로 띄우기
    test_deposit?: boolean = false  // 가상계좌 모의 입금
    enable_error_webhook?: boolean = false //결제 오류시 Feedback URL로 webhook
    separately_confirmed?: boolean = true // confirm 이벤트를 호출할지 말지, false일 경우 자동승인
    confirmOnlyRestApi?: boolean = false  // REST API로만 승인 처리
    open_type?: string = 'redirect' // 페이지 오픈 type, [iframe, popup, redirect] 중 택 1
    use_bootpay_inapp_sdk?: boolean = true  // native app에서는 redirect를 완성도있게 지원하기 위한 옵션
    redirect_url?: string = 'https://api.bootpay.co.kr/v2' //open_type이 redirect일 경우 페이지 이동할 URL (  오류 및 결제 완료 모두 수신 가능 )
    display_success_result?: boolean = false // 결제 완료되면 부트페이가 제공하는 완료창으로 보여주기 ( open_type이 iframe, popup 일때만 가능 )
    display_error_result?: boolean = true // 결제 실패되면 부트페이가 제공하는 실패창으로 보여주기 ( open_type이 iframe, popup 일때만 가능 )
    disposable_cup_deposit?: number = 0 // 배달대행 플랫폼을 위한 컵 보증급 가격
    // ExtraCardEasyOption cardEasyOption = ExtraCardEasyOption();
    // List<BrowserOpenType>? browserOpenType = [];
    use_welcomepayment?: number = 0 //웰컴 재판모듈 진행시 1
    first_subscription_comment?: string = '' // 자동결제 price > 0 조건일 때 첫 결제 관련 메세지
    except_card_companies?: [string] // 제외할 카드사 리스트 ( enable_card_companies가 우선순위를 갖는다 )
    enable_easy_payments?: [string] // 노출될 간편결제 리스트
    confirm_grace_seconds?: number = 0  // 결제승인 유예시간 ( 승인 요청을 여러번하더라도 승인 이후 특정 시간동안 계속해서 결제 response_data 를 리턴한다 )
    show_close_button: boolean = false // x 닫기 버튼을 보여줄지 말지
}

export class Payload { 

    application_id?: string
    android_application_id?: string
    ios_application_id?: string
    pg?: string
    method?: string
    methods?: [string]
    order_name?: string
    price?: number
    tax_free?: number
    order_id?: string
    subscription_id?: string
    authentication_id?: string
    metadata?: Object
    user_token?: string
    extra?: Extra
    user?: User 
    items?: [Item]
}