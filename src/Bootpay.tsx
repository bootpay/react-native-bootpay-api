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
import { BootpayTypesProps, Payload, Item, User, Extra } from './BootpayTypes';
import { debounce } from 'lodash';
import UserInfo from './UserInfo';

const SDK_VERSION = '13.13.4';
const DEBUG_MODE = false;

export class Bootpay extends Component<BootpayTypesProps> {
  getMountJavascript = async () => {
    return `
        ${this.getSDKVersion()}
        ${this.getEnvironmentMode()}
        ${this.getBootpayPlatform()}
        ${this.close()}
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

  close = () => {
    return "document.addEventListener('bootpayclose', function (e) {  window.BootpayRNWebView.postMessage('close'); });";
  };

  onMessage = async (event: WebViewMessageEvent) => {
    if (!event) return;

    try {
      const res = JSON.parse(event.nativeEvent.data);
    //   console.log(res);

      if (res === 'close') {
        this.showProgressBar(false);
        this.closeDismiss();
        return;
      }

      const data = typeof res === 'string' ? JSON.parse(res) : res;

    //   let redirect = false;
      let show_success = false;
      let show_error = false;

      if (this.payload?.extra) {
        // redirect = this.payload.extra?.open_type === 'redirect';
        show_error = !!this.payload.extra?.display_error_result;
        show_success = !!this.payload.extra?.display_success_result;
      }

      const handleEvent = (_eventName, callback, showResult) => {
        this.showProgressBar(false);
        if (callback) callback(data);
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
          if (this.props.onConfirm && this.props.onConfirm(data)) {
            this.transactionConfirm();
          }
          break;
        case 'done':
          handleEvent('done', this.props.onDone, show_success);
          break;
        case 'close':
          this.showProgressBar(false);
          this.closeDismiss();
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
    return DEBUG_MODE ? "Bootpay.setEnvironmentMode('development');" : '';
  };

  getBootpayPlatform = () => {
    return Platform.OS === 'ios'
      ? "Bootpay.setDevice('IOS');"
      : "Bootpay.setDevice('ANDROID');";
  };

  async componentWillUnmount() {
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

    console.log(uuid, bootpaySK, bootLastTime);

    return `window.Bootpay.$analytics.setAnalyticsData({uuid:'${uuid}',sk:'${bootpaySK}',time:${elaspedTime}});`;
  };

  requestPayment = async (
    payload: Payload,
    items: [Item],
    user: User,
    extra: Extra
  ) => {
    this.bootpayRequest(payload, items, user, extra, 'requestPayment');
  };

  requestSubscription = async (
    payload: Payload,
    items: [Item],
    user: User,
    extra: Extra
  ) => {
    this.bootpayRequest(payload, items, user, extra, 'requestSubscription');
  };

  requestAuthentication = async (
    payload: Payload,
    items: [Item],
    user: User,
    extra: Extra
  ) => {
    this.bootpayRequest(payload, items, user, extra, 'requestAuthentication');
  };

  bootpayRequest = async (
    payload: Payload,
    items: [Item],
    user: User,
    extra: Extra,
    requestMethod: string
  ) => {
    payload.application_id =
      Platform.OS === 'ios'
        ? this.props.ios_application_id
        : this.props.android_application_id;
    payload.items = items;
    payload.user = user;

    payload.user = Object.assign(new User(), user); //set default value from class optional parameter value
    payload.extra = Object.assign(new Extra(), extra); //set default value from class optional parameter value

    this.payload = payload;

    this.setState({
      visibility: true,
      script: `
            ${await this.getMountJavascript()} 
            ${this.generateScript(payload, requestMethod)}
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
            source={{ uri: 'https://webview.bootpay.co.kr/5.1.0' }}
            injectedJavaScript={this.state.script}
            javaScriptEnabled
            javaScriptCanOpenWindowsAutomatically
            onMessage={this.onMessage}
            onError={(syntheticEvent) => {
              const { nativeEvent } = syntheticEvent;
              if (nativeEvent.code === 3) {
                this.showProgressBar(false);
                if (this.props.onError)
                  this.props.onError({
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
