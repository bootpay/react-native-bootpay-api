import React, { Component } from 'react';
import {
  View,
  Modal,
  SafeAreaView,
  StyleSheet,
  Platform,
  Animated,
  BackHandler,
  NativeEventSubscription,
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
}

export class BootpayWidget extends Component<BootpayWidgetProps, BootpayWidgetState> {
  webView: React.RefObject<WebView>;
  payload?: WidgetPayload;
  backHandler?: NativeEventSubscription;
  fadeAnim: Animated.Value;

  constructor(props: BootpayWidgetProps) {
    super(props);
    this.webView = React.createRef();
    this.fadeAnim = new Animated.Value(0);
    this.state = {
      isFullScreen: false,
      widgetHeight: props.height || 516,
      isReady: false,
      paymentResult: 'NONE',
    };
  }

  componentDidMount() {
    this.closeDismiss = debounce(this.closeDismiss, 30);
  }

  componentWillUnmount() {
    this.removeBackHandler();
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

  // Widget을 전체화면으로 전환
  goFullScreen = () => {
    this.setupBackHandler();
    this.setState({ isFullScreen: true, paymentResult: 'NONE' });
    Animated.timing(this.fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  // 전체화면에서 Widget으로 복귀
  revertToWidget = () => {
    this.removeBackHandler();
    Animated.timing(this.fadeAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
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

  // Widget 렌더링 (초기 설정)
  renderWidget = (payload: WidgetPayload) => {
    this.payload = payload;
    payload.application_id =
      Platform.OS === 'ios'
        ? this.props.ios_application_id
        : this.props.android_application_id;

    UserInfo.updateInfo();
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
      this.getRenderWidgetJS(),
    ].filter(Boolean).join('\n');

    this.callJavaScript(scripts);
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

        // Full screen transition events
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

  renderWebView = () => {
    return (
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
    );
  };

  render() {
    const { isFullScreen, widgetHeight } = this.state;
    const { style } = this.props;

    // 전체화면 모드
    if (isFullScreen) {
      return (
        <>
          {/* 빈 placeholder (widget 자리) */}
          <View style={[styles.widgetContainer, { height: widgetHeight }, style]} />

          {/* 전체화면 Modal */}
          <Modal
            animationType="slide"
            transparent={false}
            visible={isFullScreen}
            onRequestClose={this.revertToWidget}
          >
            <SafeAreaView style={styles.fullScreenContainer}>
              <Animated.View
                style={[
                  styles.fullScreenWebView,
                  { opacity: this.fadeAnim },
                ]}
              >
                {this.renderWebView()}
              </Animated.View>
            </SafeAreaView>
          </Modal>
        </>
      );
    }

    // 위젯 모드 (인라인)
    return (
      <View style={[styles.widgetContainer, { height: widgetHeight }, style]}>
        {this.renderWebView()}
      </View>
    );
  }
}

const styles = StyleSheet.create({
  widgetContainer: {
    width: '100%',
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  fullScreenContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  fullScreenWebView: {
    flex: 1,
  },
});

export default BootpayWidget;
