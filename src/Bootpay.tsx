import React, { Component } from 'react';
import {
  SafeAreaView,
  Modal,
  TouchableOpacity,
  Image,
  StyleSheet,
  Platform,
} from 'react-native';
import WebView, { WebViewMessageEvent } from 'react-native-webview-bootpay';
import {
  BootpayTypesProps,
  BootpayEventData,
  Payload,
  Item,
  User,
  Extra,
} from './BootpayTypes';
import { debounce } from 'lodash';
import UserInfo from './UserInfo';
import { buildEnvironmentScript } from './environment';
import { buildCloseBridgeScript, parseWebViewMessage } from './closeBridge';

const SDK_VERSION = '13.15.1';
const DEBUG_MODE = false;

export class Bootpay extends Component<BootpayTypesProps> {
  getMountJavascript = async () => {
    return `
        ${this.getSDKVersion()}
        ${this.getEnvironmentMode()}
        ${this.getBootpayPlatform()}
        ${await this.getAnalyticsData()}
        `;
  };

  webView: React.RefObject<WebView>;
  payload?: Payload;

  constructor(props: BootpayTypesProps) {
    super(props);
    this.webView = React.createRef();
  }

  state = {
    visibility: false,
    script: '',
    firstLoad: false,
    showCloseButton: false,
    isShowProgress: false,
  };

  dismiss = () => {
    this.setState({ visibility: false });
  };

  showProgressBar = (isShow: boolean) => {
    this.setState({ isShowProgress: isShow });
  };

  closeDismiss = () => {
    if (this.props.onClose) this.props.onClose();
    this.dismiss();
  };

  callJavaScript = (script: string) => {
    this.webView.current?.injectJavaScript(
      `setTimeout(function() { ${script} }, 30);`
    );
  };

  transactionConfirm = () => {
    const script = `
      Bootpay.confirm()
        .then(res => {
          ${this.confirm()}
          ${this.issued()}
          ${this.done()}
        }, res => {
          ${this.error()}
          ${this.cancel()}
        });
    `;
    this.callJavaScript(script);
  };

  confirm = () => {
    return "if (res.event === 'confirm') { window.BootpayRNWebView.postMessage( JSON.stringify(res) ); }";
  };

  done = () => {
    return "else if (res.event === 'done') { window.BootpayRNWebView.postMessage( JSON.stringify(res) ); }";
  };

  issued = () => {
    return "else if (res.event === 'issued') { window.BootpayRNWebView.postMessage( JSON.stringify(res) ); }";
  };

  error = () => {
    return "if (res.event === 'error') { window.BootpayRNWebView.postMessage( JSON.stringify(res) ); }";
  };

  cancel = () => {
    return "else if (res.event === 'cancel') { window.BootpayRNWebView.postMessage( JSON.stringify(res) ); }";
  };

  closeBridge = () => buildCloseBridgeScript();

  // union(통합결제) 페이지는 use_bootpay_inapp_sdk=true 상태에서 이벤트를 JS window.parent
  // 대신 네이티브 브릿지로 바로 보낸다. 그래서 SDK 호스트 페이지가 하던 화면 이동을
  // RN 이 대신해야 한다. 이동 지시에 붙어오는 parameters 는 JS SDK 와 같은 규칙으로 합친다.
  buildRedirectUrl = (payload: Record<string, unknown>): string | undefined => {
    const url = payload.url;
    if (typeof url !== 'string' || url.length === 0) return undefined;

    const parameters = payload.parameters;
    if (parameters === undefined || parameters === null) return url;

    const query =
      typeof parameters === 'string'
        ? parameters
        : new URLSearchParams(
            parameters as Record<string, string>
          ).toString();
    if (query.length === 0) return url;

    return /\?/.test(url) ? `${url}&${query}` : `${url}?${query}`;
  };

  moveWebView = (url: string, replace: boolean) => {
    this.callJavaScript(
      replace
        ? `location.replace(${JSON.stringify(url)});`
        : `location.href = ${JSON.stringify(url)};`
    );
  };

  onMessage = async (event: WebViewMessageEvent) => {
    if (!event) return;

    try {
      const res = parseWebViewMessage(event.nativeEvent.data);

      if (res === 'close') {
        this.showProgressBar(false);
        this.closeDismiss();
        return;
      }

      if (typeof res !== 'object' || res === null) {
        console.warn(`Unknown message payload: ${event.nativeEvent.data}`);
        return;
      }

      const data = res as { event?: string } & Record<string, unknown>;

      let show_success = false;
      let show_error = false;

      if (this.payload?.extra) {
        // redirect = this.payload.extra?.open_type === 'redirect';
        show_error = !!this.payload.extra?.display_error_result;
        show_success = !!this.payload.extra?.display_success_result;
      }

      const handleEvent = (
        _eventName: string,
        callback: ((data: BootpayEventData) => void) | undefined,
        showResult: boolean
      ) => {
        this.showProgressBar(false);
        if (callback) callback(data as BootpayEventData);
        if (!showResult) this.closeDismiss();
      };

      switch (data.event) {
        case 'cancel':
          handleEvent('cancel', this.props.onCancel, false);
          break;
        case 'error':
          handleEvent('error', this.props.onError, show_error);
          break;
        case 'issued':
          handleEvent('issued', this.props.onIssued, show_success);
          break;
        case 'confirm':
          this.showProgressBar(true);
          if (
            this.props.onConfirm &&
            this.props.onConfirm(data as BootpayEventData)
          ) {
            this.transactionConfirm();
          }
          break;
        case 'done':
          handleEvent('done', this.props.onDone, show_success);
          break;
        case 'close':
        case 'bootpayWidgetRevertScreen':
          this.showProgressBar(false);
          this.closeDismiss();
          break;
        // "webview 전체를 이 URL 로 이동시켜라" 지시.
        // JS SDK 호스트 페이지의 location.href / location.replace 를 RN 이 대신한다.
        case 'redirect':
        case 'moveRedirectUrl': {
          const source = (
            data.data && typeof data.data === 'object' ? data.data : data
          ) as Record<string, unknown>;
          const url = this.buildRedirectUrl(source);
          if (url) this.moveWebView(url, data.event === 'moveRedirectUrl');
          break;
        }
        // UI 제어 이벤트는 SDK 호스트 페이지의 progress / iframe 크기 조정 용도라
        // RN webview 에는 대응되는 DOM 이 없다. 조용히 무시한다.
        case 'showPayment':
        case 'hidePayment':
        case 'showProgress':
        case 'hideProgress':
        case 'resize':
        case 'iFrameStyle':
        case 'windowStyle':
        case 'polling':
        case 'setConfirmParameters':
          break;
        default:
          console.warn(`Unknown event type: ${data.event}`);
          break;
      }
    } catch (error) {
      console.error('Error processing message:', error);
    }
  };

  generateScript = (payload: Payload, requestMethod: string) => {
    return `
      Bootpay.${requestMethod}(${JSON.stringify(payload)})
        .then(res => {
          ${this.confirm()}
          ${this.issued()}
          ${this.done()}
        }, res => {
          ${this.error()}
          ${this.cancel()}
        });
    `;
  };

  getSDKVersion = () => {
    const os = Platform.OS;
    return `Bootpay.setVersion('${SDK_VERSION}', '${os}_react_native')`;
  };

  getEnvironmentMode = () => {
    return buildEnvironmentScript('Bootpay', DEBUG_MODE);
  };

  getBootpayPlatform = () => {
    return Platform.OS === 'ios'
      ? "Bootpay.setDevice('IOS');"
      : "Bootpay.setDevice('ANDROID');";
  };

  componentWillUnmount() {
    this.setState({
      visibility: false,
      firstLoad: false,
      showCloseButton: false,
    });
    UserInfo.setBootpayLastTime(Date.now());
  }

  componentDidMount() {
    this.closeDismiss = debounce(this.closeDismiss, 30);
  }

  removePaymentWindow = () => {
    this.dismiss();
    // this.callJavaScript(`
    // Bootpay.removePaymentWindow();
    //   `);
  };

  getAnalyticsData = async () => {
    const uuid = await UserInfo.getBootpayUUID();
    const bootpaySK = await UserInfo.getBootpaySK();
    const bootLastTime = await UserInfo.getBootpayLastTime();

    const elaspedTime = Date.now() - bootLastTime;

    if (DEBUG_MODE) console.log('analytics:', uuid, bootpaySK, bootLastTime);

    return `window.Bootpay.$analytics.setAnalyticsData({uuid:'${uuid}',sk:'${bootpaySK}',time:${elaspedTime}});`;
  };

  requestPayment = async (
    payload: Payload,
    items: Item[],
    user: User,
    extra: Extra
  ) => {
    this.bootpayRequest(payload, items, user, extra, 'requestPayment');
  };

  requestSubscription = async (
    payload: Payload,
    items: Item[],
    user: User,
    extra: Extra
  ) => {
    this.bootpayRequest(payload, items, user, extra, 'requestSubscription');
  };

  requestAuthentication = async (
    payload: Payload,
    items: Item[],
    user: User,
    extra: Extra
  ) => {
    this.bootpayRequest(payload, items, user, extra, 'requestAuthentication');
  };

  bootpayRequest = async (
    payload: Payload,
    items: Item[],
    user: User,
    extra: Extra,
    requestMethod: string
  ) => {
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

    payload.items = items;
    payload.user = user;

    payload.user = Object.assign(new User(), user); //set default value from class optional parameter value
    payload.extra = Object.assign(new Extra(), extra); //set default value from class optional parameter value

    this.payload = payload;

    this.setState({
      visibility: true,
      script: `
            ${this.closeBridge()}
            try {
              ${await this.getMountJavascript()}
              ${this.generateScript(payload, requestMethod)}
            } catch (e) {
              ${
                DEBUG_MODE
                  ? "console.log('[Bootpay] mount script skipped:', e && e.message);"
                  : ''
              }
            }
            `,
      firstLoad: false,
      showCloseButton: extra.show_close_button || false,
      spinner: false,
    });

    UserInfo.updateInfo();
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
            source={{ uri: 'https://webview.bootpay.co.kr/5.3.0' }}
            injectedJavaScript={this.state.script}
            javaScriptEnabled
            javaScriptCanOpenWindowsAutomatically
            useSharedProcessPool={true}
            sharedCookiesEnabled={true}
            onMessage={this.onMessage}
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
