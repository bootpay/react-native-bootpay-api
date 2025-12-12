import React, { Component } from 'react';
import {
  SafeAreaView,
  StyleSheet,
  Platform,
  Animated,
  BackHandler,
  NativeEventSubscription,
  Dimensions,
} from 'react-native';
import WebView, { WebViewMessageEvent } from 'react-native-webview-bootpay';
import {
  BootpayWidgetProps,
  WidgetPayload,
  WidgetData,
} from './WidgetTypes';
import { Payload, Item, User, Extra } from './BootpayTypes';
import { debounce } from 'lodash';
import UserInfo from './UserInfo';

const SDK_VERSION = '13.13.4';
const DEBUG_MODE = false;
const WIDGET_URL = 'https://webview.bootpay.co.kr/5.1.4/widget.html';

type PaymentResult = 'DONE' | 'ERROR' | 'CANCEL' | 'NONE';

interface BootpayWidgetState {
  isFullScreen: boolean;
  widgetHeight: number;
  isReady: boolean;
  paymentResult: PaymentResult;
  screenWidth: number;
  screenHeight: number;
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
export class BootpayWidget extends Component<BootpayWidgetProps, BootpayWidgetState> {
  webView: React.RefObject<WebView>;
  payload?: WidgetPayload;
  backHandler?: NativeEventSubscription;
  animatedTop: Animated.Value;
  animatedLeft: Animated.Value;
  animatedWidth: Animated.Value;
  animatedHeight: Animated.Value;

  constructor(props: BootpayWidgetProps) {
    super(props);
    this.webView = React.createRef();

    const { width, height } = Dimensions.get('window');
    const initialHeight = props.height || 516;

    // 애니메이션 값 초기화 (위젯 모드 크기)
    this.animatedTop = new Animated.Value(0);
    this.animatedLeft = new Animated.Value(0);
    this.animatedWidth = new Animated.Value(width);
    this.animatedHeight = new Animated.Value(initialHeight);

    this.state = {
      isFullScreen: false,
      widgetHeight: initialHeight,
      isReady: false,
      paymentResult: 'NONE',
      screenWidth: width,
      screenHeight: height,
    };
  }

  componentDidMount() {
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
      this.backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
        if (this.state.isFullScreen) {
          this.revertToWidget();
          return true;
        }
        return false;
      });
    }
  };

  removeBackHandler = () => {
    if (this.backHandler) {
      this.backHandler.remove();
      this.backHandler = undefined;
    }
  };

  // Widget을 전체화면으로 전환 (동일 WebView 유지)
  goFullScreen = () => {
    this.setupBackHandler();
    this.setState({ isFullScreen: true, paymentResult: 'NONE' });

    const { screenHeight } = this.state;

    // 위젯에서 전체화면으로 애니메이션
    Animated.parallel([
      Animated.timing(this.animatedHeight, {
        toValue: screenHeight,
        duration: 300,
        useNativeDriver: false,
      }),
    ]).start();
  };

  // 전체화면에서 Widget으로 복귀 (동일 WebView 유지)
  revertToWidget = () => {
    this.removeBackHandler();

    const { widgetHeight } = this.state;

    // 전체화면에서 위젯으로 애니메이션
    Animated.parallel([
      Animated.timing(this.animatedHeight, {
        toValue: widgetHeight,
        duration: 200,
        useNativeDriver: false,
      }),
    ]).start(() => {
      this.setState({ isFullScreen: false });

      // Widget 상태 리셋 - 웹뷰 리로드
      this.reloadWidget();

      // 결제 결과가 없으면 사용자 취소로 처리
      if (this.state.paymentResult === 'NONE') {
        if (this.props.onCancel) {
          this.props.onCancel({
            action: 'BootpayCancel',
            status: -100,
            message: '사용자에 의한 취소',
          });
        }
      }
      this.setState({ paymentResult: 'NONE' });
    });
  };

  closeDismiss = () => {
    if (this.state.isFullScreen) {
      this.revertToWidget();
    }
    if (this.props.onClose) {
      this.props.onClose();
    }
  };

  // WebView에 JavaScript 실행
  callJavaScript = (script: string) => {
    this.webView.current?.injectJavaScript(
      `setTimeout(function() { ${script} }, 30); true;`
    );
  };

  // Widget 리로드
  reloadWidget = () => {
    this.webView.current?.injectJavaScript(`
      window.location.href = '${WIDGET_URL}';
      true;
    `);
  };

  // Widget 업데이트
  updateWidget = (payload: WidgetPayload, refresh: boolean = false) => {
    this.payload = payload;
    this.callJavaScript(
      `BootpayWidget.update(${JSON.stringify(payload)}, ${refresh});`
    );
  };

  // Widget 렌더링 (초기 설정) - 반드시 먼저 호출해야 함
  renderWidget = (payload: WidgetPayload) => {
    this.payload = payload;
    payload.application_id =
      Platform.OS === 'ios'
        ? this.props.ios_application_id
        : this.props.android_application_id;

    UserInfo.updateInfo();

    // WebView가 이미 로드되었으면 바로 렌더링
    if (this.state.isReady) {
      this.callJavaScript(this.getRenderWidgetJS());
    }
  };

  // 결제 요청 (Widget에서 전체화면으로 전환 후 결제)
  requestPayment = async (
    payload?: Payload,
    items?: Item[],
    user?: User,
    extra?: Extra
  ) => {
    // 전체화면으로 전환
    this.goFullScreen();

    // payload 업데이트
    if (payload) {
      payload.application_id =
        Platform.OS === 'ios'
          ? this.props.ios_application_id
          : this.props.android_application_id;
      if (items) payload.items = items;
      if (user) payload.user = Object.assign(new User(), user);
      if (extra) payload.extra = Object.assign(new Extra(), extra);
    }

    const deviceScript = this.getBootpayPlatform();
    const versionScript = this.getSDKVersion();

    // 300ms 후 결제 스크립트 실행 (전체화면 전환 애니메이션 완료 후)
    setTimeout(() => {
      const payloadToUse = payload || this.payload;

      const updateScript = `
        BootpayWidget.update(${JSON.stringify(payloadToUse)}, false);
        ${deviceScript}
        ${versionScript}
      `;

      const requestScript = `
        BootpayWidget.requestPayment(${JSON.stringify(payloadToUse)})
          .then(function(res) {
            ${this.confirmEventHandler()}
            ${this.issuedEventHandler()}
            ${this.doneEventHandler()}
          }, function(res) {
            ${this.errorEventHandler()}
            ${this.cancelEventHandler()}
          });
      `;

      this.callJavaScript(updateScript);
      setTimeout(() => {
        this.callJavaScript(requestScript);
      }, 100);
    }, 300);
  };

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

  // Event handlers for JavaScript
  confirmEventHandler = () => {
    return "if (res.event === 'confirm') { window.BootpayRNWebView.postMessage(JSON.stringify(res)); }";
  };

  doneEventHandler = () => {
    return "else if (res.event === 'done') { window.BootpayRNWebView.postMessage(JSON.stringify(res)); }";
  };

  issuedEventHandler = () => {
    return "else if (res.event === 'issued') { window.BootpayRNWebView.postMessage(JSON.stringify(res)); }";
  };

  errorEventHandler = () => {
    return "if (res.event === 'error') { window.BootpayRNWebView.postMessage(JSON.stringify(res)); }";
  };

  cancelEventHandler = () => {
    return "else if (res.event === 'cancel') { window.BootpayRNWebView.postMessage(JSON.stringify(res)); }";
  };

  closeEventHandler = () => {
    return "document.addEventListener('bootpayclose', function(e) { window.BootpayRNWebView.postMessage(JSON.stringify({event:'close'})); });";
  };

  // Widget event handlers
  readyWatch = () => {
    return "document.addEventListener('bootpay-widget-ready', function(e) { window.BootpayRNWebView.postMessage(JSON.stringify({event:'widgetReady', detail: e.detail})); });";
  };

  resizeWatch = () => {
    return "document.addEventListener('bootpay-widget-resize', function(e) { window.BootpayRNWebView.postMessage(JSON.stringify({event:'widgetResize', detail: e.detail})); });";
  };

  changeMethodWatch = () => {
    return "document.addEventListener('bootpay-widget-change-payment', function(e) { window.BootpayRNWebView.postMessage(JSON.stringify({event:'widgetChangePayment', detail: e.detail})); });";
  };

  changeTermsWatch = () => {
    return "document.addEventListener('bootpay-widget-change-terms', function(e) { window.BootpayRNWebView.postMessage(JSON.stringify({event:'widgetChangeTerms', detail: e.detail})); });";
  };

  getSDKVersion = () => {
    const os = Platform.OS;
    return `Bootpay.setVersion('${SDK_VERSION}', '${os}_react_native');`;
  };

  getEnvironmentMode = () => {
    return DEBUG_MODE ? "BootpayWidget.setEnvironmentMode('development');" : '';
  };

  getBootpayPlatform = () => {
    return Platform.OS === 'ios'
      ? "Bootpay.setDevice('IOS');"
      : "Bootpay.setDevice('ANDROID');";
  };

  getRenderWidgetJS = () => {
    if (!this.payload) return '';
    return `BootpayWidget.render('#bootpay-widget', ${JSON.stringify(this.payload)});`;
  };

  // WebView 로드 완료 시 Widget 스크립트 주입
  onLoadEnd = async () => {
    const scripts = [
      this.getEnvironmentMode(),
      this.readyWatch(),
      this.resizeWatch(),
      this.changeMethodWatch(),
      this.changeTermsWatch(),
      this.closeEventHandler(),
    ].filter(Boolean).join('\n');

    this.callJavaScript(scripts);

    // payload가 이미 설정되어 있으면 렌더링
    if (this.payload) {
      this.callJavaScript(this.getRenderWidgetJS());
    }
  };

  // WebView 메시지 핸들러
  onMessage = async (event: WebViewMessageEvent) => {
    if (!event) return;

    try {
      const data = JSON.parse(event.nativeEvent.data);

      if (DEBUG_MODE) {
        console.log('BootpayWidget onMessage:', data);
      }

      switch (data.event) {
        // Widget events
        case 'widgetReady':
          this.setState({ isReady: true });
          if (this.props.onWidgetReady) {
            this.props.onWidgetReady();
          }
          break;

        case 'widgetResize':
          if (data.detail?.height) {
            const height = parseFloat(data.detail.height);
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
          break;

        case 'widgetChangePayment':
          if (this.props.onWidgetChangePayment) {
            const widgetData: WidgetData = data.detail || null;
            this.props.onWidgetChangePayment(widgetData);
          }
          break;

        case 'widgetChangeTerms':
          if (this.props.onWidgetChangeTerms) {
            const widgetData: WidgetData = data.detail || null;
            this.props.onWidgetChangeTerms(widgetData);
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
          this.setState({ paymentResult: 'CANCEL' });
          if (this.props.onCancel) {
            this.props.onCancel(data);
          }
          this.closeDismiss();
          break;

        case 'error':
          this.setState({ paymentResult: 'ERROR' });
          if (this.props.onError) {
            this.props.onError(data);
          }
          this.closeDismiss();
          break;

        case 'issued':
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
          this.setState({ paymentResult: 'DONE' });
          if (this.props.onDone) {
            this.props.onDone(data);
          }
          this.closeDismiss();
          break;

        case 'close':
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

  render() {
    const { isFullScreen } = this.state;
    const { style } = this.props;

    // WebView를 항상 렌더링하고, 애니메이션으로 크기만 변경
    // 이렇게 하면 동일한 WebView 인스턴스가 유지됨 (Flutter와 동일)
    return (
      <Animated.View
        style={[
          styles.container,
          style,
          {
            height: this.animatedHeight,
          },
          isFullScreen && styles.fullScreenContainer,
        ]}
      >
        {isFullScreen && <SafeAreaView style={styles.safeArea} />}
        <WebView
          ref={this.webView}
          originWhitelist={['*']}
          source={{ uri: WIDGET_URL }}
          javaScriptEnabled
          javaScriptCanOpenWindowsAutomatically
          onLoadEnd={this.onLoadEnd}
          onMessage={this.onMessage}
          style={styles.webview}
          onError={(syntheticEvent) => {
            const { nativeEvent } = syntheticEvent;
            if (DEBUG_MODE) {
              console.error('WebView error:', nativeEvent);
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
        {isFullScreen && <SafeAreaView style={styles.safeArea} />}
      </Animated.View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  fullScreenContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
    elevation: 9999, // Android
  },
  safeArea: {
    backgroundColor: '#fff',
  },
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
  },
});

export default BootpayWidget;
