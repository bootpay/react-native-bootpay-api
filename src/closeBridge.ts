/**
 * 결제창이 닫혔음을 RN 으로 알리는 WebView 주입 스크립트.
 *
 * injectedJavaScript 는 결제 진행 중 이동하는 모든 페이지(PG 결제창 포함)에서 재실행되므로,
 * Bootpay 전역 객체가 없는 페이지에서도 단독으로 동작해야 한다.
 * 따라서 SDK 부트스트랩과 분리해 try/catch 밖에서 먼저 주입한다.
 *
 * 잡아내는 경로는 두 가지다.
 *  1. `bootpayclose` — Bootpay JS SDK 가 결제창을 destroy 할 때 document 로 보내는 커스텀 이벤트
 *  2. `window.close()` — 결제 페이지 내부의 닫기(X) 버튼이 창을 닫으려 할 때
 *
 * 2번이 중요한 이유: 최상위 문서에서의 `window.close()` 는 브라우저에서도 무시되지만,
 * WKWebView 는 이를 `webViewDidClose:` 로 네이티브에만 알리고 JS 로는 아무 이벤트도 주지 않는다.
 * 그래서 RN Modal 이 그대로 남고, iOS 는 하드웨어 back 도 없어 사용자가 결제창에 갇힌다.
 * opener 가 없는 최상위 문서에서만 가로채 close 로 통지한다.
 * (SDK 가 window.open 으로 띄운 팝업은 그대로 두어 네이티브 팝업 제거 경로를 유지한다.)
 */
export const buildCloseBridgeScript = (): string => `
  (function () {
    if (window.__bootpayRNCloseBridge) return;
    window.__bootpayRNCloseBridge = true;

    var postClose = function () {
      try {
        if (window.BootpayRNWebView && window.BootpayRNWebView.postMessage) {
          window.BootpayRNWebView.postMessage(JSON.stringify({ event: 'close' }));
        }
      } catch (e) {}
    };

    document.addEventListener('bootpayclose', function () { postClose(); });

    if (!window.opener) {
      window.close = function () { postClose(); };
    }
  })();
`;

/**
 * WebView 가 보내오는 payload 는 형태가 제각각이다.
 *  - JSON 객체 문자열: '{"event":"cancel"}'
 *  - 이중 인코딩된 JSON 문자열: '"{\\"event\\":\\"cancel\\"}"'
 *  - JSON 이 아닌 raw 문자열: 'close' (구버전 webview 페이지 호환)
 *
 * JSON.parse 를 먼저 태우면 raw 문자열에서 SyntaxError 가 나 이후 처리가 전부 죽으므로,
 * 파싱에 실패하면 원문 문자열을 그대로 돌려준다.
 */
export const parseWebViewMessage = (raw: string): unknown => {
  try {
    const parsed = JSON.parse(raw);
    return typeof parsed === 'string' ? parseWebViewMessage(parsed) : parsed;
  } catch (e) {
    return raw;
  }
};
