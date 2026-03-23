import React, { Component } from 'react';
import {
  SafeAreaView,
  StyleSheet,
  Platform,
  Animated,
  BackHandler,
  NativeEventSubscription,
  Dimensions,
  View,
} from 'react-native';
import WebView, { WebViewMessageEvent } from 'react-native-webview-bootpay';
import {
  GestureHandlerRootView,
  GestureDetector,
  Gesture,
  GestureStateChangeEvent,
  GestureUpdateEvent,
  PanGestureHandlerEventPayload,
} from 'react-native-gesture-handler';
import { BootpayWidgetProps, WidgetPayload, WidgetData } from './WidgetTypes';
import { Payload, Item, User, Extra } from './BootpayTypes';
import { debounce } from 'lodash';
import UserInfo from './UserInfo';

const SDK_VERSION = '13.13.4';
const DEBUG_MODE = false; // 디버그 모드 비활성화
const WIDGET_URL = 'https://webview.bootpay.co.kr/5.3.0/widget.html';

type PaymentResult = 'DONE' | 'ERROR' | 'CANCEL' | 'NONE';

interface BootpayWidgetState {
  isFullScreen: boolean;
  widgetHeight: number;
  isReady: boolean;
  paymentResult: PaymentResult;
  screenWidth: number;
  screenHeight: number;
  isSwiping: boolean; // 스와이프 중인지 여부
}

/**
 * BootpayWidget - 인라인 위젯 방식의 결제 컴포넌트
 *
 * Flutter의 BootpayWebView + BootpayHeroWebView와 동일한 동작:
 * 1. 화면에 작은 WebView 위젯으로 표시 (widget.html 로드)
 * 2. 사용자가 결제수단 선택 및 약관 동의
 * 3. requestPayment() 호출 시 같은 WebView가 전체화면으로 전환
 * 4. 결제 완료/취소/에러 시 위젯 상태로 복귀
 * 5. 위젯 리로드하여 다시 결제 준비 상태로
 *
 * 핵심: 동일한 WebView 인스턴스를 유지하여 결제 상태 보존
 */
export class BootpayWidget extends Component<
  BootpayWidgetProps,
  BootpayWidgetState
> {
  webView: React.RefObject<WebView>;
  payload?: WidgetPayload;
  backHandler?: NativeEventSubscription;
  animatedTop: Animated.Value;
  animatedLeft: Animated.Value;
  animatedWidth: Animated.Value;
  animatedHeight: Animated.Value;
  initialScript: string; // injectedJavaScript prop에 사용할 초기 스크립트
  panGesture: ReturnType<typeof Gesture.Pan>; // iOS 스와이프 백 제스처용
  swipeAnimatedValue: Animated.Value; // 스와이프 애니메이션 값
  isValidSwipe: boolean = false; // 유효한 스와이프 여부
  swipeStartX: number = 0; // 스와이프 시작 X 좌표

  constructor(props: BootpayWidgetProps) {
    super(props);
    this.webView = React.createRef();

    const { width, height } = Dimensions.get('window');
    const initialHeight = props.height || 200;

    // 애니메이션 값 초기화 (위젯 모드 크기)
    this.animatedTop = new Animated.Value(0);
    this.animatedLeft = new Animated.Value(0);
    this.animatedWidth = new Animated.Value(width);
    this.animatedHeight = new Animated.Value(initialHeight);
    this.swipeAnimatedValue = new Animated.Value(0);

    this.state = {
      isFullScreen: false,
      widgetHeight: initialHeight,
      isReady: false,
      paymentResult: 'NONE',
      screenWidth: width,
      screenHeight: height,
      isSwiping: false,
    };

    // 초기 JavaScript 스크립트 생성 (Bootpay.tsx와 동일한 패턴)
    this.initialScript = this.buildInitialScript();

    // iOS 스와이프 백 제스처 설정 (react-native-gesture-handler 사용)
    this.panGesture = Gesture.Pan()
      .activeOffsetX(10) // 오른쪽으로 10px 이상 이동해야 활성화
      .failOffsetX(-10) // 왼쪽으로 이동하면 실패
      .failOffsetY([-20, 20]) // 위아래로 20px 이상 이동하면 실패
      .onBegin((event: GestureStateChangeEvent<PanGestureHandlerEventPayload>) => {
        // 시작 위치 저장, 왼쪽 70px 영역에서만 유효
        this.swipeStartX = event.x;
        this.isValidSwipe = event.x < 70;
        if (DEBUG_MODE) {
          console.log('[Gesture] onBegin x:', event.x, 'isValid:', this.isValidSwipe);
        }
      })
      .onStart(() => {
        if (this.isValidSwipe) {
          this.setState({ isSwiping: true });
        }
      })
      .onUpdate((event: GestureUpdateEvent<PanGestureHandlerEventPayload>) => {
        // 유효한 스와이프이고 오른쪽으로 이동할 때만 애니메이션
        if (this.isValidSwipe && event.translationX > 0) {
          this.swipeAnimatedValue.setValue(event.translationX);
        }
      })
      .onEnd((event: GestureStateChangeEvent<PanGestureHandlerEventPayload>) => {
        if (!this.isValidSwipe) {
          this.setState({ isSwiping: false });
          return;
        }
        const { screenWidth } = this.state;
        const translationX = event.translationX || 0;

        if (DEBUG_MODE) {
          console.log('[Gesture] onEnd translationX:', translationX, 'threshold:', screenWidth * 0.4);
        }

        // 화면의 40% 이상 스와이프하면 닫기
        if (translationX > screenWidth * 0.4) {
          // 1. 먼저 위젯 reload 시작 (백그라운드에서 로드)
          this._widgetRendered = false;
          this.callJavaScript(`window.location.href = '${WIDGET_URL}';`);

          // 2. 화면 밖으로 슬라이드 애니메이션
          Animated.timing(this.swipeAnimatedValue, {
            toValue: screenWidth,
            duration: 200,
            useNativeDriver: true,
          }).start(() => {
            // 3. 애니메이션 완료 후 위젯 모드로 전환
            this.swipeAnimatedValue.setValue(0);
            this.setState({ isSwiping: false, isFullScreen: false, isReady: false });
            this._isProcessingPayment = false;
            this.removeBackHandler();

            // onClose 콜백 호출
            if (this.props.onClose) {
              this.props.onClose();
            }
          });
        } else {
          // 원위치로 복귀
          Animated.spring(this.swipeAnimatedValue, {
            toValue: 0,
            useNativeDriver: true,
          }).start(() => {
            this.setState({ isSwiping: false });
          });
        }
        this.isValidSwipe = false;
      })
      .onFinalize(() => {
        // 제스처가 취소되거나 종료될 때 정리
        if (this.state.isSwiping) {
          Animated.spring(this.swipeAnimatedValue, {
            toValue: 0,
            useNativeDriver: true,
          }).start(() => {
            this.setState({ isSwiping: false });
          });
        }
        this.isValidSwipe = false;
      });
  }

  // iOS/Android 모두 지원하는 브릿지 헬퍼 함수 (Flutter와 동일한 패턴)
  // window 전역에 등록하여 이후 callJavaScript에서도 사용 가능
  getBridgeHelperJS = (): string => {
    return `
      window.bridgePost = function(message) {
        // iOS WebKit MessageHandler
        if (window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.BootpayRNWebView) {
          window.webkit.messageHandlers.BootpayRNWebView.postMessage(message);
        }
        // Android JavascriptInterface or WebMessageListener
        else if (window.BootpayRNWebView && window.BootpayRNWebView.postMessage) {
          window.BootpayRNWebView.postMessage(String(message));
        }
        // Fallback: ReactNativeWebView (기본 react-native-webview)
        else if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
          window.ReactNativeWebView.postMessage(String(message));
        }
      };
      var bridgePost = window.bridgePost;
    `;
  };

  // 초기 스크립트 빌드 - injectedJavaScript prop에 사용
  // Flutter와 동일: bridgeHelper와 waitForBootpayWidget만 정의, widgetReady만 전송
  // 이벤트 리스너는 renderWidget에서 등록 (Flutter _getRenderWidgetJS 패턴)
  buildInitialScript = (): string => {
    return `
      (function() {
        console.log('[BootpayWidget JS] Initial script started');

        // iOS/Android 브릿지 헬퍼 함수 정의 (전역으로 등록)
        ${this.getBridgeHelperJS()}

        // waitForBootpayWidget 함수 정의 (전역으로 등록)
        ${this.getWaitForBootpayWidgetJS()}

        // BootpayWidget이 준비되면 widgetReady 이벤트만 전송
        // 이벤트 리스너는 renderWidget에서 등록됨 (Flutter 패턴)
        waitForBootpayWidget(function() {
          console.log('[BootpayWidget JS] BootpayWidget SDK loaded');
          try {
            window.bridgePost(JSON.stringify({event:'widgetReady'}));
            console.log('[BootpayWidget JS] Sent widgetReady message');
          } catch(e) {
            console.error('[BootpayWidget JS] postMessage error:', e);
          }
        });
      })();
      true;
    `;
  };

  componentDidMount() {
    if (DEBUG_MODE) {
      console.log('[BootpayWidget] ===== componentDidMount =====');
      console.log('[BootpayWidget] WIDGET_URL:', WIDGET_URL);
    }

    this.closeDismiss = debounce(this.closeDismiss, 30);

    // 화면 크기 변경 감지
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      this.setState({
        screenWidth: window.width,
        screenHeight: window.height,
      });
    });

    // cleanup을 위해 저장
    this._dimensionsSubscription = subscription;
  }

  _dimensionsSubscription?: { remove: () => void };

  componentWillUnmount() {
    this.removeBackHandler();
    this._dimensionsSubscription?.remove();
    UserInfo.setBootpayLastTime(Date.now());
  }

  // Back button handler for Android
  setupBackHandler = () => {
    if (Platform.OS === 'android') {
      this.backHandler = BackHandler.addEventListener(
        'hardwareBackPress',
        () => {
          if (this.state.isFullScreen) {
            this.revertToWidget();
            return true;
          }
          return false;
        }
      );
    }
  };

  removeBackHandler = () => {
    if (this.backHandler) {
      this.backHandler.remove();
      this.backHandler = undefined;
    }
  };

  // Widget을 전체화면으로 전환 - Flutter의 _expandToFullscreen과 동일
  goFullScreen = () => {
    console.log('[Fullscreen] >>> goFullScreen called');
    this.setupBackHandler(); // Android 백 버튼 핸들러 등록
    this.setState({ isFullScreen: true, paymentResult: 'NONE' });
  };

  // 전체화면에서 Widget으로 복귀 - iOS Swift SDK의 collapseToOriginal/collapseAndReload와 동일
  revertToWidget = (shouldReload: boolean = true) => {
    console.log(
      '[Fullscreen] <<< revertToWidget called, paymentResult:',
      this.state.paymentResult,
      'shouldReload:',
      shouldReload
    );

    const { paymentResult } = this.state;

    this._widgetRendered = false;
    this._isProcessingPayment = false;
    this.removeBackHandler(); // Android 백 버튼 핸들러 해제

    // iOS Swift SDK와 동일: 축소 시작 전에 위젯 URL을 먼저 로드
    // 이렇게 하면 축소 애니메이션 중에 위젯이 렌더링되어 자연스러운 전환이 됩니다.
    if (shouldReload) {
      console.log(
        '[Fullscreen] reloading widget URL before collapse animation'
      );
      this.reloadWidget();
    }

    // 축소 (약간의 딜레이 후 - 위젯 로드 시작 후 축소)
    setTimeout(() => {
      this.setState({ isFullScreen: false, isReady: false });

      if (paymentResult === 'NONE') {
        if (this.props.onCancel) {
          this.props.onCancel({
            action: 'BootpayCancel',
            status: -100,
            message: '사용자에 의한 취소',
          });
        }
      }

      this.setState({ paymentResult: 'NONE' });
    }, 100);
  };

  closeDismiss = () => {
    console.log('[Fullscreen] closeDismiss called');
    if (this.state.isFullScreen) {
      this.revertToWidget();
    }
    if (this.props.onClose) {
      this.props.onClose();
    }
  };

  // WebView에 JavaScript 실행
  callJavaScript = (script: string) => {
    if (DEBUG_MODE) {
      console.log('[BootpayWidget] callJavaScript:', script.substring(0, 200));
    }
    this.webView.current?.injectJavaScript(
      `setTimeout(function() { ${script} }, 30); true;`
    );
  };

  // Widget 리로드 - WebView에서 위젯 URL을 다시 로드하고 BootpayWidget.render 재실행
  reloadWidget = () => {
    console.log('[BootpayWidget] reloadWidget called');

    // 리로드 시 상태 리셋
    this._widgetRendered = false;
    this.setState({ isReady: false });

    // JavaScript로 페이지 리로드 (iOS에서 더 안정적)
    this.callJavaScript(`window.location.href = '${WIDGET_URL}';`);
  };

  // Widget 업데이트
  updateWidget = (payload: WidgetPayload, refresh: boolean = false) => {
    this.payload = payload;
    this.callJavaScript(
      `BootpayWidget.update(${JSON.stringify(payload)}, ${refresh});`
    );
  };

  // 위젯이 이미 렌더링되었는지 추적 (무한 루프 방지)
  _widgetRendered: boolean = false;

  // Widget 렌더링 (초기 설정) - 반드시 먼저 호출해야 함
  // Flutter의 _renderWidget과 동일한 패턴:
  // 1. setDevice/setVersion을 별도 JS 호출로 먼저 실행 (_runDeviceSetup)
  // 2. render 스크립트에서 waitForBootpayWidget 내부에 이벤트 리스너 + BootpayWidget.render
  renderWidget = (payload: WidgetPayload) => {
    // 이미 렌더링된 경우 무시 (무한 루프 방지)
    if (this._widgetRendered) {
      if (DEBUG_MODE) {
        console.log('[BootpayWidget] renderWidget ignored - already rendered');
      }
      return;
    }

    if (DEBUG_MODE) {
      console.log('[BootpayWidget] ===== renderWidget called =====');
      console.log('[BootpayWidget] isReady:', this.state.isReady);
      console.log(
        '[BootpayWidget] payload:',
        JSON.stringify(payload).substring(0, 200)
      );
    }

    this.payload = payload;
    if (this.props.client_key) {
      payload.client_key = this.props.client_key;
    } else if (!payload.client_key) {
      payload.application_id =
        Platform.OS === 'ios'
          ? (this.props.ios_application_id || payload.ios_application_id)
          : (this.props.android_application_id || payload.android_application_id);
    }
    // WebView JS SDK에 불필요한 플랫폼별 필드 전달 방지
    delete payload.android_application_id;
    delete payload.ios_application_id;

    UserInfo.updateInfo();

    // WebView가 이미 로드되었으면 Flutter 패턴으로 렌더링
    if (this.state.isReady) {
      if (DEBUG_MODE) {
        console.log('[BootpayWidget] isReady=true, injecting render script');
        console.log(
          '[BootpayWidget] payload.application_id:',
          payload.application_id
        );
        console.log('[BootpayWidget] Full payload:', JSON.stringify(payload));
      }

      // 렌더링 완료 플래그 설정
      this._widgetRendered = true;

      // Flutter의 _runDeviceSetup()과 동일: setDevice, setVersion을 별도 JS 호출로 먼저 실행
      this.runDeviceSetup();

      // Flutter의 _getRenderWidgetJS()와 동일: waitForBootpayWidget 내부에 이벤트 리스너 + render
      const renderScript = this.getRenderWidgetScript();
      if (DEBUG_MODE) {
        console.log('[BootpayWidget] Render script:', renderScript);
      }
      this.callJavaScript(renderScript);
    } else {
      if (DEBUG_MODE) {
        console.log(
          '[BootpayWidget] isReady=false, will render on next onLoadEnd'
        );
        console.log(
          '[BootpayWidget] payload.application_id:',
          payload.application_id
        );
        console.log('[BootpayWidget] Full payload:', JSON.stringify(payload));
      }
    }
  };

  // Flutter의 _runDeviceSetup()과 동일
  // setDevice, setVersion을 별도 JavaScript 호출로 실행
  runDeviceSetup = () => {
    if (DEBUG_MODE) {
      console.log(
        '[BootpayWidget] runDeviceSetup - calling setDevice/setVersion'
      );
    }
    // Flutter: _webViewController.runJavaScript("Bootpay.setDevice('...');");
    // Flutter: _webViewController.runJavaScript("Bootpay.setVersion('...', '...');");
    this.callJavaScript(this.getBootpayPlatform());
    this.callJavaScript(this.getSDKVersion());
  };

  // Flutter의 _getRenderWidgetJS()와 완전히 동일한 구조
  // waitForBootpayWidget과 bridgeHelper를 포함하고, 콜백 내부에서 이벤트 리스너 등록 후 BootpayWidget.render 호출
  getRenderWidgetScript = (): string => {
    const widgetPayload = this.getWidgetPayloadForRender();
    const payloadJson = JSON.stringify(widgetPayload);

    // Flutter _getRenderWidgetJS와 동일: waitForBootpayWidget + bridgeHelper + 이벤트 리스너 + render
    // 이벤트 리스너 중복 등록 방지를 위해 플래그 사용
    return `
      // Flutter waitForBootpayWidget과 동일
      ${this.getWaitForBootpayWidgetJS()}

      // Flutter bridgeHelper와 동일
      ${this.getBridgeHelperJS()}

      console.log('[WebView JS] renderWidget script started');
      waitForBootpayWidget(function() {
        console.log('[WebView JS] waitForBootpayWidget callback');

        // 이벤트 리스너 중복 등록 방지
        // 주의: readyWatch는 여기서 등록하지 않음 (무한 루프 방지)
        // widgetReady는 buildInitialScript에서 한 번만 전송됨
        if (!window._bootpayListenersRegistered) {
          window._bootpayListenersRegistered = true;
          console.log('[WebView JS] Registering event listeners');
          ${this.resizeWatch()}
          ${this.changeMethodWatch()}
          ${this.changeTermsWatch()}
          ${this.closeEventHandler()}
          console.log('[WebView JS] Event listeners registered');
        } else {
          console.log('[WebView JS] Event listeners already registered, skipping');
        }

        console.log('[WebView JS] Calling BootpayWidget.render');

        // BootpayWidget.render 호출
        BootpayWidget.render('#bootpay-widget', ${payloadJson});
        console.log('[WebView JS] BootpayWidget.render called');
      });
    `;
  };

  // 결제 요청 (Widget에서 전체화면으로 전환 후 결제)
  // Flutter의 requestPayment와 동일: 같은 WebView에서 바로 결제 진행
  requestPayment = async (
    payload?: Payload,
    items?: Item[],
    user?: User,
    extra?: Extra
  ) => {
    console.log('[Fullscreen] requestPayment called');

    // payload 업데이트
    if (payload) {
      if (this.props.client_key) {
        payload.client_key = this.props.client_key;
      } else if (!payload.client_key) {
        payload.application_id =
          Platform.OS === 'ios'
            ? (this.props.ios_application_id || payload.ios_application_id)
            : (this.props.android_application_id || payload.android_application_id);
      }
      // WebView JS SDK에 불필요한 플랫폼별 필드 전달 방지
      delete payload.android_application_id;
      delete payload.ios_application_id;
      if (items) payload.items = items;
      if (user) payload.user = Object.assign(new User(), user);
      if (extra) payload.extra = Object.assign(new Extra(), extra);
    }

    const payloadToUse = payload || this.payload;
    this._isProcessingPayment = true; // 결제 처리 중 플래그

    // 전체화면으로 전환
    this.goFullScreen();

    // Flutter와 동일: 약간의 딜레이 후 기존 WebView에서 결제 요청
    // 새 WebView가 아닌 기존 WebView이므로 위젯 선택 상태가 보존됨
    setTimeout(() => {
      this.executeRequestPayment(payloadToUse);
    }, 400);
  };

  // 기존 WebView에서 결제 요청 실행 (Flutter의 _executeRequestPayment와 동일)
  executeRequestPayment = (payload?: Payload | WidgetPayload | null) => {
    if (!payload) {
      console.log('[Fullscreen] executeRequestPayment - payload is null');
      return;
    }

    console.log('[Fullscreen] executeRequestPayment called');

    // Device/Version 설정 (Flutter와 동일)
    this.callJavaScript(this.getBootpayPlatform());
    this.callJavaScript(this.getSDKVersion());

    // 결제 요청 스크립트 (Flutter의 _getRequestPaymentScript와 동일)
    const requestScript = `
      ${this.getBridgeHelperJS()}
      BootpayWidget.requestPayment(${JSON.stringify(
        this.getRequestPaymentPayload(payload)
      )})
        .then(function(res) {
          console.log('[BootpayWidget] requestPayment response:', res);
          ${this.confirmEventHandler()}
          ${this.issuedEventHandler()}
          ${this.doneEventHandler()}
        }, function(res) {
          console.log('[BootpayWidget] requestPayment error:', res);
          ${this.errorEventHandler()}
          ${this.cancelEventHandler()}
        });
    `;
    this.callJavaScript(requestScript);
  };

  // Flutter의 _getRequestPaymentJson과 동일한 구조
  // render 시 설정된 값 외에 결제 요청에 필요한 정보만 전달
  getRequestPaymentPayload = (
    payload: Payload | WidgetPayload
  ): Record<string, unknown> => {
    const result: Record<string, unknown> = {};

    // 인증 정보
    if ('client_key' in payload && payload.client_key) {
      result.client_key = payload.client_key;
    } else if ('application_id' in payload && payload.application_id) {
      result.application_id = payload.application_id;
    }

    // 주문 정보
    if ('order_name' in payload && payload.order_name)
      result.order_name = payload.order_name;
    if ('order_id' in payload && payload.order_id)
      result.order_id = payload.order_id;
    if ('metadata' in payload && payload.metadata)
      result.metadata = payload.metadata;

    // Extra (결제 요청용)
    const extra: Record<string, unknown> = {};
    const payloadExtra = 'extra' in payload ? payload.extra : undefined;
    if (payloadExtra) {
      if ('app_scheme' in payloadExtra && payloadExtra.app_scheme)
        extra.app_scheme = payloadExtra.app_scheme;
      extra.show_close_button =
        'show_close_button' in payloadExtra
          ? payloadExtra.show_close_button
          : false;
      extra.display_success_result =
        'display_success_result' in payloadExtra
          ? payloadExtra.display_success_result
          : false;
      extra.display_error_result =
        'display_error_result' in payloadExtra
          ? payloadExtra.display_error_result
          : true;
      if (
        'separately_confirmed' in payloadExtra &&
        payloadExtra.separately_confirmed
      ) {
        extra.separately_confirmed = true;
      }
    }
    // redirect_url (기본값: https://api.bootpay.co.kr/v2/callback)
    extra.redirect_url =
      payloadExtra &&
      'redirect_url' in payloadExtra &&
      payloadExtra.redirect_url
        ? payloadExtra.redirect_url
        : 'https://api.bootpay.co.kr/v2/callback';
    // use_bootpay_inapp_sdk: native app에서 redirect를 완성도있게 지원하기 위한 옵션 (기본값: true)
    extra.use_bootpay_inapp_sdk =
      payloadExtra && 'use_bootpay_inapp_sdk' in payloadExtra
        ? payloadExtra.use_bootpay_inapp_sdk
        : true;
    result.extra = extra;

    // User
    if ('user' in payload && payload.user) {
      const user: Record<string, unknown> = {};
      if (payload.user.id) user.id = payload.user.id;
      if (payload.user.username) user.username = payload.user.username;
      if (payload.user.email) user.email = payload.user.email;
      if (payload.user.phone) user.phone = payload.user.phone;
      if (Object.keys(user).length > 0) result.user = user;
    }

    // Items
    if ('items' in payload && payload.items && payload.items.length > 0) {
      result.items = payload.items;
    }

    return result;
  };

  // 결제 처리 중 플래그 (close 이벤트 무시용)
  _isProcessingPayment: boolean = false;

  // 위젯에서 선택한 결제 정보 (pg, method 등)
  _widgetData: WidgetData | null = null;

  transactionConfirm = () => {
    const script = `
      Bootpay.confirm()
        .then(function(res) {
          ${this.confirmEventHandler()}
          ${this.issuedEventHandler()}
          ${this.doneEventHandler()}
        }, function(res) {
          ${this.errorEventHandler()}
          ${this.cancelEventHandler()}
        });
    `;
    this.callJavaScript(script);
  };

  // Event handlers for JavaScript (window.bridgePost 사용)
  confirmEventHandler = () => {
    return "if (res.event === 'confirm') { window.bridgePost(JSON.stringify(res)); }";
  };

  doneEventHandler = () => {
    return "else if (res.event === 'done') { window.bridgePost(JSON.stringify(res)); }";
  };

  issuedEventHandler = () => {
    return "else if (res.event === 'issued') { window.bridgePost(JSON.stringify(res)); }";
  };

  errorEventHandler = () => {
    return "if (res.event === 'error') { window.bridgePost(JSON.stringify(res)); }";
  };

  cancelEventHandler = () => {
    return "else if (res.event === 'cancel') { window.bridgePost(JSON.stringify(res)); }";
  };

  closeEventHandler = () => {
    return "document.addEventListener('bootpayclose', function(e) { window.bridgePost(JSON.stringify({event:'close'})); });";
  };

  // Widget event handlers (window.bridgePost 사용)
  readyWatch = () => {
    return "document.addEventListener('bootpay-widget-ready', function(e) { window.bridgePost(JSON.stringify({event:'widgetReady', detail: e.detail})); });";
  };

  resizeWatch = () => {
    return "document.addEventListener('bootpay-widget-resize', function(e) { window.bridgePost(JSON.stringify({event:'widgetResize', detail: e.detail})); });";
  };

  changeMethodWatch = () => {
    return "document.addEventListener('bootpay-widget-change-payment', function(e) { window.bridgePost(JSON.stringify({event:'widgetChangePayment', detail: e.detail})); });";
  };

  changeTermsWatch = () => {
    return "document.addEventListener('bootpay-widget-change-terms', function(e) { window.bridgePost(JSON.stringify({event:'widgetChangeTerms', detail: e.detail})); });";
  };

  getSDKVersion = () => {
    return `Bootpay.setVersion('${SDK_VERSION}', 'react_native');`;
  };

  getEnvironmentMode = () => {
    return DEBUG_MODE ? "BootpayWidget.setEnvironmentMode('development');" : '';
  };

  getBootpayPlatform = () => {
    return Platform.OS === 'ios'
      ? "Bootpay.setDevice('IOS');"
      : "Bootpay.setDevice('ANDROID');";
  };

  // Flutter의 waitForBootpayWidget 패턴 - BootpayWidget이 준비될 때까지 폴링
  getWaitForBootpayWidgetJS = () => {
    return `
      function waitForBootpayWidget(callback) {
        if (typeof BootpayWidget !== 'undefined') {
          callback();
        } else {
          setTimeout(function() { waitForBootpayWidget(callback); }, 50);
        }
      }
    `;
  };

  // Flutter SDK의 Payload.toString()과 동일한 형식으로 변환
  // widget_key → key, widget_sandbox → sandbox, widget_use_terms → use_terms
  // widgetKey가 있으면 widget: 1, use_bootpay_inapp_sdk: true 추가
  getWidgetPayloadForRender = (): Record<string, unknown> => {
    if (!this.payload) return {};

    const payload = this.payload;
    const result: Record<string, unknown> = {};

    // client_key or application_id
    if (payload.client_key) {
      result.client_key = payload.client_key;
    } else if (payload.application_id) {
      result.application_id = payload.application_id;
    }

    // 기본 필드
    if (payload.pg) result.pg = payload.pg;
    if (payload.method) result.method = payload.method;
    if (payload.methods && payload.methods.length > 0) {
      result.method = payload.methods;
    }
    if (payload.order_name) result.order_name = payload.order_name;
    if (payload.price !== undefined) result.price = payload.price;
    if (payload.tax_free !== undefined) result.tax_free = payload.tax_free;
    if (payload.order_id) result.order_id = payload.order_id;
    if (payload.subscription_id)
      result.subscription_id = payload.subscription_id;
    if (payload.metadata) result.metadata = payload.metadata;

    // extra
    if (payload.extra) result.extra = payload.extra;

    // Widget 전용 필드 (Flutter와 동일한 필드명으로 변환)
    // widget_use_terms → use_terms
    if (payload.widget_use_terms !== undefined) {
      result.use_terms = payload.widget_use_terms;
    }
    // widget_sandbox → sandbox
    if (payload.widget_sandbox !== undefined) {
      result.sandbox = payload.widget_sandbox;
    }
    // widget_key → key
    if (payload.widget_key) {
      result.key = payload.widget_key;
      // Flutter: widgetKey가 있으면 widget: 1, use_bootpay_inapp_sdk: true 추가
      result.widget = 1;
      result.use_bootpay_inapp_sdk = true;
    }

    return result;
  };

  getRenderWidgetJS = () => {
    if (!this.payload) return '';
    const widgetPayload = this.getWidgetPayloadForRender();
    return `BootpayWidget.render('#bootpay-widget', ${JSON.stringify(
      widgetPayload
    )});`;
  };

  // WebView 로드 완료 - injectedJavaScript가 실행됨
  // Flutter의 onPageFinished와 동일한 역할
  // 주의: 실제 렌더링은 onWidgetReady → renderWidget() 호출에서 수행됨
  onLoadEnd = async () => {
    if (DEBUG_MODE) {
      console.log('[BootpayWidget] ===== onLoadEnd called =====');
      console.log('[BootpayWidget] payload:', this.payload ? 'set' : 'null');
      console.log('[BootpayWidget] isReady:', this.state.isReady);
      console.log(
        '[BootpayWidget] webView ref:',
        this.webView.current ? 'exists' : 'null'
      );
    }

    // injectedJavaScript가 waitForBootpayWidget을 통해 widgetReady를 전송함
    // widgetReady 수신 후 사용자가 onWidgetReady 콜백에서 renderWidget()을 호출
    // 따라서 여기서는 추가 렌더링 작업을 하지 않음 (Flutter 패턴과 동일)
  };

  // WebView 메시지 핸들러
  onMessage = async (event: WebViewMessageEvent) => {
    if (DEBUG_MODE) {
      console.log('[BootpayWidget] ===== onMessage received =====');
      console.log('[BootpayWidget] raw data:', event?.nativeEvent?.data);
    }

    if (!event) return;

    try {
      const data = JSON.parse(event.nativeEvent.data);

      if (DEBUG_MODE) {
        console.log('[BootpayWidget] parsed data:', JSON.stringify(data));
      }

      switch (data.event) {
        // Widget events
        case 'widgetReady':
          // setState 콜백을 사용하여 isReady가 true로 업데이트된 후에 onWidgetReady 호출
          this.setState({ isReady: true }, () => {
            // Flutter와 동일: widgetReady는 항상 콜백 호출
            // 결제 요청은 requestPayment()에서 setTimeout으로 처리
            if (this.props.onWidgetReady) {
              this.props.onWidgetReady();
            }
          });
          break;

        case 'widgetResize':
          if (data.detail?.height) {
            const height = parseFloat(data.detail.height);
            // 높이가 실제로 변경된 경우에만 업데이트 (무한 루프 방지)
            if (Math.abs(height - this.state.widgetHeight) > 1) {
              if (DEBUG_MODE) {
                console.log(
                  '[BootpayWidget] Height changed:',
                  this.state.widgetHeight,
                  '->',
                  height
                );
              }
              this.setState({ widgetHeight: height });
              // 위젯 모드일 때만 높이 애니메이션 적용
              if (!this.state.isFullScreen) {
                Animated.timing(this.animatedHeight, {
                  toValue: height,
                  duration: 100,
                  useNativeDriver: false,
                }).start();
              }
              if (this.props.onWidgetResize) {
                this.props.onWidgetResize(height);
              }
            }
          }
          break;

        case 'widgetChangePayment':
          {
            const widgetData: WidgetData = data.detail || null;
            // 위젯 데이터 저장 (pg, method 포함) - Flutter _handleChangePayment와 동일
            this._widgetData = widgetData;
            if (this.props.onWidgetChangePayment) {
              this.props.onWidgetChangePayment(widgetData);
            }
          }
          break;

        case 'widgetChangeTerms':
          {
            const widgetData: WidgetData = data.detail || null;
            // 위젯 데이터 저장 - Flutter _handleChangeAgreeTerm와 동일
            this._widgetData = widgetData;
            if (this.props.onWidgetChangeTerms) {
              this.props.onWidgetChangeTerms(widgetData);
            }
          }
          break;

        // Full screen transition events (from web)
        case 'bootpayWidgetFullSizeScreen':
          this.goFullScreen();
          break;

        case 'bootpayWidgetRevertScreen':
          this.revertToWidget();
          break;

        // Payment events
        case 'cancel':
          this._isProcessingPayment = false; // 결제 처리 완료
          this.setState({ paymentResult: 'CANCEL' });
          if (this.props.onCancel) {
            this.props.onCancel(data);
          }
          this.closeDismiss();
          break;

        case 'error':
          this._isProcessingPayment = false; // 결제 처리 완료
          this.setState({ paymentResult: 'ERROR' });
          if (this.props.onError) {
            this.props.onError(data);
          }
          this.closeDismiss();
          break;

        case 'issued':
          this._isProcessingPayment = false; // 결제 처리 완료
          if (this.props.onIssued) {
            this.props.onIssued(data);
          }
          this.closeDismiss();
          break;

        case 'confirm':
          if (this.props.onConfirm && this.props.onConfirm(data)) {
            this.transactionConfirm();
          }
          break;

        case 'done':
          this._isProcessingPayment = false; // 결제 처리 완료
          this.setState({ paymentResult: 'DONE' });
          if (this.props.onDone) {
            this.props.onDone(data);
          }
          this.closeDismiss();
          break;

        case 'close':
          console.log(
            '[Fullscreen] close event received, _isProcessingPayment:',
            this._isProcessingPayment
          );
          if (this._isProcessingPayment) {
            break;
          }
          this.closeDismiss();
          break;

        default:
          if (DEBUG_MODE) {
            console.warn('Unknown event:', data.event);
          }
          break;
      }
    } catch (error) {
      if (DEBUG_MODE) {
        console.error('Error parsing message:', error);
      }
    }
  };

  // WebView 렌더링 - 위젯 모드와 전체화면 모드 모두에서 동일한 WebView 사용
  renderWebView = () => {
    return (
      <WebView
        ref={this.webView}
        originWhitelist={['*']}
        source={{ uri: WIDGET_URL }}
        javaScriptEnabled
        javaScriptCanOpenWindowsAutomatically
        useSharedProcessPool={true}
        sharedCookiesEnabled={true}
        injectedJavaScript={this.initialScript}
        onLoadStart={() => {
          if (DEBUG_MODE) {
            console.log('[BootpayWidget] WebView onLoadStart');
          }
        }}
        onLoad={() => {
          if (DEBUG_MODE) {
            console.log('[BootpayWidget] WebView onLoad');
          }
        }}
        onLoadEnd={this.onLoadEnd}
        onMessage={this.onMessage}
        style={styles.webview}
        onError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          if (DEBUG_MODE) {
            console.error('[BootpayWidget] WebView error:', nativeEvent);
          }
          if (this.props.onError) {
            this.props.onError({
              event: 'error',
              code: nativeEvent.code,
              message: nativeEvent.description,
            });
          }
        }}
      />
    );
  };

  render() {
    const { isFullScreen, screenWidth, screenHeight } = this.state;
    const { style, widgetTop } = this.props;

    // Flutter와 동일: 하나의 WebView만 렌더링
    // isFullScreen에 따라 WebView 컨테이너의 위치/크기만 변경
    // 새 WebView를 생성하지 않아 위젯 선택 상태가 보존됨
    // 항상 position: absolute 사용 - 위젯 모드에서는 widgetTop 위치에, 전체화면에서는 top: 0

    // 중요: 항상 GestureHandlerRootView로 감싸야 WebView remount 방지
    // 조건부 래핑 시 React가 컴포넌트 트리 변경으로 인식하여 WebView를 다시 마운트함
    // 위젯/전체화면 모두 absolute로 배치하여 일관된 구조 유지
    return (
      <GestureHandlerRootView
        style={[
          styles.gestureRootBase,
          isFullScreen
            ? styles.gestureRootFullScreen
            : {
                top: widgetTop || 0,
                height: this.state.widgetHeight,
                zIndex: 1,
              },
        ]}
      >
        <Animated.View
          style={[
            styles.container,
            style,
            {
              flex: 1,
              width: screenWidth,
            },
            isFullScreen && {
              // iOS 스와이프 백 애니메이션
              transform: [{ translateX: this.swipeAnimatedValue }],
            },
          ]}
        >
          {isFullScreen && <SafeAreaView style={styles.fullScreenHeader} />}
          {this.renderWebView()}
          {/* iOS 스와이프 백: GestureDetector로 왼쪽 가장자리 터치 감지 */}
          {isFullScreen && Platform.OS === 'ios' && (
            <GestureDetector gesture={this.panGesture}>
              <View style={styles.swipeEdge} />
            </GestureDetector>
          )}
        </Animated.View>
      </GestureHandlerRootView>
    );
  }
}

const styles = StyleSheet.create({
  gestureRootBase: {
    position: 'absolute',
    left: 0,
    right: 0,
  },
  gestureRootFullScreen: {
    top: 0,
    bottom: 0,
    zIndex: 9999,
  },
  container: {
    width: '100%',
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  hidden: {
    height: 0,
    opacity: 0,
  },
  fullScreenHeader: {
    backgroundColor: '#fff',
  },
  swipeEdge: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 70, // 70px 영역에서 스와이프 감지
    backgroundColor: DEBUG_MODE ? 'rgba(255, 0, 0, 0.1)' : 'transparent',
  },
  webview: {
    flex: 1,
    backgroundColor: DEBUG_MODE ? '#f0f0f0' : 'transparent', // 디버그용 배경색
    borderWidth: DEBUG_MODE ? 1 : 0,
    borderColor: 'blue',
  },
});

export default BootpayWidget;
