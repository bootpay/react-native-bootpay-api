

import React, { Component } from 'react';
import { SafeAreaView, Modal, TouchableOpacity, Image, StyleSheet, Platform } from 'react-native';
// import {  StyleSheet, Platform } from 'react-native';
// import {  Platform, StyleSheet, Dimensions } from 'react-native';
import WebView, {WebViewMessageEvent}  from 'react-native-webview-bootpay';
import { BootpayTypesProps, Payload, Extra, Item, User } from './BootpayTypes';
import {debounce} from 'lodash';
import UserInfo from './UserInfo'     
// import  Loader from './Loader'
// import ClipLoader  from "react-spinners/ClipLoader";
// import Spinner from 'react-native-loading-spinner-overlay';


export class Bootpay extends Component<BootpayTypesProps> {
    // webView = useRef<WebView>(null); 

    webView: React.RefObject<WebView>;
    
    constructor(props: BootpayTypesProps) {
        super(props);

        this.webView = React.createRef();
    }

    payload?: Payload

    state = {
        visibility: false, 
        script: '',
        firstLoad: false,
        showCloseButton: false,
        isShowProgress: false 
    }   
    // _payload = {}
    _VERSION = "4.3.1"
    _DEBUG = false;


    dismiss = () => { 
        this.setState(
            { 
                visibility: false
            }
        ) 
    }
 

    showProgressBar = (isShow: boolean) => {
        this.setState(
            {
                isShowProgress: isShow
            }
        )
    }


    closeDismiss = () => { 
        if(this.props.onClose != undefined) this.props.onClose();
        this.dismiss();
    }


    onMessage = async (event: WebViewMessageEvent) => {  

        if (event == undefined) return;

        const res = JSON.parse(JSON.stringify(event.nativeEvent.data));
  
    
        if(res == 'close') {
            this.showProgressBar(false);
            this.closeDismiss(); 
            return;
        }

 
        const data = JSON.parse(res);
        // console.log(`redirect: ${JSON.stringify(data)}`);

        var redirect = false
        let show_success = false
        let show_error = false
 

        if(this.payload?.extra != undefined) { 
            if(this.payload.extra?.open_type == 'redirect') {
                redirect = true; 
            }
            if(this.payload.extra?.display_error_result == true) {
                show_error = true; 
            }
            if(this.payload.extra?.display_success_result == true) {
                show_success = true; 
            }
            
        }

        if(redirect === true) {
            switch (data.event) {
                case 'cancel':
                    this.showProgressBar(false);
                    if(this.props.onCancel != undefined) this.props.onCancel(data); 
                    this.closeDismiss(); 
                    break;
                case 'error':
                    this.showProgressBar(false);
                    if(this.props.onError != undefined) this.props.onError(data); 
                    if(show_error == false) {
                        this.closeDismiss(); 
                    }
                    break;
                case 'issued':
                    this.showProgressBar(false);
                    if(this.props.onIssued != undefined) this.props.onIssued(data);
                    if(show_success == false) {
                        this.closeDismiss(); 
                    }
                    break;
                case 'confirm':
                    this.showProgressBar(true);
                    if(this.props.onConfirm != undefined) this.props.onConfirm(data);
                    break;
                case 'done':
                    this.showProgressBar(false);
                    if(this.props.onDone != undefined) this.props.onDone(data); 
                    if(show_success == false) {
                        this.closeDismiss(); 
                    }
                    break;
                case 'close':
                    this.showProgressBar(false);
                    this.closeDismiss(); 
                    break; 
            }
        } else {
            switch (data.event) {
                case 'cancel':
                    this.showProgressBar(false);
                    if(this.props.onCancel != undefined) this.props.onCancel(data); 
                    break;
                case 'error':
                    this.showProgressBar(false);
                    if(this.props.onError != undefined) this.props.onError(data); 
                    break;
                case 'issued':
                    this.showProgressBar(false);
                    if(this.props.onIssued != undefined) this.props.onIssued(data);
                    break;
                case 'confirm':
                    this.showProgressBar(true);
                    if(this.props.onConfirm != undefined) this.props.onConfirm(data);
                    break;
                case 'done':
                    this.showProgressBar(false);
                    if(this.props.onDone != undefined) this.props.onDone(data); 
                    break;
                case 'close':
                    this.showProgressBar(false);
                    this.closeDismiss(); 
                    break; 
            }
        }  
    }

    onShouldStartLoadWithRequest = (_ : string) => { 
        return true;
    }

    getSDKVersion = () => {
        if(Platform.OS == 'ios') {
            return "Bootpay.setVersion('" + this._VERSION + "', 'ios_react_native')"
            // return "Bootpay.setDevice('IOS');";
        } else if(Platform.OS == 'android'){
            return "Bootpay.setVersion('" + this._VERSION + "', 'android_react_native')"
            // return "Bootpay.setDevice('ANDROID');"; 
        } else {
            return ""
        }
    }

    getEnvironmentMode = () => {
        if(this._DEBUG) {
            return "Bootpay.setEnvironmentMode('development');";

        }
        return "";
    }

    getBootpayPlatform = () => { 
        if(Platform.OS == 'ios') {
            return "Bootpay.setDevice('IOS');";
        } else if(Platform.OS == 'android'){
            return "Bootpay.setDevice('ANDROID');"; 
        } else {
            return ""
        }
    }

    // setPayScript = () => {
        // const fullScript = this.generateScript(this.state.script);
        // this.injectJavaScript(fullScript);
        // if(this.state.showCloseButton == true) {
        //     if(this.webView == null || this.webView == undefined) return; 
        //     this.webView.showCloseButton( );
        // }
    //  } 

    transactionConfirm = () => { 
        const script = "Bootpay.confirm()"
         + 
        ".then( function (res) {" + 
        this.confirm() + 
        this.issued() + 
        this.done() + 
        "}, function (res) {" +
        this.error() + 
        this.cancel() + 
        "})";

        this.callJavaScript(script);
    }

    removePaymentWindow = () => {
        this.dismiss();
        // this.callJavaScript(`
        // Bootpay.removePaymentWindow();
        //   `);
    } 

    callJavaScript = (script: string) => {  
        if(this.webView == null || this.webView == undefined) return
 
        this.webView.current?.injectJavaScript(`
        setTimeout(function() { ${script} }, 30);
        `) 
    }  

    getAnalyticsData = async () => { 
        const uuid = await UserInfo.getBootpayUUID(); 
        // const bootpaySK = await UserInfo.getBootpaySK();
        const bootLastTime = await UserInfo.getBootpayLastTime();      


        const elaspedTime = Date.now() - bootLastTime;  
        return `window.Bootpay.$analytics.setAnalyticsData({uuid:'${uuid}', time:${elaspedTime}});`;
        // this.callJavaScript(`window.BootPay.setAnalyticsData({uuid:'${uuid}',sk:'${bootpaySK}',sk_time:${bootLastTime},time:${elaspedTime}});`); 
    }

    confirm = () => {
        return "if (res.event === 'confirm') { window.BootpayRNWebView.postMessage( JSON.stringify(res) ); }";
    }

    done = () => {
        return "else if (res.event === 'done') { window.BootpayRNWebView.postMessage( JSON.stringify(res) ); }";
    }

    issued = () => {
        return "else if (res.event === 'issued') { window.BootpayRNWebView.postMessage( JSON.stringify(res) ); }";
    }

    error = () => {
        return "if (res.event === 'error') { window.BootpayRNWebView.postMessage( JSON.stringify(res) ); }";
    }

    cancel = () => {
        return "else if (res.event === 'cancel') { window.BootpayRNWebView.postMessage( JSON.stringify(res) ); }";
    }

    close = () => {
        return "document.addEventListener('bootpayclose', function (e) {  window.BootpayRNWebView.postMessage('close'); });";
    }

  

    async componentWillUnmount() {
        this.setState(
            {
                visibility: false, 
                firstLoad: false,
                showCloseButton: false
            }
         )
        UserInfo.setBootpayLastTime(Date.now());
    } 


    componentDidMount() {
        this.closeDismiss = debounce(this.closeDismiss, 30); 
    } 
 
    render() {
        return (  
            <Modal
                animationType={'slide'}
                transparent={false} 
                onRequestClose={()=> { 
                    this.closeDismiss();
                    // console.log(1234);
                    // this.dismiss();
                }}
                
                visible={this.state.visibility}> 
                <SafeAreaView style={{ flex: 1 }}>
                    {
                        this.state.showCloseButton &&
                        <TouchableOpacity
                            onPress={() =>  {
                                var cancelData = {
                                    action: 'BootpayCancel',
                                    message: '사용자에 의해 취소되었습니다'
                                } 
                                
                                if(this.props.onCancel != undefined) this.props.onCancel(cancelData);
                                if(this.props.onClose != undefined) this.props.onClose(); 

                                this.setState({visibility: false})

                                // this.showProgressBar(true);
 
                            } }> 
                            <Image 
                                style={[styles.overlay]}
                                source={require('../images/close.png')} />
                        </TouchableOpacity>
                    }
                    
              
 
              
                    


                    <WebView
                        ref={this.webView}  
                        originWhitelist={['*']}
                        source={{
                            uri: 'https://webview.bootpay.co.kr/4.2.7'
                        }} 
                        injectedJavaScript={this.state.script}
                        javaScriptEnabled={true}
                        javaScriptCanOpenWindowsAutomatically={true}
                        // scalesPageToFit={true} 
                        onMessage={this.onMessage}
                    />
                </SafeAreaView> 
                

            </Modal>  
        )
    }

 

    requestPayment = async (payload: Payload, items: [Item], user: User, extra: Extra) => {     
        
        this.bootpayRequest(payload, items, user, extra, "requestPayment");
    }

    requestSubscription = async (payload: Payload, items: [Item], user: User, extra: Extra) => {        
        this.bootpayRequest(payload, items, user, extra, "requestSubscription");
    }

    requestAuthentication = async (payload: Payload, items: [Item], user: User, extra: Extra) => {        
        this.bootpayRequest(payload, items, user, extra, "requestAuthentication");
    }

    bootpayRequest = async (payload: Payload, items: [Item], user: User, extra: Extra, requestMethod: string) => {    

        payload.application_id =  Platform.OS == 'ios' ? this.props.ios_application_id : this.props.android_application_id;
        payload.items = items;
        payload.user = user;
         

        payload.user = Object.assign(new User(), user); //set default value from class optional parameter value
        payload.extra = Object.assign(new Extra(), extra); //set default value from class optional parameter value

 
        this.payload = payload 
 
        this.setState(
            {
                visibility: true,
                script: `
                ${await this.getMountJavascript()} 
                ${this.generateScript(payload, requestMethod)}
                `,
                firstLoad: false,
                showCloseButton: extra.show_close_button || false,
                spinner: false 
             }
        ) 
 

        UserInfo.updateInfo();  
    }


    getMountJavascript = async () => { 
        return `
        ${this.getSDKVersion()}
        ${this.getEnvironmentMode()}
        ${this.getBootpayPlatform()}
        ${this.close()}
        ${await this.getAnalyticsData()}
        `; 
    }


    generateScript= (payload: Payload, requestMethod: string) => {    
        const script = "Bootpay." + requestMethod + 
        `(${JSON.stringify(payload)})` +
        ".then( function (res) {" + 
        this.confirm() + 
        this.issued() + 
        this.done() + 
        "}, function (res) {" +
        this.error() + 
        this.cancel() + 
        "}); void(0);";
        
        return script; 
    }

}


var styles = StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: '#F5FCFF',
    },
    welcome: {
      fontSize: 20,
      textAlign: 'center',
      margin: 10,
    },
    // Flex to fill, position absolute, 
    // Fixed left/top, and the width set to the window width
    overlay: { 
      width: 25,
      height: 25, 
      right: 5,
      alignSelf: 'flex-end'
    }  
});
 