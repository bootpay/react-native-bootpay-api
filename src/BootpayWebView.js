

import React, { Component, useRef } from 'react';
import { SafeAreaView, Modal, Platform, TouchableOpacity, Image, StyleSheet } from 'react-native';
import WebView  from 'react-native-webview-bootpay';
import UserInfo from './UserInfo'

export class BootpayWebView extends Component {
    webView = useRef<WebView>(null); 

    state = {
        visibility: false, 
        script: '',
        firstLoad: false
    } 
s
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
 
    render() { 
        return <Modal
            animationType={'slide'}
            transparent={false}
            visible={this.state.visibility}>
            <SafeAreaView style={{ flex: 1 }}>
                {
                    this.state.showCloseButton &&
                    <TouchableOpacity
                        onPress={() => {
                            var cancelData = {
                                action: 'BootpayCancel',
                                message: '사용자에 의해 취소되었습니다'
                            }
                            
                            if(this.props.onCancel != undefined) this.props.onCancel(cancelData);
                            if(this.props.onClose != undefined) this.props.onClose(); 

                            this.setState({visibility: false})
                        } }>
                        <Image 
                            style={[styles.overlay]}
                            source={require('../images/close.png')} />
                    </TouchableOpacity>
                }
                <WebView
                    ref={(wv) => this.webView = wv}
                    useWebKit={true}
                    originWhitelist={['*']}
                    source={{
                        // uri: 'https://inapp.bootpay.co.kr/3.3.3/production.html'
                        uri: 'https://webview.bootpay.co.kr/4.0.0/'
                    }}
                    injectedJavaScript={this.state.script}
                    javaScriptEnabled={true}
                    javaScriptCanOpenWindowsAutomatically={true}
                    scalesPageToFit={true} 
                    onMessage={this.onMessage}
                    onShouldStartLoadWithRequest={this.onShouldStartLoadWithRequest}
                />
            </SafeAreaView>

        </Modal>
    }

    requestPayment = async (payload, items, user, extra) => {     
        this.goBootpayRequest(payload, items, user, extra, 1);
    }

    requestSubscription = async (payload, items, user, extra) => {   
        this.goBootpayRequest(payload, items, user, extra, 2);
    }

    requestAuthentication = async (payload, items, user, extra) => {   
        this.goBootpayRequest(payload, items, user, extra, 3);
    }

    goBootpayRequest = async (payload, items, user, extra, requestType) => {   
        payload.application_id =  Platform.OS == 'ios' ? this.props.ios_application_id : this.props.android_application_id;
        payload.items = items;
        payload.user_info = user;
        payload.extra = extra; 
  
        //visibility가 true가 되면 webview onLoaded가 실행됨
        this.setState(
            {
                visibility: true,
                script: `
                ${await this.getMountJavascript()} 
                ${this.generateScript(payload, requestType)}
                `,
                firstLoad: false,
                showCloseButton: extra.show_close_button || false
            }
        ) 

        UserInfo.updateInfo(); 
    }

    dismiss = () => {
        this.destroy();
        this.setState(
            ({ visibility }) => ({
                visibility: false
            })
        )
    }
 

    getMountJavascript = async () => { 
        return `
        ${this.getBootpayPlatform()}
        ${this.setDevelopment()}
        ${this.addCloseEvent()}        
        ${await this.getAnalyticsData()}
        `; 
        // ${await this.getAnalyticsData()}
    }

    onConfirm = () => {
        return "if (res.event === 'confirm') { window.BootpayRNWebView.postMessage( JSON.stringify(res) ); }";
    }

    onDone = () => {
        return "else if (res.event === 'done') { window.BootpayRNWebView.postMessage( JSON.stringify(res) ); }";
    }

    onIssued = () => {
        return "else if (res.event === 'issued') { window.BootpayRNWebView.postMessage( JSON.stringify(res) ); }";
    }

    onError = () => {
        return "if (res.event === 'error') { window.BootpayRNWebView.postMessage( JSON.stringify(res) ); }";
    }

    onCancel = () => {
        return "else if (res.event === 'cancel') { window.BootpayRNWebView.postMessage( JSON.stringify(res) ); }";
    }

    onClose = () => {
        return "document.addEventListener('bootpayclose', function (e) { window.BootpayRNWebView.postMessage( 'close' ); });";
    }

    //requestType - 1: 결제, 2: 정기결제, 3: 본인인증 
    generateScript = (payload, requestType) => {   

        requestMethod = "requestPayment";
        if(requestType == 2) {
            requestMethod = "requestSubscription";
            if(!payload.subscription_id || payload.subscription_id === 0) {
                payload.subscription_id = payload.order_id ?? '';
            }

        } else if(requestType == 3) {
            requestMethod = "requestAuthentication";
            if(!payload.authentication_id || payload.authentication_id === 0) {
                payload.authentication_id = payload.order_id ?? '';
            }
        }

        script = `Bootpay.${requestMethod}(` 
            + `${JSON.stringify(payload)}`
            + `)`
            + `.then( function (res) {`
            + `${this.onConfirm()}`
            + `${this.onIssued()}`
            + `${this.onDone()}`
            + `}, function (res) {`
            + `${this.onError()}`
            + `${this.onCancel()}`
            + `});`;


        return "setTimeout(function() {" + script + "}, 50);";
    }

    onMessage = ({ nativeEvent }) => {   

        if (nativeEvent == undefined || nativeEvent.data == undefined) return;
    
        if(nativeEvent.data == 'close') {
            if(this.props.onClose == undefined) return; 
            this.props.onClose();
            this.dismiss();
            return;
        }

        const data = JSON.parse(nativeEvent.data);
        switch (data.event) {
            case 'cancel':
                if(this.props.onCancel != undefined) this.props.onCancel(data); 
                break;
            case 'error':
                if(this.props.onError != undefined) this.props.onError(data); 
                break;
            case 'issued':
                if(this.props.onIssued != undefined) this.props.onIssued(data);
                break;
            case 'confirm':
                if(this.props.onConfirm != undefined) this.props.onConfirm(data);
                break;
            case 'done':
                if(this.props.onDone != undefined) this.props.onDone(data); 
                break;
        }
    }

    onShouldStartLoadWithRequest = (url) => { 
        return true;
    }

    getBootpayPlatform = () => { 
        if(Platform.OS == 'ios') {
            return "Bootpay.setDevice('IOS');";
        } else if(Platform.OS == 'android'){
            return "Bootpay.setDevice('ANDROID');"; 
        }
    }

    setDevelopment = () => {
        return "Bootpay.setEnvironmentMode('development');"; 
    }

    addCloseEvent = () => {
        return this.onClose();
    } 

    transactionConfirm = () => { 
        script = `Bootpay.confirm()` 
            + `.then( function (res) {`
            + `${this.onConfirm()}`
            + `${this.onIssued()}`
            + `${this.onDone()}`
            + `}, function (res) {`
            + `${this.onError()}`
            + `${this.onCancel()}`
            + `});`;


        this.callJavaScript("setTimeout(function() {" + script + "}, 50);");
    }

    destroy = () => {
        this.callJavaScript(`
            setTimeout(function() { Bootpay.destroy(); }, 50);
        `);
    } 

    callJavaScript = (script) => {
        if(this.webView == null || this.webView == undefined) return; 

        this.webView.injectJavaScript(`
            javascript:(function(){${script} })()
        `);
    }  

    getAnalyticsData = async () => { 
        const uuid = await UserInfo.getBootpayUUID(); 
        const bootpaySK = await UserInfo.getBootpaySK();
        const bootLastTime = await UserInfo.getBootpayLastTime();      

        const elaspedTime = Date.now() - bootLastTime;  
        script = `window.Bootpay.setAnalyticsData({uuid:'${uuid}',sk:'${bootpaySK}',sk_time:${bootLastTime},time:${elaspedTime}});`;
        return "setTimeout(function() {" + script + "}, 50);";
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