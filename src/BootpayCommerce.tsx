import React, { Component } from 'react';
import {
  SafeAreaView,
  Modal,
  TouchableOpacity,
  Image,
  StyleSheet,
} from 'react-native';
import WebView, {
  WebViewMessageEvent,
  WebViewNavigation,
  ShouldStartLoadRequest,
} from 'react-native-webview-bootpay';
import {
  BootpayCommerceProps,
  CommerceEventData,
  CommercePayload,
} from './CommerceTypes';
import { debounce } from 'lodash';

const COMMERCE_URL = 'https://webview.bootpay.co.kr/commerce/1.0.5/index.html';
const DEBUG_MODE = false;

export class BootpayCommerce extends Component<BootpayCommerceProps> {
  webView: React.RefObject<WebView>;
  payload?: CommercePayload;
  isScriptInjected: boolean = false;

  constructor(props: BootpayCommerceProps) {
    super(props);
    this.webView = React.createRef();
  }

  state = {
    visibility: false,
    script: '',
    firstLoad: false,
    showCloseButton: true,
    isShowProgress: false,
  };

  dismiss = () => {
    this.setState({ visibility: false });
  };

  showProgressBar = (isShow: boolean) => {
    this.setState({ isShowProgress: isShow });
  };

  closeDismiss = () => {
    // iOS SDK와 동일하게 destroy 호출
    this.callJavaScript('BootpayCommerce.destroy();');
    if (this.props.onClose) this.props.onClose();
    this.dismiss();
  };

  callJavaScript = (script: string) => {
    this.webView.current?.injectJavaScript(
      `setTimeout(function() { ${script} }, 30);`
    );
  };

  getEnvironmentMode = () => {
    // iOS SDK와 동일: development 모드에서만 setEnvironmentMode 호출
    return DEBUG_MODE ? "BootpayCommerce.setEnvironmentMode('development');" : '';
  };

  generateCommerceScript = (payload: CommercePayload) => {
    const scripts: string[] = [];

    // 개발 환경에서만 로그 레벨 설정
    if (DEBUG_MODE) {
      scripts.push('BootpayCommerce.setLogLevel(1);');
    }

    // close 이벤트 리스너
    scripts.push(
      "document.addEventListener('bootpayclose', function(e) { " +
        "window.BootpayRNWebView.postMessage('close'); " +
        '});'
    );

    // 결제 요청 호출
    scripts.push('BootpayCommerce.requestCheckout(');
    scripts.push(payload.toJSONString());
    scripts.push(')');
    scripts.push('.then(function(res) {');
    scripts.push('  window.BootpayRNWebView.postMessage(JSON.stringify(res));');
    scripts.push('}).catch(function(err) {');
    scripts.push(
      "  window.BootpayRNWebView.postMessage(JSON.stringify({event: 'error', data: err}));"
    );
    scripts.push('});');

    return scripts.join('');
  };

  getMountJavascript = () => {
    // iOS SDK와 동일: Commerce에서는 setDevice 호출하지 않음
    return `
      ${this.getEnvironmentMode()}
    `;
  };

  componentWillUnmount() {
    this.setState({
      visibility: false,
      firstLoad: false,
      showCloseButton: true,
    });
  }

  componentDidMount() {
    this.closeDismiss = debounce(this.closeDismiss, 30);
  }

  removePaymentWindow = () => {
    this.dismiss();
  };

  requestCheckout = (payload: CommercePayload) => {
    this.payload = payload;
    this.isScriptInjected = false;

    this.setState({
      visibility: true,
      script: `
        ${this.getMountJavascript()}
        ${this.generateCommerceScript(payload)}
      `,
      firstLoad: false,
      showCloseButton: true,
      spinner: false,
    });
  };

  // iOS SDK와 동일하게 페이지 로드 완료 후 JavaScript 주입
  onLoadEnd = (event: { nativeEvent: WebViewNavigation }) => {
    const url = event.nativeEvent.url;
    if (DEBUG_MODE) {
      console.log('[BootpayCommerce] onLoadEnd URL:', url);
    }

    // payload가 없으면 스크립트 주입하지 않음
    if (!this.payload) {
      if (DEBUG_MODE) {
        console.log('[BootpayCommerce] No payload, skipping script injection');
      }
      return;
    }

    // Commerce 페이지 로드 완료 시에만 JavaScript 주입 (iOS SDK didFinish와 동일)
    if (url.includes('webview.bootpay.co.kr/commerce') && !this.isScriptInjected) {
      this.isScriptInjected = true;

      if (DEBUG_MODE) {
        console.log('[BootpayCommerce] Injecting JavaScript...');
      }

      // iOS SDK와 동일한 순서로 JavaScript 주입
      // 1. 환경 설정
      // 2. 디바이스 설정
      // 3. 결제 요청
      const fullScript = `
        try {
          ${this.getMountJavascript()}
          ${this.generateCommerceScript(this.payload)}
        } catch(e) {
          console.error('[BootpayCommerce] Script error:', e);
          window.BootpayRNWebView.postMessage(JSON.stringify({event: 'error', message: e.message}));
        }
      `;

      this.callJavaScript(fullScript);
    }
  };

  // iOS SDK decidePolicyFor와 동일: redirect URL 처리
  onShouldStartLoadWithRequest = (request: ShouldStartLoadRequest): boolean => {
    const url = request.url;

    if (DEBUG_MODE) {
      console.log('[BootpayCommerce] onShouldStartLoadWithRequest:', url);
    }

    // redirect_url 콜백 처리 (api.bootpay.co.kr/v2/callback) - iOS SDK와 동일
    if (url.includes('api.bootpay.co.kr/v2/callback')) {
      if (DEBUG_MODE) {
        console.log('[BootpayCommerce] Callback URL detected, handling...');
      }
      this.handleCallbackURL(url);
      return false; // 네비게이션 취소
    }

    // about:blank 허용
    if (url.startsWith('about:blank')) {
      return true;
    }

    // http/https가 아닌 스키마는 앱 실행 시도 (외부 앱 호출)
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      if (DEBUG_MODE) {
        console.log('[BootpayCommerce] Non-http scheme, should open external app:', url);
      }
      // React Native에서는 Linking을 사용하여 외부 앱 열기
      // 여기서는 일단 네비게이션만 취소
      return false;
    }

    return true;
  };

  // URL query string 파싱 헬퍼 (React Native에서 URL.searchParams 미지원)
  parseQueryString = (urlString: string): Record<string, string> => {
    const result: Record<string, string> = {};
    const queryIndex = urlString.indexOf('?');
    if (queryIndex === -1) return result;

    const queryString = urlString.substring(queryIndex + 1);
    const pairs = queryString.split('&');

    for (const pair of pairs) {
      const eqIndex = pair.indexOf('=');
      if (eqIndex > 0) {
        const key = pair.substring(0, eqIndex);
        const value = pair.substring(eqIndex + 1);
        try {
          result[key] = decodeURIComponent(value);
        } catch {
          result[key] = value;
        }
      }
    }

    return result;
  };

  // iOS SDK handleCallbackURL과 동일: URL query parameters 파싱 및 콜백 호출
  handleCallbackURL = (urlString: string) => {
    try {
      const params = this.parseQueryString(urlString);
      const data: Record<string, unknown> = {};

      // Query parameters 변환
      for (const [key, value] of Object.entries(params)) {
        // metadata는 JSON 문자열이므로 파싱 시도
        if (key === 'metadata') {
          try {
            data[key] = JSON.parse(value);
          } catch {
            data[key] = value;
          }
        } else {
          data[key] = value;
        }
      }

      if (DEBUG_MODE) {
        console.log('[BootpayCommerce] Callback data:', data);
      }

      // event에 따라 콜백 호출 - iOS SDK와 동일
      const event = (data.event as string) || '';

      this.showProgressBar(false);

      switch (event) {
        case 'done':
          if (this.props.onDone) {
            this.props.onDone(data as CommerceEventData);
          }
          break;
        case 'issued':
          // 가상계좌 발급 완료 - iOS SDK와 동일
          if (this.props.onIssued) {
            this.props.onIssued(data as CommerceEventData);
          }
          break;
        case 'cancel':
          if (this.props.onCancel) {
            this.props.onCancel(data as CommerceEventData);
          }
          break;
        case 'error':
          if (this.props.onError) {
            this.props.onError(data as CommerceEventData);
          }
          break;
        default:
          // event가 없으면 receipt_id로 판단 - iOS SDK와 동일
          if (data.receipt_id) {
            if (this.props.onDone) {
              this.props.onDone(data as CommerceEventData);
            }
          } else {
            if (this.props.onCancel) {
              this.props.onCancel(data as CommerceEventData);
            }
          }
          break;
      }

      this.closeDismiss();
    } catch (error) {
      console.error('[BootpayCommerce] Error parsing callback URL:', error);
      if (this.props.onError) {
        this.props.onError({
          event: 'error',
          message: 'Failed to parse callback URL',
        });
      }
      this.closeDismiss();
    }
  };

  onMessage = async (event: WebViewMessageEvent) => {
    if (!event) return;

    try {
      const messageData = event.nativeEvent.data;

      // close 이벤트 처리
      if (messageData === 'close') {
        this.showProgressBar(false);
        this.closeDismiss();
        return;
      }

      const data =
        typeof messageData === 'string' ? JSON.parse(messageData) : messageData;

      const handleEvent = (
        _eventName: string,
        callback: ((data: CommerceEventData) => void) | undefined
      ) => {
        this.showProgressBar(false);
        if (callback) callback(data as CommerceEventData);
        this.closeDismiss();
      };

      // 이벤트별 처리
      switch (data.event) {
        case 'cancel':
          handleEvent('cancel', this.props.onCancel);
          break;
        case 'error':
          handleEvent('error', this.props.onError);
          break;
        case 'done':
          handleEvent('done', this.props.onDone);
          break;
        case 'issued':
          // 가상계좌 발급 완료 - iOS SDK와 동일
          handleEvent('issued', this.props.onIssued);
          break;
        case 'close':
          this.showProgressBar(false);
          this.closeDismiss();
          break;
        default:
          // receipt_id가 있으면 done 이벤트로 처리
          if (data.receipt_id) {
            handleEvent('done', this.props.onDone);
          } else {
            console.warn(`Unknown commerce event type: ${data.event}`);
          }
          break;
      }
    } catch (error) {
      console.error('Error processing commerce message:', error);
    }
  };

  render() {
    return (
      <Modal
        animationType="slide"
        transparent={false}
        visible={this.state.visibility}
        onRequestClose={this.closeDismiss}
      >
        <SafeAreaView style={{ flex: 1 }}>
          {this.state.showCloseButton && (
            <TouchableOpacity onPress={this.closeDismiss}>
              <Image
                style={styles.overlay}
                source={require('../images/close.png')}
              />
            </TouchableOpacity>
          )}
          <WebView
            ref={this.webView}
            originWhitelist={['*']}
            source={{ uri: COMMERCE_URL }}
            javaScriptEnabled
            javaScriptCanOpenWindowsAutomatically
            useSharedProcessPool={true}
            sharedCookiesEnabled={true}
            onMessage={this.onMessage}
            onLoadEnd={this.onLoadEnd}
            onShouldStartLoadWithRequest={this.onShouldStartLoadWithRequest}
            onError={(syntheticEvent) => {
              const { nativeEvent } = syntheticEvent;
              if (nativeEvent.code === 3) {
                this.showProgressBar(false);
                if (this.props.onError)
                  this.props.onError({
                    event: 'error',
                    code: nativeEvent.code,
                    message: nativeEvent.description,
                  });
                this.closeDismiss();
              }
            }}
          />
        </SafeAreaView>
      </Modal>
    );
  }
}

const styles = StyleSheet.create({
  overlay: {
    width: 25,
    height: 25,
    right: 5,
    alignSelf: 'flex-end',
  },
});
