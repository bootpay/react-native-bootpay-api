## 13.15.0
* 통합 환경 모드 API 추가
  - `setEnvironmentMode('development' | 'stage' | 'production')` 모듈 레벨 export
  - Bootpay / BootpayWidget / BootpayCommerce 가 동일 truth-table 로 webview 에 주입
  - 기본값은 항상 `production`; legacy DEBUG fallback 유지
  - `BootpayEnvironmentMode` 타입 export
* example: react-native-dotenv 기반 client_key 예제로 정리하고 production fallback 유지
  - legacy `application_id` props 는 호환용으로 유지
  - `BOOTPAY_SECRET_KEY` 흔적 제거 (client 에 secret 노출 금지)
* iOS 예제 Info.plist 의 URL scheme 을 `bootpayReactNativeExample` 로 정렬
  - `BootpayConfig.APP_SCHEME` 와 일치시켜 결제 후 외부 앱 → RN 앱 복귀 정상화

## 13.14.5
* react-native-webview-bootpay 13.14.4 적용
  - Android `<queries>` 보강 (모니모/카카오뱅크 등)
  - Android/iOS 라우팅 보강 — 삼성 모니모(`monimopay://`, `smcard://`) 스킴 App Store fallback 추가

## 13.14.4
* BootpayWidget에서 display_success_result/display_error_result 지원
  - done/error/issued 이벤트 시 결과 화면을 풀스크린으로 유지
  - 사용자가 "확인" 클릭 시 bootpayWidgetRevertScreen으로 위젯 복귀
  - Flutter SDK와 동일한 동작으로 통일

## 13.14.3
* Bootpay, BootpayCommerce에서 display_success_result 사용 시 결과 화면 "확인" 클릭해도 모달이 닫히지 않는 버그 수정
* bootpayWidgetRevertScreen 이벤트 처리 추가 (Bootpay, BootpayCommerce)

## 13.14.2
* react-native-webview-bootpay 13.14.1 적용
* React Native New Architecture (Fabric) 웹뷰 흰 화면 수정

## 13.14.0
* webview CDN URL을 5.3.0으로 업데이트
* client_key 인증 방식 추가 (Payload, WidgetPayload, Props 모두 지원)
* iOS 최소 지원 버전 9.0 → 15.0으로 상향
* macOS 최소 지원 버전 10.13 → 11.0으로 상향
* CommerceScreen 중복 하드코딩 제거, BootpayConfig 통합

### 13.13.46
- iOS UIScene lifecycle 지원 추가
  - SceneDelegate 구현으로 향후 iOS 호환성 확보
  - "UIScene lifecycle will soon be required" 경고 해결

### 13.13.45
- WebView 자동 프리워밍 기능 추가 (iOS/Android)
  - SDK import 시 자동으로 warmUp 수행 (개발자 호출 불필요)
  - iOS: WKWebView 첫 로딩 3-7초 단축
  - Android: Chromium 엔진 초기화 200-300ms 단축
  - releaseWarmUp()으로 메모리 부족 시 리소스 해제 가능 (선택사항)

### 13.13.44
- BootpayCommerce 컴포넌트 추가 (구독/커머스 결제)
- Commerce onIssued 콜백 추가 (가상계좌 발급 완료)
- 결제 결과 화면에서 메인 메뉴로 pop 네비게이션 개선

### 13.13.43
- BootpayWidget 컴포넌트 추가 (인라인 위젯 결제)
- iOS 뒤로가기 스와이프 제스처 지원 (react-native-gesture-handler)
- Widget/Fullscreen 전환 시 WebView 상태 유지 개선
- example 앱 Flutter 스타일 구조로 리팩토링
- 결제 결과 화면 Modal 방식으로 개선

### 13.13.42
- webview version update

### 13.13.41
- dependencies module change to react-native-keychain

### 13.8.44
- webview version update

### 13.8.42
- 설정 재배포 

### 13.8.41
- webview version update

### 13.8.4
- ssl error 발생시 안드로이드는 소프트업데이트로 안내

### 13.8.2
- react-native, webview version update

### 13.6.13
- webview version update

### 5.0.3
- webview version update

### 4.3.3
- webview version update

### 4.3.2
- webview version update

### 4.3.1
- webview version update
- 결제완료시 close event 전송 

### 4.2.6
- bootpay js 4.2.6 update 
- user 회원 정보가 object로 전달되는 버그 개선 


### 4.1.55
- default extra field value added 

### 4.1.54
- webview version update for android auto link path

### 4.1.53
- 재빌드, 재배포

### 4.1.52
- webview version update for ios deeplink bug fixed 

### 4.1.51
- images 폴더 빌드되지 않는 버그 fixed

### 4.1.5
- typescript로 재작성

### 4.1.4
- 재빌드, 재배포

### 4.1.3
- webview version update 

### 4.1.2
- 4.1.0에서 적용했었던 부분을 로백함. v2는 data.data로 파싱(v2끼리 통일)하고 v1과의 호환된 데이터포맷을 지원하지 않기로 정책을 결정함. 

### 4.1.1
- android hardware back button 시 close 이벤트 통지 
- open type popup일 경우 done 미수신 버그 수정 

### 4.1.0
- redirect type일 경우 done 에서 data.data로 파싱해야 하는 문제 수정, 기존 문법과 동일하게 적용가능하도록 패치한 버전 

### 4.0.9
- open type redirect default 적용 
- 네이버페이 뒤로가기 버튼 제거 

### 4.0.0
- bootpay major update 

### 1.5.2
- webview version update 

### 1.5.1
- 안드로이드 팝업 일 경우 백버튼 클릭시 닫히도록 수정 

### 1.5.0
- webview update, android manifest 외부앱 패키지명 update 
### 4.0.8
- bootpay webview version update 

### 4.0.7
- 가상계좌 발급 버그 수정 

### 4.0.6
- bootpay js 4.0.6 udpate 
- openType redirect default 적용 

### 4.0.0
- bootpay js major update 


### 1.4.4
- 사용하지 않은 패키지 제거 

### 1.4.3
- bootpay anlaytics api 추가 

### 1.0.4
- typescript declare 적용 

### 1.0.3
- close button 클릭시 onCancel, onClose 이벤트 호출 

### 1.0.2
- callJavascript 버그 수정 

### 1.0.1
- close.png 못찾는 버그 수정 

### 1.0.0
- first release  
