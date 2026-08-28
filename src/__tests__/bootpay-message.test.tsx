jest.mock('react-native-keychain', () => ({
  setGenericPassword: jest.fn(),
  getGenericPassword: jest.fn(async () => false),
  ACCESSIBLE: { WHEN_UNLOCKED: 'WHEN_UNLOCKED' },
}));
jest.mock('react-native-device-info', () => ({
  getUniqueId: jest.fn(async () => 'test-uuid'),
}));
jest.mock('react-native-webview-bootpay', () => 'WebView');

import { Bootpay } from '../Bootpay';
import { buildCloseBridgeScript } from '../closeBridge';

type Handlers = {
  onClose?: jest.Mock;
  onCancel?: jest.Mock;
  onDone?: jest.Mock;
};

const buildInstance = (handlers: Handlers = {}) => {
  const instance = new Bootpay(handlers as any);
  // 마운트하지 않고 메시지 처리만 검증한다.
  instance.setState = jest.fn() as any;
  return instance;
};

const send = async (instance: Bootpay, data: string) => {
  await instance.onMessage({ nativeEvent: { data } } as any);
};

describe('Bootpay.onMessage', () => {
  it("JSON 이 아닌 raw 'close' 문자열도 닫기로 처리한다", async () => {
    const onClose = jest.fn();
    const instance = buildInstance({ onClose });

    await send(instance, 'close');

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("closeBridge 가 보내는 {\"event\":\"close\"} 를 닫기로 처리한다", async () => {
    const onClose = jest.fn();
    const instance = buildInstance({ onClose });

    await send(instance, JSON.stringify({ event: 'close' }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('cancel 이벤트는 onCancel + onClose 를 호출한다', async () => {
    const onCancel = jest.fn();
    const onClose = jest.fn();
    const instance = buildInstance({ onCancel, onClose });

    await send(
      instance,
      JSON.stringify({ event: 'cancel', error_code: 'RC_CLOSE_WINDOW' })
    );

    expect(onCancel).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'cancel' })
    );
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('이중 인코딩된 JSON 문자열도 처리한다', async () => {
    const onDone = jest.fn();
    const instance = buildInstance({ onDone });

    await send(instance, JSON.stringify(JSON.stringify({ event: 'done' })));

    expect(onDone).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'done' })
    );
  });

  it('알 수 없는 payload 는 예외 없이 무시한다', async () => {
    const onClose = jest.fn();
    const instance = buildInstance({ onClose });

    await send(instance, 'not-a-json-and-not-close');

    expect(onClose).not.toHaveBeenCalled();
  });
});

describe('closeBridge 주입 스크립트', () => {
  const evalBridge = (opener: unknown) => {
    const posted: string[] = [];
    const listeners: Record<string, Function[]> = {};
    const win: any = {
      opener,
      BootpayRNWebView: { postMessage: (m: string) => posted.push(m) },
      close: () => {
        throw new Error('native close should not run');
      },
    };
    const doc: any = {
      addEventListener: (name: string, cb: Function) => {
        listeners[name] = listeners[name] || [];
        listeners[name].push(cb);
      },
    };
    // eslint-disable-next-line no-new-func
    new Function('window', 'document', buildCloseBridgeScript())(win, doc);
    return { posted, listeners, win };
  };

  it('bootpayclose 이벤트를 JSON 으로 전달한다', () => {
    const { posted, listeners } = evalBridge(null);

    listeners.bootpayclose[0]();

    expect(posted).toEqual([JSON.stringify({ event: 'close' })]);
  });

  it('최상위 문서의 window.close() 를 가로채 close 를 전달한다', () => {
    const { posted, win } = evalBridge(null);

    win.close();

    expect(posted).toEqual([JSON.stringify({ event: 'close' })]);
  });

  it('opener 가 있는 팝업에서는 window.close 를 건드리지 않는다', () => {
    const { posted, win } = evalBridge({});

    expect(() => win.close()).toThrow('native close should not run');
    expect(posted).toEqual([]);
  });
});

describe('union(통합결제) 이벤트', () => {
  const withInjector = () => {
    const injected: string[] = [];
    const instance = buildInstance();
    instance.callJavaScript = (script: string) => {
      injected.push(script);
    };
    return { instance, injected };
  };

  it('redirect 는 location.href 로 webview 를 이동시킨다', async () => {
    const { instance, injected } = withInjector();

    await send(
      instance,
      JSON.stringify({
        bootpay_event: true,
        event: 'redirect',
        data: { url: 'https://gw.example.com/pay' },
      })
    );

    expect(injected).toEqual([
      'location.href = "https://gw.example.com/pay";',
    ]);
  });

  it('moveRedirectUrl 은 parameters 를 붙여 location.replace 한다', async () => {
    const { instance, injected } = withInjector();

    await send(
      instance,
      JSON.stringify({
        bootpay_event: true,
        event: 'moveRedirectUrl',
        data: {
          url: 'https://gw.example.com/done?a=1',
          parameters: { receipt_id: 'r1', status: '1' },
        },
      })
    );

    expect(injected).toEqual([
      'location.replace("https://gw.example.com/done?a=1&receipt_id=r1&status=1");',
    ]);
  });

  it('data 래핑 없이 최상위에 url 이 와도 처리한다', async () => {
    const { instance, injected } = withInjector();

    await send(
      instance,
      JSON.stringify({ event: 'redirect', url: 'https://gw.example.com/x' })
    );

    expect(injected).toEqual(['location.href = "https://gw.example.com/x";']);
  });

  it('UI 제어 이벤트는 경고 없이 무시한다', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const { instance, injected } = withInjector();

    for (const event of [
      'showPayment',
      'hidePayment',
      'showProgress',
      'hideProgress',
      'resize',
      'iFrameStyle',
      'windowStyle',
      'polling',
      'setConfirmParameters',
    ]) {
      await send(instance, JSON.stringify({ event }));
    }

    expect(warn).not.toHaveBeenCalled();
    expect(injected).toEqual([]);
    warn.mockRestore();
  });
});
